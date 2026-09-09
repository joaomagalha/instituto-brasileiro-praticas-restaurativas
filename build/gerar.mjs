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

const escritos = new Set();
let apagados = 0;

/* Memória da rodada: o conteúdo já produzido para cada arquivo.
   index.html passa por duas etapas (formações e notícias). Sem isto, a
   segunda etapa releria o arquivo do disco e, no modo --conferir (que não
   escreve), desfaria a primeira em silêncio. */
const memoria = new Map();

async function ler(rel) {
  if (memoria.has(rel)) return memoria.get(rel);
  return readFile(path.join(RAIZ, rel), 'utf8');
}


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
async function consultar({ url, chave }, caminho, { toleraAusente = false } = {}) {
  const resp = await fetch(`${url}/rest/v1/${caminho}`, {
    headers: { apikey: chave, Authorization: `Bearer ${chave}` }
  });

  /* Tabela que ainda não foi criada devolve 404. Para uma etapa que ainda
     não foi ligada no banco isso não é falha: é "essa parte ainda não
     existe". Deixar o build inteiro quebrar aqui pararia também a
     publicação de notícias, que não tem nada a ver. */
  if (resp.status === 404 && toleraAusente) return null;

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
  const atual = memoria.has(rel) ? memoria.get(rel)
              : (existsSync(abs) ? await readFile(abs, 'utf8') : null);
  memoria.set(rel, conteudo);

  if (atual === conteudo) return false;

  console.log(`${CONFERIR ? '[mudaria]' : '[escrito] '} ${rel}`);
  if (!CONFERIR) await writeFile(abs, conteudo);
  escritos.add(rel);
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
  let home = await ler('index.html');
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
  let lista = await ler('ibpr-em-movimento.html');
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
  const molde = await ler('build/templates/noticia.html');
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
      .replaceAll('{{TITULO}}', () => esc(n.titulo))
      .replaceAll('{{RESUMO}}', () => esc(n.resumo || ''))
      .replaceAll('{{META}}', () => esc(n.categoria) + (n.publicado_em ? ' · ' + dataCurta(n.publicado_em) : ''))
      .replaceAll('{{URL}}', () => esc(`${SITE}/${arquivo}`))
      .replaceAll('{{IMAGEM}}', () => esc(absoluto(n.imagem_url || IMAGEM_PADRAO)))
      .replaceAll('{{FIGURA}}', () => figura)
      .replaceAll('{{CORPO}}', () => corpo);

    await salvar(arquivo, html);
  }

  // --- Limpa páginas de notícias que não existem mais ---
  for (const f of await readdir(RAIZ)) {
    if (/^noticia-.+\.html$/.test(f) && !gerados.has(f)) await apagar(f);
  }
}


/* =====================================================================
   FORMAÇÕES
   =====================================================================
   Uma formação publicada aparece em SETE lugares. Este bloco é o que
   garante que criar um curso no painel atualize todos eles de uma vez:

     1. o menu suspenso "Formações" da navbar, em todas as páginas
     2. a lista de Formações do menu do celular, em todas as páginas
     3. a coluna "Formações" do rodapé, em todas as páginas
     4. o carrossel da Home (e a quantidade de bolinhas dele)
     5. o catálogo de formacoes.html (e o título "As quatro formações")
     6. os dados estruturados de formacoes.html (o ItemList do Google)
     7. a página própria do curso, formacao-<slug>.html
        + o bloco "Outras formações" no fim de cada uma delas
   ===================================================================== */

/* Páginas fixas do site. As formacao-*.html e noticia-*.html ficam de fora
   porque são geradas (e recebem as regiões no momento em que nascem). */
const PAGINAS_FIXAS = [
  'index.html', 'formacoes.html', 'o-instituto.html', 'como-atuamos.html',
  'praticas-restaurativas.html', 'ibpr-em-movimento.html', 'area-do-aluno.html',
  'build/templates/noticia.html', 'build/templates/formacao.html'
];

/* Lista vinda do JSONB. Tolera null e valor que não é lista. */
function lista(v) {
  return Array.isArray(v) ? v : [];
}

