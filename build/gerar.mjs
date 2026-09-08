/* =====================================================================
   IBPR — gerador do site a partir do CMS
   =====================================================================
   Lê o conteúdo publicado no Supabase e escreve HTML de verdade nos
   arquivos do site. Roda no GitHub Actions a cada publicação, e também
   pode rodar na mão:

       node build/gerar.mjs            gera
       node build/gerar.mjs --conferir não escreve nada, só diz o que mudaria

   POR QUE GERAR ARQUIVO EM VEZ DE MONTAR NO NAVEGADOR
   O site vende formações. Conteúdo montado por JavaScript é indexado mal
   pelo Google e não gera preview no WhatsApp (o robô do WhatsApp lê o HTML
   cru, sem rodar script). Gerando arquivo, cada notícia e cada curso ganha
   título e imagem próprios ao ser compartilhado.

   A REGRA QUE SUSTENTA TUDO: MARCADORES
   O script só reescreve o que está entre um par de comentários:

       <!-- CMS:nome -->  ...miolo trocado...  <!-- /CMS:nome -->

   Fora dos marcadores ele não encosta. Se este script nunca rodar, ou
   quebrar no meio, o site continua exatamente como está. Nada some.
   ===================================================================== */

import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CONFERIR = process.argv.includes('--conferir');

/* Endereço público do site, sem barra no fim.
   ⚠️ TROCAR AQUI quando o domínio www.ibpr.com.br apontar pro GitHub Pages.
   É o único lugar que precisa mudar.

   Por que precisa ser absoluto: os robôs de preview do WhatsApp e do
   LinkedIn não resolvem caminho relativo em og:image. Com caminho relativo
   o link compartilhado sai sem imagem nenhuma. */
const SITE = 'https://joaomagalha.github.io/instituto-brasileiro-praticas-restaurativas';

/* Transforma caminho do site em endereço completo. Imagem que já vem do
   storage do Supabase chega absoluta e passa direto. */
function absoluto(caminho) {
  return /^https?:\/\//.test(caminho) ? caminho : `${SITE}/${String(caminho).replace(/^\/+/, '')}`;
}

let escritos = 0;
let apagados = 0;


/* ---------------------------------------------------------------------
   Configuração: lida do mesmo arquivo que o site usa
   ---------------------------------------------------------------------
   Assim existe UM lugar só com a URL e a chave. Se o projeto do Supabase
   mudar, muda lá e o build acompanha sozinho. */
async function lerConfig() {
  const txt = await readFile(path.join(RAIZ, 'assets/js/supabase-config.js'), 'utf8');
  const url = txt.match(/url:\s*'([^']+)'/)?.[1];
  const chave = txt.match(/anonKey:\s*'([^']+)'/)?.[1];

  if (!url || !chave) {
    throw new Error('supabase-config.js sem url ou anonKey preenchidos.');
  }
  return { url, chave };
}

/* Consulta a API REST do Supabase. Sem biblioteca: o Node 24 já tem fetch,
   e uma dependência a menos é uma coisa a menos pra quebrar no Action. */
async function consultar({ url, chave }, caminho) {
  const resp = await fetch(`${url}/rest/v1/${caminho}`, {
    headers: { apikey: chave, Authorization: `Bearer ${chave}` }
  });
  if (!resp.ok) {
    throw new Error(`Supabase respondeu ${resp.status} em ${caminho}: ${await resp.text()}`);
  }
  return resp.json();
}


/* ---------------------------------------------------------------------
   Utilitários
   --------------------------------------------------------------------- */

/* Escapa texto vindo do banco antes de virar HTML. Sem isto, uma notícia
   com "<script>" no título viraria código rodando na página. */
