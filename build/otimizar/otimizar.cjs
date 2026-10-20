// Gera a versão otimizada do site numa pasta à parte (padrão: _site/), que é o
// que o GitHub Pages publica (João, 20/10/2026: "otimize o máximo"). O repo
// continua com o HTML legível, que o robô do CMS (build/gerar.mjs) reescreve;
// este script roda DEPOIS dele, no Actions (.github/workflows/publicar.yml).
//
// O que faz:
//   1. copia o repo pra _site (sem build/, supabase/, .github, anotações etc.);
//   2. CSS: junta, na mesma ordem, os arquivos que cada página da raiz carrega
//      num só (o aos.css do CDN entra junto, de vendor/), tira as regras que a
//      página não usa (PurgeCSS lendo o HTML e o JS dela) e minifica (esbuild).
//      Os CSS originais continuam em _site, porque o painel usa o components.css;
//   3. JS: minifica cada arquivo (esbuild), mesmo nome e mesmo lugar;
//   4. HTML: tira comentários (menos os marcadores <!-- CMS:... -->) e troca o
//      Google Fonts pelas fontes servidas pelo próprio site (vendor/fontes).
//
// Rodar: node build/otimizar/otimizar.cjs [origem] [destino]
// (padrão: a raiz do repo e _site). Depende de npm ci nesta pasta.
//
// Duas armadilhas achadas na comparação de prints (20/10): o lightningcss junta
// animation + animation-timeline num shorthand e as animações ligadas à rolagem
// param (por isso o CSS é minificado pelo esbuild), e o PurgeCSS apaga a regra
// inteira quando um :is(...) só tem pseudo-classes (por isso semIsDePseudo).
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const T = path.join(__dirname, "node_modules") + "/";
const { PurgeCSS } = require(T + "purgecss");
const esbuild = require(T + "esbuild");
const postcss = require(T + "postcss");
const { minify: minHtml } = require(T + "html-minifier-terser");

const REPO = path.resolve(__dirname, "../..");
const ORIG = path.resolve(process.argv[2] || REPO);
const DIST = path.resolve(process.argv[3] || path.join(REPO, "_site"));
const FORA = new Set(["CLAUDE.md", "README.md", "_audit.html", "_shot.html", "fontes.html", "build", "supabase",
  "_config.yml", "node_modules", "package.json", "package-lock.json", path.basename(DIST)]);
const VENDOR = path.join(__dirname, "vendor");
const AOS_CDN = "https://cdn.jsdelivr.net/npm/aos@2.3.1/dist/aos.css";
// fontes servidas pelo próprio site (só latin e latin-ext), no lugar do Google
// Fonts: chegam antes, não trocam a letra com a página já na tela (o aviso de
// cookies "pulava" com a troca) e o visitante não chama o Google (LGPD)
const FONTE_PRINCIPAL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap";
const FONTES_PRELOAD = ["instrument-sans-latin-1.woff2", "plus-jakarta-sans-latin-3.woff2"];

// classes que só aparecem em tempo de execução e que o PurgeCSS não acha no texto
const SAFELIST = {
  standard: [/^is-/, /^aos/, /^mo$/, /^sem-aos$/, /^em-tela$/, /^rodando$/, /^pausa$/, /^scrolled$/, /^ativo$/, /^aberto$/, /^visivel$/],
  greedy: [/data-aos/, /data-formato/, /data-folhas/, /data-passo/, /data-pos/, /data-topo/, /aria-/],
};

// "A:is(:x, :y) B" vira "A:x B, A:y B" (mesma especificidade: todos os
// argumentos são pseudo-classes), pra o PurgeCSS não apagar a regra
const RE_IS = /:is\(\s*(:[^()]*?(?:\([^()]*\))?(?:\s*,\s*:[^()]*?(?:\([^()]*\))?)*)\s*\)/;
function abrirIs(sel) {
  const m = sel.match(RE_IS);
  if (!m) return [sel];
  const partes = []; let prof = 0, atual = "";
  for (const ch of m[1]) { if (ch === "(") prof++; if (ch === ")") prof--; if (ch === "," && !prof) { partes.push(atual.trim()); atual = ""; } else atual += ch; }
  partes.push(atual.trim());
  return partes.flatMap((p) => abrirIs(sel.slice(0, m.index) + p + sel.slice(m.index + m[0].length)));
}
function semIsDePseudo(css) {
  const raiz = postcss.parse(css);
  raiz.walkRules((r) => { if (r.selector.includes(":is(")) r.selectors = r.selectors.flatMap(abrirIs); });
  return raiz.toString();
}

function copiar(de, para) {
  fs.mkdirSync(para, { recursive: true });
  for (const n of fs.readdirSync(de)) {
    if (FORA.has(n) || n.startsWith(".")) continue;
    const a = path.join(de, n), b = path.join(para, n);
    if (fs.statSync(a).isDirectory()) copiar(a, b); else fs.copyFileSync(a, b);
  }
}