function tituloCurto(f)  { return f.titulo_curto  || f.titulo; }
function tituloRodape(f) { return f.titulo_rodape || f.titulo_curto || f.titulo; }

function arquivoFormacao(f) { return `${f.slug}.html`; }

/* Plural simples: 1 módulo / 4 módulos. */
function plural(n, um, muitos) { return `${n} ${n === 1 ? um : muitos}`; }

const EXTENSO = ['zero','uma','duas','três','quatro','cinco','seis','sete','oito','nove','dez'];

/* Quantos módulos e tópicos o curso tem. Vira a linha do card. */
function contagem(f) {
  const mods = lista(f.modulos);
  return { modulos: mods.length, topicos: mods.reduce((s, m) => s + lista(m.topicos).length, 0) };
}


/* --- os blocos da página do curso ---------------------------------- */

function blocoDesenvolver(f) {
  const itens = lista(f.desenvolver);
  if (!itens.length) return '';
  return `<div class="course-learn" data-aos="fade-up">
<h2 class="block-title"><i aria-hidden="true" class="fa-solid fa-award"></i>O que você vai desenvolver</h2>
<ul class="check-list check-list--2col">
${itens.map(i => `<li>${esc(i)}</li>`).join('\n')}
</ul>
</div>`;
}

function blocoTemas(f) {
  const itens = lista(f.temas_relacionados).filter(t => t && t.texto);
  if (!itens.length) return '';
  return `<section aria-label="Temas relacionados" id="temas" data-aos="fade-up">
<h2 class="block-title"><i aria-hidden="true" class="fa-solid fa-hashtag"></i>Temas relacionados</h2>
<div class="course-pills">
${itens.map(t => t.href
    ? `<a class="tag-pill" href="${esc(t.href)}">${esc(t.texto)}</a>`
    : `<span class="tag-pill">${esc(t.texto)}</span>`).join('\n')}
</div>
</section>`;
}

function blocoEixos(f) {
  const itens = lista(f.eixos).filter(e => e && e.chave);
  if (!itens.length) return '';
  return `<section aria-label="Os eixos da formação" id="eixos" data-aos="fade-up">
<h2 class="block-title"><i aria-hidden="true" class="fa-solid fa-diagram-project"></i>Os eixos da formação</h2>
<div class="course-eixos">
${itens.map((e, i) => `<div class="course-eixo">
<span class="course-eixo__num">${String(i + 1).padStart(2, '0')}</span>
<span class="course-eixo__key">${esc(e.chave)}</span>
<span class="course-eixo__phrase">${esc(e.frase || '')}</span>
<span class="course-eixo__desc">${esc(e.desc || '')}</span>
</div>`).join('\n')}
</div>
</section>`;
}

function blocoModulos(f) {
  const itens = lista(f.modulos).filter(m => m && m.titulo);
  if (!itens.length) return '';
  return `<section aria-label="Conteúdo do programa" id="conteudo-programa" data-aos="fade-up">
<h2 class="block-title"><i aria-hidden="true" class="fa-solid fa-layer-group"></i>Conteúdo do programa</h2>
<div class="course-modules" id="course-modules">
<div class="course-modules__bar">
<p class="course-modules__count">${plural(itens.length, 'módulo', 'módulos')}</p>
<button type="button" class="course-modules__toggle" data-accordion-toggle aria-expanded="false">Expandir todos</button>
</div>
${itens.map(m => {
    const tops = lista(m.topicos);
    return `<details class="accordion">
<summary class="accordion__summary"><i aria-hidden="true" class="fa-solid fa-chevron-down"></i><span class="accordion__label">${esc(m.titulo)}</span><span class="accordion__meta">${plural(tops.length, 'tópico', 'tópicos')}</span></summary>
<div class="accordion__content">
<ul class="dot-list">
${tops.map(t => `<li>${esc(t)}</li>`).join('\n')}
</ul>
</div>
</details>`;
  }).join('\n')}
</div>
</section>`;
}