function esc(t) {
  return String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function dataCurta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${String(d.getUTCDate()).padStart(2,'0')} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* Troca o miolo de uma região marcada. Devolve o texto novo, ou lança se
   o marcador não existir — marcador faltando é erro de programação, não
   algo pra ignorar em silêncio. */
function trocarRegiao(html, nome, miolo) {
  const abre = `<!-- CMS:${nome} -->`;
  const fecha = `<!-- /CMS:${nome} -->`;
  const i = html.indexOf(abre);
  const f = html.indexOf(fecha);

  if (i === -1 || f === -1 || f < i) {
    throw new Error(`Marcador CMS:${nome} não encontrado (ou invertido).`);
  }
  return html.slice(0, i + abre.length) + '\n' + miolo + '\n' + html.slice(f);
}

/* Escreve só se o conteúdo mudou. Evita commit vazio e deixa o log honesto. */
async function salvar(rel, conteudo) {
  const abs = path.join(RAIZ, rel);
  const atual = existsSync(abs) ? await readFile(abs, 'utf8') : null;

  if (atual === conteudo) return false;

  console.log(`${CONFERIR ? '[mudaria]' : '[escrito] '} ${rel}`);
  if (!CONFERIR) await writeFile(abs, conteudo);
  escritos++;
  return true;
}

async function apagar(rel) {
  console.log(`${CONFERIR ? '[apagaria]' : '[apagado] '} ${rel}`);
  if (!CONFERIR) await unlink(path.join(RAIZ, rel));
  apagados++;
}


/* =====================================================================
   NOTÍCIAS
   ===================================================================== */

const IMAGEM_PADRAO = 'assets/images/ibpr-movimento-hero.jpg';

/* Card de notícia — reaproveita o .service-card das Formações tal e qual.
   `base` é '' nas páginas da raiz (todas, hoje); existe pro dia em que
   alguma página gerada more numa subpasta. */
function cardNoticia(n) {
  const data = dataCurta(n.publicado_em);
  const img = n.imagem_url || IMAGEM_PADRAO;

  return `<article class="service-card">
<div class="service-card__img-wrap"><img alt="${esc(n.imagem_alt || '')}" class="service-card__photo" decoding="async" loading="lazy" src="${esc(img)}"/></div>
<div class="service-card__body"><p class="service-card__audience">${esc(n.categoria)}${data ? ' &middot; ' + data : ''}</p><h3 class="service-card__title">${esc(n.titulo)}</h3><p class="service-card__desc">${esc(n.resumo || '')}</p><a class="service-card__link" href="noticia-${esc(n.slug)}.html">Ler notícia <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></div>
</article>`;
}

/* As 3 frentes: é o estado "em breve", que continua sendo a cara da seção
   enquanto o Instituto não publicar nada. Mora aqui porque o build precisa
   saber reconstruí-lo quando a última notícia for apagada. */
const TRES_FRENTES = `<div class="course-eixos measure-narrow" data-aos="fade-up">
<div class="course-eixo">
<span class="course-eixo__num">01</span>
<span class="course-eixo__key">Pesquisa</span>
<span class="course-eixo__phrase">Produção científica e referência</span>
<p class="course-eixo__desc">Estudos, artigos e materiais de referência sobre Justiça Restaurativa produzidos pelo Instituto e pela sua rede.</p>
</div>
<div class="course-eixo">
<span class="course-eixo__num">02</span>
<span class="course-eixo__key">Formações</span>
<span class="course-eixo__phrase">Turmas, campo e resultados</span>
<p class="course-eixo__desc">O que acontece nas formações do IBPR: novas turmas, registros de campo e os resultados de quem já passou por elas.</p>
</div>
<div class="course-eixo">
<span class="course-eixo__num">03</span>
<span class="course-eixo__key">Rede</span>
<span class="course-eixo__phrase">Atuação dentro e fora do IBPR</span>
<p class="course-eixo__desc">A prática dos profissionais que integram a rede do Instituto em escolas, empresas, órgãos públicos e no sistema de Justiça.</p>
</div>
</div>`;

/* Miolo da seção IBPR em Movimento. Dois estados, um só lugar que decide. */
function secaoMovimento(noticias, { kicker, titulo, sub, kickerVazio, tituloVazio, subVazio, botao }) {
  const tem = noticias.length > 0;

  const cabeca = `<div class="section-header section__head measure-narrow" data-aos="fade-up">
<p class="overline">${esc(tem ? kicker : kickerVazio)}</p>
<h2>${esc(tem ? titulo : tituloVazio)}</h2>
<p class="section-header__sub">${esc(tem ? sub : subVazio)}</p>
</div>`;

  const corpo = tem
    ? `<div class="noticias__grid measure-narrow" data-aos="fade-up">\n${noticias.map(cardNoticia).join('\n')}\n</div>`
    : TRES_FRENTES;

  // O aviso "em breve" só existe enquanto não há publicação.
  const rodape = `<div class="movimento-foot measure-narrow" data-aos="fade-up">
${tem ? '' : '<p class="overline">Primeiras publicações em breve</p>\n'}${botao || ''}</div>`;

  return [cabeca, corpo, rodape].join('\n');
}

async function gerarNoticias(cfg) {
  const noticias = await consultar(cfg,
    'noticias?select=titulo,slug,resumo,conteudo,categoria,imagem_url,imagem_alt,publicado_em' +
    '&status=eq.publicado&order=publicado_em.desc.nullslast');

  console.log(`\n== Notícias publicadas: ${noticias.length}`);

  // --- Home: as 3 mais recentes ---
  let home = await readFile(path.join(RAIZ, 'index.html'), 'utf8');
  home = trocarRegiao(home, 'movimento-home', secaoMovimento(noticias.slice(0, 3), {
    kicker: 'IBPR em Movimento',
    titulo: 'Acompanhe a atuação do IBPR e da sua rede.',
    sub: 'Um espaço para acompanhar o que o Instituto e os profissionais da sua rede realizam, dentro e fora do IBPR.',
    kickerVazio: 'IBPR em Movimento',
    tituloVazio: 'Acompanhe a atuação do IBPR e da sua rede.',
    subVazio: 'Um espaço para acompanhar o que o Instituto e os profissionais da sua rede realizam, dentro e fora do IBPR.',
    botao: '<a class="btn btn--dark" href="ibpr-em-movimento.html">Ir para o IBPR em Movimento <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>'
  }));
  await salvar('index.html', home);

  // --- Página IBPR em Movimento: todas ---
  let lista = await readFile(path.join(RAIZ, 'ibpr-em-movimento.html'), 'utf8');
  lista = trocarRegiao(lista, 'movimento-lista', secaoMovimento(noticias, {
    kicker: 'IBPR em Movimento',
    titulo: 'Publicações do Instituto e da sua rede.',
    sub: 'A produção científica, as formações e a atuação de campo do IBPR e dos profissionais que integram a sua rede.',
    kickerVazio: 'O que vem aqui',
    tituloVazio: 'Três frentes, um mesmo movimento.',
    subVazio: 'Enquanto as primeiras publicações são preparadas, estas são as frentes que o IBPR em Movimento vai reunir.',
    botao: ''
  }));
  await salvar('ibpr-em-movimento.html', lista);

  // --- Uma página por notícia ---
  const molde = await readFile(path.join(RAIZ, 'build/templates/noticia.html'), 'utf8');
  const gerados = new Set();

  for (const n of noticias) {
    const arquivo = `noticia-${n.slug}.html`;
    gerados.add(arquivo);

    const corpo = String(n.conteudo || '')
      .split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
      .map(p => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`)
      .join('\n');

    const figura = n.imagem_url
      ? `<figure class="noticia-figura">\n<img alt="${esc(n.imagem_alt || '')}" decoding="async" src="${esc(n.imagem_url)}"/>\n</figure>`
      : '';

    const html = molde
      .replaceAll('{{TITULO}}', esc(n.titulo))
      .replaceAll('{{RESUMO}}', esc(n.resumo || ''))
      .replaceAll('{{META}}', esc(n.categoria) + (n.publicado_em ? ' · ' + dataCurta(n.publicado_em) : ''))
      .replaceAll('{{URL}}', esc(`${SITE}/${arquivo}`))
      .replaceAll('{{IMAGEM}}', esc(absoluto(n.imagem_url || IMAGEM_PADRAO)))
      .replaceAll('{{FIGURA}}', figura)
      .replaceAll('{{CORPO}}', corpo);

    await salvar(arquivo, html);
  }

  // --- Limpa páginas de notícias que não existem mais ---
  for (const f of await readdir(RAIZ)) {
    if (/^noticia-.+\.html$/.test(f) && !gerados.has(f)) await apagar(f);
  }
}


/* =====================================================================
   Execução
   ===================================================================== */
try {
  const cfg = await lerConfig();
  console.log(`Lendo de ${cfg.url}${CONFERIR ? '  (modo conferência, não escreve)' : ''}`);

  await gerarNoticias(cfg);

  console.log(`\nResumo: ${escritos} arquivo(s) ${CONFERIR ? 'mudariam' : 'escritos'}, ${apagados} apagado(s).`);
} catch (erro) {
  // Sai com erro SEM ter commitado nada. O Action falha, o site fica como
  // estava, e o problema aparece no log em vez de virar site quebrado.
  console.error('\n✖ Build abortado:', erro.message);
  process.exit(1);
}