(async () => {
  fs.rmSync(DIST, { recursive: true, force: true });
  copiar(ORIG, DIST);
  fs.mkdirSync(path.join(DIST, "assets/fonts"), { recursive: true });
  for (const f of fs.readdirSync(path.join(VENDOR, "fontes"))) if (f.endsWith(".woff2")) fs.copyFileSync(path.join(VENDOR, "fontes", f), path.join(DIST, "assets/fonts", f));
  const cssFontes = (await esbuild.transform(fs.readFileSync(path.join(VENDOR, "fontes/fontes-local.css"), "utf8"), { loader: "css", minify: true })).code;
  const paginas = fs.readdirSync(DIST).filter((f) => f.endsWith(".html"));
  const jsArquivos = fs.readdirSync(path.join(DIST, "assets/js")).filter((f) => f.endsWith(".js")).map((f) => path.join(DIST, "assets/js", f));

  // 2 · CSS por página
  const reLink = /<link\b[^>]*rel="stylesheet"[^>]*>/g;
  const bundles = new Map();
  const raizAbs = new Set(); // páginas com caminho absoluto (/assets/...), como a 404
  const htmls = {};
  for (const p of paginas) {
    let h = fs.readFileSync(path.join(DIST, p), "utf8");
    const lista = [];
    h = h.replace(reLink, (tag) => {
      const href = (tag.match(/href="([^"]+)"/) || [])[1] || "";
      if (/^\/?assets\/css\//.test(href)) { lista.push(href.split("?")[0].replace(/^\//, "")); if (href.startsWith("/")) raizAbs.add(p); return "<!--CSSBUNDLE-->"; }
      if (href === AOS_CDN) { lista.push("@aos"); return "<!--CSSBUNDLE-->"; }
      return tag;
    });
    if (lista.length) {
      const chave = lista.join("|");
      if (!bundles.has(chave)) bundles.set(chave, { lista, paginas: [] });
      bundles.get(chave).paginas.push(p);
    }
    htmls[p] = { h, chave: lista.join("|"), fontePrincipal: h.includes(FONTE_PRINCIPAL) };
  }
  const nomeBundle = new Map();
  let antesCss = 0, depoisCss = 0;
  for (const [chave, b] of bundles) {
    const css = semIsDePseudo(b.lista.map((f) => (f === "@aos" ? fs.readFileSync(path.join(VENDOR, "aos.css"), "utf8") : fs.readFileSync(path.join(DIST, f), "utf8"))).join("\n"));
    antesCss += Buffer.byteLength(css);
    // compara só com as páginas que usam este pacote e os scripts que elas carregam
    const js = new Set();
    for (const p of b.paginas) for (const m of htmls[p].h.matchAll(/src="\/?(assets\/js\/[^"?]+)/g)) js.add(path.join(DIST, m[1]));
    const raw = [...b.paginas.map((p) => ({ raw: htmls[p].h.replace(/<!--[\s\S]*?-->/g, ""), extension: "html" })), ...[...js].filter(fs.existsSync).map((f) => ({ raw: fs.readFileSync(f, "utf8"), extension: "js" }))];
    const [res] = await new PurgeCSS().purge({ content: raw, css: [{ raw: css }], safelist: SAFELIST, keyframes: false, fontFace: false, variables: false });
    const min = Buffer.from((await esbuild.transform(res.css, { loader: "css", minify: true, legalComments: "none" })).code);
    const comFontes = b.paginas.some((p) => htmls[p].fontePrincipal) ? Buffer.concat([Buffer.from(cssFontes), min]) : min;
    depoisCss += comFontes.length;
    const hash = crypto.createHash("md5").update(comFontes).digest("hex").slice(0, 8);
    const nome = `assets/css/site-${hash}.min.css`;
    fs.writeFileSync(path.join(DIST, nome), comFontes);
    nomeBundle.set(chave, nome);
  }

  // 4 · HTML
  const fonte = /<link href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)" rel="stylesheet"\/?>/;
  for (const p of paginas) {
    let { h, chave } = htmls[p];
    let primeiro = true;
    const pre = raizAbs.has(p) ? "/" : "";
    h = h.replace(/<!--CSSBUNDLE-->\n?/g, () => (primeiro ? ((primeiro = false), `<link href="${pre}${nomeBundle.get(chave)}" rel="stylesheet"/>\n`) : ""));
    if (htmls[p].fontePrincipal) {
      const preloads = FONTES_PRELOAD.map((f) => `<link rel="preload" as="font" type="font/woff2" href="${pre}assets/fonts/${f}" crossorigin/>`).join("\n");
      h = h.replace(`<link href="${FONTE_PRINCIPAL}" rel="stylesheet"/>`, preloads);
      if (!h.includes("fonts.googleapis.com/css2")) h = h.replace(/<link href="https:\/\/fonts\.(googleapis|gstatic)\.com" rel="preconnect"( crossorigin)?\/>\n?/g, "");
    }
    h = h.replace(fonte, (_, url) => `<link rel="preload" as="style" href="${url}" onload="this.onload=null;this.rel='stylesheet'"/><noscript><link href="${url}" rel="stylesheet"/></noscript>`);
    h = await minHtml(h, { removeComments: true, ignoreCustomComments: [/^\s*\/?CMS:/], collapseWhitespace: false, minifyCSS: false, minifyJS: false });
    fs.writeFileSync(path.join(DIST, p), h);
  }

  // 3 · JS
  let antesJs = 0, depoisJs = 0;
  for (const f of jsArquivos) {
    const src = fs.readFileSync(f, "utf8"); antesJs += Buffer.byteLength(src);
    const out = (await esbuild.transform(src, { minify: true, loader: "js", legalComments: "none" })).code;
    depoisJs += Buffer.byteLength(out);
    fs.writeFileSync(f, out);
  }

  console.log(`CSS: ${bundles.size} pacotes, ${(antesCss / 1024).toFixed(0)} KB → ${(depoisCss / 1024).toFixed(0)} KB (soma dos pacotes)`);
  console.log(`JS: ${(antesJs / 1024).toFixed(0)} KB → ${(depoisJs / 1024).toFixed(0)} KB`);
})().catch((e) => { console.error("✖ otimizar falhou:", e); process.exit(1); });