function blocoFundamento(f) {
  const paras = String(f.fundamento || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (!paras.length) return '';
  return `<section aria-label="Fundamento da formação" id="fundamento" data-aos="fade-up">
<h2 class="block-title"><i aria-hidden="true" class="fa-solid fa-book-open"></i>Fundamento da formação</h2>
<div class="prose">
${paras.map(p => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`).join('\n')}
</div>
</section>`;
}

function blocoParaQuem(f) {
  const itens = lista(f.para_quem);
  if (!itens.length) return '';
  return `<section aria-label="Para quem é" id="para-quem" data-aos="fade-up">
<h2 class="block-title"><i aria-hidden="true" class="fa-solid fa-users"></i>Para quem é</h2>
<div class="course-pills">
${itens.map(i => `<span class="tag-pill">${esc(i)}</span>`).join('\n')}
</div>
</section>`;
}

function blocoResultados(f) {
  const itens = lista(f.resultados);
  if (!itens.length) return '';
  const intro = f.resultados_intro ? `<p>${esc(f.resultados_intro)}</p>\n` : '';
  return `<div class="course-outcome" data-aos="fade-up">
<h2 class="block-title"><i aria-hidden="true" class="fa-solid fa-rocket"></i>O que sua instituição será capaz de implementar</h2>
${intro}<ul class="check-list">
${itens.map(i => `<li>${esc(i)}</li>`).join('\n')}
</ul>
</div>`;
}

/* Bloco que ficou sem conteúdo simplesmente não aparece na página. */
function blocosDoCurso(f) {
  return [blocoDesenvolver, blocoTemas, blocoEixos, blocoModulos,
          blocoFundamento, blocoParaQuem, blocoResultados]
    .map(fn => fn(f)).filter(Boolean).join('\n\n');
}


/* --- o card, usado na Home, no catálogo e em "outras formações" ----- */

function cardFormacao(f, extras = '') {
  const { modulos, topicos } = contagem(f);
  const meta = modulos
    ? `<p class="service-card__meta"><span><i aria-hidden="true" class="fa-solid fa-layer-group"></i>${plural(modulos, 'módulo', 'módulos')}</span><span><i aria-hidden="true" class="fa-solid fa-book-open"></i>${plural(topicos, 'tópico', 'tópicos')}</span></p>`
    : '';

  return `<article class="service-card"${extras}>
<div class="service-card__img-wrap"><img alt="${esc(f.imagem_card_alt || '')}" class="service-card__photo" decoding="async" loading="lazy" src="${esc(f.imagem_card_url || '')}"/></div>
<div class="service-card__body"><p class="service-card__audience">${esc(f.publico_curto || '')}</p><h3 class="service-card__title">${esc(tituloCurto(f))}</h3><p class="service-card__desc">${esc(f.resumo || '')}</p>${meta}<a class="service-card__link" href="${esc(arquivoFormacao(f))}">Conhecer a formação <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></div>
</article>`;
}

/* Dá o data-aos escalonado, do jeito que as páginas já usam. */
function comAos(i) {
  return i === 0 ? ' data-aos="fade-up"' : ` data-aos="fade-up" data-aos-delay="${i * 80}"`;
}


/* --- as regiões de menu, iguais em todas as páginas ----------------- */

/* `atual` é o nome do arquivo que está sendo gerado, pra marcar o item do
   menu com aria-current="page" (o leitor de tela anuncia "página atual"). */
function regiaoNavbar(formacoes, atual) {
  const marca = arq => (arq === atual ? 'aria-current="page" ' : '');

  const itens = formacoes.map(f => {
    const arq = arquivoFormacao(f);
    return `<li><a ${marca(arq)}class="navbar__dropdown-link" href="${esc(arq)}" role="menuitem">${esc(tituloCurto(f))}</a></li>`;
  });
  itens.push(`<li><a ${marca('formacoes.html')}class="navbar__dropdown-link navbar__dropdown-link--all" href="formacoes.html" role="menuitem">Ver todas as formações <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></li>`);
  return itens.join('\n');
}

function regiaoMobile(formacoes) {
  return formacoes.map(f =>
    `<li><a class="mobile-menu__service-link" href="${esc(arquivoFormacao(f))}">${esc(tituloCurto(f))}</a></li>`
  ).join('\n');
}

function regiaoRodape(formacoes) {
  return formacoes.map(f =>
    `<li><a class="footer__link" href="${esc(arquivoFormacao(f))}">${esc(tituloRodape(f))}</a></li>`
  ).join('\n');
}

/* Aplica as três regiões de menu a um HTML qualquer. */
function aplicarMenus(html, formacoes, atual = null) {
  html = trocarRegiao(html, 'formacoes-navbar', regiaoNavbar(formacoes, atual));
  html = trocarRegiao(html, 'formacoes-mobile', regiaoMobile(formacoes));
  html = trocarRegiao(html, 'formacoes-rodape', regiaoRodape(formacoes));
  return html;
}


/* --- dados estruturados -------------------------------------------- */

const PROVEDOR = {
  '@type': 'EducationalOrganization',
  name: 'Instituto Brasileiro de Práticas Restaurativas',
  alternateName: 'IBPR'
};

/* JSON dentro de <script> não pode conter "<" cru. Um texto do banco com
   "</script>" no meio fecharia a tag e o resto viraria HTML solto; e a
   sequência "<!--<script" muda o modo de leitura do navegador. Escapar
   TODO "<" como < resolve os dois de uma vez, e o JSON continua
   idêntico ao ser lido (< é só a forma longa de "<"). */
function comoScript(obj) {
  return '<script type="application/ld+json">\n' +
    JSON.stringify(obj, null, 2).replace(/</g, '\\u003c') +
    '\n</script>';
}

function descricaoDe(f) {
  return f.seo_descricao || f.meta_descricao || f.resumo || '';
}

/* "Para diretores, professores e equipes" → "Diretores, professores e equipes" */
function publicoDe(f) {
  if (f.seo_publico) return f.seo_publico;
  const p = String(f.publico_curto || '').replace(/^Para\s+/i, '');
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : '';
}

function jsonldCurso(f) {
  const dados = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: f.titulo,
    description: descricaoDe(f),
    url: `${SITE}/${arquivoFormacao(f)}`,
    provider: PROVEDOR,
    inLanguage: 'pt-BR'
  };

  const ensina = lista(f.desenvolver).map(t => String(t).replace(/\.\s*$/, ''));
  if (ensina.length) dados.teaches = ensina;

  const publico = publicoDe(f);
  if (publico) dados.audience = { '@type': 'Audience', audienceType: publico };

  dados.hasCourseInstance = {
    '@type': 'CourseInstance',
    courseMode: 'online',
    description: 'Curso on-line com aulas gravadas e acesso vitalício ao conteúdo.'
  };
  return comoScript(dados);
}

function jsonldCatalogo(formacoes) {
  return comoScript({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Formações do Instituto Brasileiro de Práticas Restaurativas',
    itemListElement: formacoes.map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        name: f.titulo,
        description: f.resumo || '',
        url: `${SITE}/${arquivoFormacao(f)}`,
        provider: PROVEDOR,
        inLanguage: 'pt-BR',
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' }
      }
    }))
  });
}


/* --- a geração ------------------------------------------------------ */

async function gerarFormacoes(cfg) {
  const formacoes = await consultar(cfg,
    'formacoes?select=*&status=eq.publicado&order=ordem.asc,titulo.asc',
    { toleraAusente: true });

  /* TRAVA DE SEGURANÇA — a mais importante deste arquivo.
     Ao contrário das notícias, formação não tem um estado "vazio" bonito:
     sem nenhuma, o site perderia de uma vez o menu, o menu do celular, o
     rodapé, o carrossel da Home e o catálogo.

     Duas situações levam a uma lista vazia, e nenhuma delas é uma decisão
     editorial de verdade:
       • a tabela ainda não foi criada (SQL da etapa não rodou);
       • a tabela existe mas o seed dos 4 cursos não foi carregado.

     Nos dois casos a resposta certa é a mesma: NÃO MEXER EM NADA e avisar
     alto no log. O site continua exatamente como está, e as notícias
     continuam publicando normalmente. */
  if (formacoes === null) {
    console.log('\n== Formações: a tabela ainda não existe no banco. Nada foi alterado.');
    console.log('   (rode supabase/02-formacoes.sql e depois 02b-seed-formacoes.sql)');
    return;
  }

  console.log(`\n== Formações publicadas: ${formacoes.length}`);

  if (!formacoes.length) {
    console.log('⚠  Nenhuma formação publicada. O site NÃO foi alterado, de propósito:');
    console.log('   gerar as listas vazias apagaria o menu, o rodapé e o catálogo.');
    console.log('   Rode supabase/02b-seed-formacoes.sql.');
    return;
  }

  /* Slug precisa começar com "formacao-": é o que impede um curso chamado
     "index" de sobrescrever a Home, e é o que a limpeza de órfãos usa pra
     saber quais arquivos são dela. */
  for (const f of formacoes) {
    if (!/^formacao-[a-z0-9-]+$/.test(String(f.slug || ''))) {
      throw new Error(`Slug inválido: "${f.slug}". Precisa começar com "formacao-".`);
    }
  }

  /* --- 1, 2, 3: menus e rodapé das páginas fixas ---
     index.html e formacoes.html ficam de fora porque têm regiões extras;
     elas são montadas inteiras logo abaixo e salvas UMA vez só. Salvar duas
     vezes o mesmo arquivo deixaria o modo --conferir mentindo. */
  for (const rel of PAGINAS_FIXAS) {
    if (rel === 'index.html' || rel === 'formacoes.html') continue;
    await salvar(rel, aplicarMenus(await ler(rel), formacoes, rel));
  }

  // --- 4: carrossel da Home ---
  let home = aplicarMenus(await ler('index.html'), formacoes, 'index.html');
  home = trocarRegiao(home, 'formacoes-home',
    formacoes.map(f => cardFormacao(f)).join('\n'));
  home = trocarRegiao(home, 'formacoes-home-dots',
    formacoes.map((f, i) =>
      `<button aria-label="Ir para a formação ${i + 1}" class="services__dot${i === 0 ? ' services__dot--active' : ''}"></button>`
    ).join('\n'));
  await salvar('index.html', home);

  // --- 5 e 6: catálogo e dados estruturados de formacoes.html ---
  let cat = aplicarMenus(await ler('formacoes.html'), formacoes, 'formacoes.html');
  const n = formacoes.length;
  const titulo = n === 1
    ? 'A formação do Instituto'
    : `As ${EXTENSO[n] || n} formações do Instituto`;
  cat = trocarRegiao(cat, 'formacoes-catalogo-titulo', `<h2>${esc(titulo)}</h2>`);
  cat = trocarRegiao(cat, 'formacoes-catalogo',
    formacoes.map((f, i) => cardFormacao(f, comAos(i))).join('\n'));
  cat = trocarRegiao(cat, 'formacoes-jsonld', jsonldCatalogo(formacoes));
  await salvar('formacoes.html', cat);

  // --- 7: uma página por formação ---
  const molde = await ler('build/templates/formacao.html');
  const gerados = new Set();

  for (const f of formacoes) {
    const arquivo = arquivoFormacao(f);
    gerados.add(arquivo);

    // "Outras formações": todas as demais, na ordem do catálogo, até 3.
    const outras = formacoes.filter(o => o.slug !== f.slug).slice(0, 3);

    let html = molde
      .replaceAll('{{TITULO}}', () => esc(f.titulo))
      .replaceAll('{{SUBTITULO}}', () => esc(f.subtitulo || ''))
      .replaceAll('{{META_DESC}}', () => esc(f.meta_descricao || f.resumo || ''))
      .replaceAll('{{URL}}', () => esc(`${SITE}/${arquivo}`))
      /* A foto do topo entra como endereço ABSOLUTO, e não relativo.
         Motivo: ela é aplicada por uma variável CSS (--course-hero) que o
         components.css usa dentro de um url(). O navegador resolve esse
         url() em relação ao ARQUIVO .css, não à página — um caminho
         "assets/images/x.jpg" viraria "assets/css/assets/images/x.jpg" e a
         foto não carregaria. Conferido no navegador, não só no código. */
      .replaceAll('{{IMAGEM_ABS}}', () => esc(absoluto(f.imagem_hero_url || IMAGEM_PADRAO)))
      .replaceAll('{{META_AREA}}', () => f.area
        ? `<span class="course-meta__item"><i aria-hidden="true" class="fa-solid ${esc(f.area_icone || 'fa-shapes')}"></i>${esc(f.area)}</span>\n`
        : '')
      .replaceAll('{{LINK_CURSO}}', () => esc(f.link_curso || '#'))
      .replaceAll('{{JSONLD}}', () => jsonldCurso(f))
      .replaceAll('{{BLOCOS}}', () => blocosDoCurso(f))
      .replaceAll('{{OUTRAS}}', () => outras.map((o, i) => cardFormacao(o, comAos(i))).join('\n'));

    // Os menus desta página apontam pro curso atual (aria-current).
    html = aplicarMenus(html, formacoes, arquivo);

    await salvar(arquivo, html);
  }

  // --- limpa páginas de cursos que não existem mais ---
  for (const arq of await readdir(RAIZ)) {
    if (/^formacao-.+\.html$/.test(arq) && !gerados.has(arq)) await apagar(arq);
  }
}


/* =====================================================================
   PESSOAS
   =====================================================================
   A etapa mais simples do CMS. Uma pessoa aparece em dois lugares, no
   máximo:

     1. a seção "As pessoas por trás do propósito" (grupo 'direcao') ou
        "Quem já se juntou a este propósito" (grupo 'rede'), as duas em
        o-instituto.html;
     2. a prévia da Home, se estiver marcada como destaque.

   Sem página própria, sem menu, sem rodapé. Por isso não existe slug de
   endereço aqui: o slug só nomeia a foto no storage.
   ===================================================================== */

/* Escape para texto que vai DENTRO de um elemento (nunca dentro de um
   atributo). Só "&", "<" e ">" têm significado aí; aspas e apóstrofos são
   caracteres comuns. Escapar aspas também não seria errado, mas encheria
   o HTML de "&quot;" numa citação inteira, e a página fica mais difícil de
   ler pra quem for dar manutenção. Para atributo continua valendo o esc(). */
function escConteudo(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* O ÚNICO código aceito nos textos escritos pelo Instituto: *palavra* vira
   itálico. Existe por causa dos títulos de livro que já estavam na página
   ("coautor dos livros *Justiça Restaurativa na Execução Penal*").

   A ordem importa: escapa PRIMEIRO, converte depois. Assim um texto com
   "<script>" continua saindo inofensivo, e só o asterisco tem poder. */
function textoRico(t) {
  return escConteudo(t).replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

/* O separador de sementes entre uma pessoa e outra. É decoração pura
   (aria-hidden), por isso mora aqui e não no banco. */
const DIVISOR_PESSOAS = `<div aria-hidden="true" class="founders__divider">
<span class="founders__divider-line"></span>
<span class="founders__seeds"><i></i><i></i><i></i></span>
<span class="founders__divider-line"></span>
</div>`;

/* Um retrato. `comTrajetoria` é falso na Home: lá a seção é prévia, e a
   sanfona "Conheça a trajetória" só existe na página do Instituto. */
function cartaoPessoa(p, comTrajetoria) {
  /* width/height no HTML não são estilo: são a reserva de espaço que
     impede a página de "pular" enquanto a foto carrega. Só saem quando o
     banco tem as duas medidas. */
  const medidas = (p.foto_largura && p.foto_altura)
    ? ` height="${esc(p.foto_altura)}"` : '';
  const largura = (p.foto_largura && p.foto_altura)
    ? ` width="${esc(p.foto_largura)}"` : '';

  /* Pessoa sem foto mantém a moldura vazia em vez de sumir com o bloco:
     o painel exige foto, então isto é rede de proteção, não caminho
     normal. */
  const foto = p.foto_url
    ? `<img alt="${esc(p.foto_alt || p.nome)}" class="founder__photo" decoding="async"${medidas} loading="lazy" src="${esc(p.foto_url)}"${largura}/>`
    : '';

  const cargo = p.cargo
    ? `<p class="founder__credentials">${esc(p.cargo)}</p>\n` : '';

  const paras = comTrajetoria ? lista(p.trajetoria).filter(Boolean) : [];
  const trajetoria = paras.length
    ? `\n<details class="accordion">
<summary class="accordion__summary">Conheça a trajetória <i aria-hidden="true" class="fa-solid fa-chevron-down"></i></summary>
<div class="accordion__content">
${paras.map(t => `<p>${textoRico(t)}</p>`).join('\n')}
</div>
</details>`
    : '';

  return `<article class="founder" data-aos="fade-up">
<div class="founder__portrait">
<div class="founder__frame">
${foto}
</div>
</div>
<div class="founder__content">
<h3 class="founder__name">${esc(p.nome)}</h3>
${cargo}<p class="founder__bio">${textoRico(p.bio)}</p>${trajetoria}
</div>
</article>`;
}

/* A lista com os separadores entre um e outro (nunca no fim). */
function listaPessoas(pessoas, comTrajetoria) {
  return pessoas
    .map(p => cartaoPessoa(p, comTrajetoria))
    .join('\n' + DIVISOR_PESSOAS + '\n');
}

async function gerarPessoas(cfg) {
  const pessoas = await consultar(cfg,
    'pessoas?select=nome,grupo,cargo,bio,trajetoria,foto_url,foto_alt,' +
    'foto_largura,foto_altura,destaque_home,ordem' +
    '&status=eq.publicado&order=ordem.asc,nome.asc',
    { toleraAusente: true });

  /* TRAVA 1 — a tabela ainda não existe (o SQL desta etapa não rodou).
     Igual às formações: não é falha, é "essa parte ainda não foi ligada".
     O resto do build segue normalmente. */
  if (pessoas === null) {
    console.log('\n== Pessoas: a tabela ainda não existe no banco. Nada foi alterado.');
    console.log('   (rode supabase/04-pessoas.sql e depois 04b-seed-pessoas.sql)');
    return;
  }

  const direcao = pessoas.filter(p => p.grupo === 'direcao');
  const rede    = pessoas.filter(p => p.grupo === 'rede');

  console.log(`\n== Pessoas publicadas: ${pessoas.length} (${direcao.length} na direção, ${rede.length} na rede)`);

  /* TRAVA 2 — ninguém na direção.
     A seção "As pessoas por trás do propósito" é o coração da página do
     Instituto: gerar ela vazia deixaria um título sozinho no meio do
     site. Como nas formações, a resposta certa é não encostar em nada.

     A rede pode ficar vazia sem problema: o bloco "Quem já se juntou"
     inteiro (título junto) simplesmente não é escrito. */
  if (!direcao.length) {
    console.log('⚠  Nenhuma pessoa publicada na direção. O site NÃO foi alterado, de propósito:');
    console.log('   a seção "As pessoas por trás do propósito" ficaria sem ninguém.');
    console.log('   Rode supabase/04b-seed-pessoas.sql.');
    return;
  }

  /* --- Home: a prévia ---
     Quem está marcado como destaque. Se ninguém estiver, a direção
     inteira: melhor mostrar demais do que deixar a Home com um buraco. */
  const naHome = direcao.filter(p => p.destaque_home);
  let home = await ler('index.html');
  home = trocarRegiao(home, 'pessoas-home',
    listaPessoas(naHome.length ? naHome : direcao, false));
  await salvar('index.html', home);

  /* --- O Instituto: os dois blocos --- */
  let inst = await ler('o-instituto.html');
  inst = trocarRegiao(inst, 'pessoas-direcao', listaPessoas(direcao, true));

  /* O bloco da rede vem com o próprio título: sem ninguém nele, o título
     iria junto, em vez de sobrar sozinho em cima do vazio. */
  inst = trocarRegiao(inst, 'pessoas-rede', rede.length
    ? `<div class="section-header founders__header founders__subhead" data-aos="fade-up">
<p class="overline overline--light">Rede em formação</p>
<h2>Quem já se juntou a este propósito.</h2>
</div>
<div class="founders__list">
${listaPessoas(rede, true)}
</div>`
    : '');
  await salvar('o-instituto.html', inst);
}


/* =====================================================================
   TEXTOS INSTITUCIONAIS
   =====================================================================
   A diferença das outras etapas: aqui o banco não CRIA nada no site, só
   troca as palavras de lugares que já existem. Cada bloco editável é um
   marcador escrito no HTML por mim; o painel só edita o que tem marcador,
   e não deixa criar nem apagar bloco. É o que impede alguém de desmontar
   o design sem querer.

   Consequência boa disso: a rede de proteção é por bloco, não por etapa.
   Se uma linha sumir do banco, ou vier vazia, ou o marcador não existir
   mais, aquele pedaço específico fica exatamente como está no arquivo. O
   resto do site continua sendo gerado normalmente.

   Foram 33 blocos, escolhidos entre os 165 parágrafos do site: os que
   mudam com o tempo. O que ficou de fora está no SETUP.md.
   ===================================================================== */

/* Igual ao trocarRegiao, mas sem quebrar linha: estes marcadores ficam
   DENTRO de um <h2> ou <p>, e uma quebra ali viraria espaço no meio do
   texto. Devolve null (em vez de estourar) quando o marcador não existe,
   porque aqui isso é "esse bloco não é mais editável", não erro fatal. */
function trocarRegiaoInline(html, nome, miolo) {
  const abre = `<!-- CMS:${nome} -->`;
  const fecha = `<!-- /CMS:${nome} -->`;
  const i = html.indexOf(abre);
  const f = html.indexOf(fecha);

  if (i === -1 || f === -1 || f < i) return null;
  return html.slice(0, i + abre.length) + miolo + html.slice(f);
}

async function gerarTextos(cfg) {
  const textos = await consultar(cfg,
    'textos?select=chave,arquivo,tipo,valor&order=ordem.asc',
    { toleraAusente: true });

  if (textos === null) {
    console.log('\n== Textos: a tabela ainda não existe no banco. Nada foi alterado.');
    console.log('   (rode supabase/05-textos.sql e depois 05b-seed-textos.sql)');
    return;
  }

  console.log(`\n== Textos institucionais: ${textos.length} blocos no banco`);

  /* Agrupa por arquivo pra ler e salvar cada página uma vez só. */
  const porArquivo = new Map();
  for (const t of textos) {
    if (!porArquivo.has(t.arquivo)) porArquivo.set(t.arquivo, []);
    porArquivo.get(t.arquivo).push(t);
  }

  let trocados = 0;
  const pulados = [];

  for (const [arquivo, blocos] of porArquivo) {
    let html = await ler(arquivo);

    for (const t of blocos) {
      /* Bloco vazio = "não quero mexer nisso", não "apague o texto".
         Esvaziar um título pelo painel deixaria um buraco na página, e
         seria fácil fazer isso sem querer. */
      const valor = String(t.valor || '').trim();
      if (!valor) { pulados.push(`${t.chave} (vazio)`); continue; }

      const miolo = t.tipo === 'prosa'
        ? '\n' + valor.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
            .map(p => `<p>${textoRico(p).replace(/\n/g, '<br/>')}</p>`).join('\n') + '\n'
        : textoRico(valor);

      const novo = trocarRegiaoInline(html, `texto:${t.chave}`, miolo);
      if (novo === null) { pulados.push(`${t.chave} (sem marcador em ${arquivo})`); continue; }

      html = novo;
      trocados++;
    }

    await salvar(arquivo, html);
  }

  if (pulados.length) {
    console.log(`   ${trocados} aplicados, ${pulados.length} pulados: ${pulados.join(', ')}`);
  }
}


/* =====================================================================
   Execução
   ===================================================================== */
try {
  const cfg = await lerConfig();
  console.log(`Lendo de ${cfg.url}${CONFERIR ? '  (modo conferência, não escreve)' : ''}`);

  /* Formações ANTES de notícias: o gerador de formações atualiza os menus
     dentro de build/templates/noticia.html, e o de notícias precisa ler o
     molde já atualizado pra que as páginas de notícia saiam com o menu
     certo na mesma rodada. */
  await gerarFormacoes(cfg);
  await gerarPessoas(cfg);
  await gerarTextos(cfg);
  await gerarNoticias(cfg);

  console.log(`\nResumo: ${escritos.size} arquivo(s) ${CONFERIR ? 'mudariam' : 'escritos'}, ${apagados} apagado(s).`);
} catch (erro) {
  // Sai com erro SEM ter commitado nada. O Action falha, o site fica como
  // estava, e o problema aparece no log em vez de virar site quebrado.
  console.error('\n✖ Build abortado:', erro.message);
  process.exit(1);
}
