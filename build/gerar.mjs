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
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CONFERIR = process.argv.includes('--conferir');

/* Endereço público do site, sem barra no fim.
   ⚠️ TROCAR AQUI quando o domínio www.ibpr.com.br apontar pro GitHub Pages.
   É o único lugar que precisa mudar.

   Por que precisa ser absoluto: os robôs de preview do WhatsApp e do
   LinkedIn não resolvem caminho relativo em og:image. Com caminho relativo
   o link compartilhado sai sem imagem nenhuma. */
const SITE = 'https://www.ibpr.com.br';

/* Transforma caminho do site em endereço completo. Imagem que já vem do
   storage do Supabase chega absoluta e passa direto. */
function absoluto(caminho) {
  return /^https?:\/\//.test(caminho) ? caminho : `${SITE}/${String(caminho).replace(/^\/+/, '')}`;
}

/* Miniaturas base64 das fotos de hero, chaveadas pelo caminho relativo da
   foto (sem ?v=). Gerado por build/dev/lqip.py; se o arquivo não existir,
   nenhuma página ganha placeholder e nada quebra. */
let LQIP = {};
try { LQIP = JSON.parse(await readFile(path.join(RAIZ, 'build/lqip.json'), 'utf8')); } catch { LQIP = {}; }
function lqipDe(caminho) {
  const chave = String(caminho).replace(/^https?:\/\/[^/]+\//, '').replace(/^\/+/, '').split('?')[0];
  return LQIP[chave] ? `url('${LQIP[chave]}')` : 'none';
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

/* Trava contra apagar o site em massa (28/09/2026).
   Formações e pessoas já se recusavam a gerar lista vazia; notícias e
   artigos não. Se o banco devolver a lista vazia ou muito menor do que o
   que está no ar (regra de acesso alterada, tabela recriada, despublicação
   em massa por engano), a limpeza de órfãos apagaria as páginas e o build
   commitaria. Aqui o build ABORTA: nada é publicado, o Action fica vermelho
   e o GitHub avisa o João por e-mail. Queda legítima (o Instituto apagou
   mesmo): rodar o workflow à mão marcando "permitir_queda". */
async function conferirQueda(tipo, prefixo, publicados) {
  if (process.env.IBPR_PERMITIR_QUEDA === '1') return;
  const noAr = (await readdir(RAIZ)).filter(f => f.startsWith(prefixo) && f.endsWith('.html')).length;
  const sumiram = noAr - publicados;
  if (noAr >= 2 && (publicados === 0 || (sumiram >= 3 && publicados < noAr / 2))) {
    throw new Error(
      `${tipo}: o banco devolveu ${publicados} publicado(s), mas há ${noAr} página(s) no ar. ` +
      `Parece falha no banco, não decisão de apagar; nada foi publicado. ` +
      `Se foi de propósito, rode o workflow à mão com "permitir_queda".`);
  }
}

/* Consulta a API REST do Supabase. Sem biblioteca: o Node 24 já tem fetch,
   e uma dependência a menos é uma coisa a menos pra quebrar no Action.

   Tenta até 3 vezes (22/10/2026): numa rodada a consulta de artigos, que
   leva 0,3 s, travou 30 s e derrubou a publicação inteira. Engasgo do banco
   ou da rede (timeout, conexão caída, 5xx, 429) espera 5 s e depois 15 s e
   tenta de novo; erro de verdade (4xx: chave ou coluna errada) falha na
   hora, porque repetir não conserta. Pior caso ~2 min: com o banco fora do
   ar de vez, a primeira consulta que esgota as 3 tentativas aborta o build
   (medido: 110 s), o script sai com a mensagem do Supabase no log, a
   rodada falha sem publicar e o site fica como estava. */
const ESPERAS_SUPABASE = [5000, 15000];

async function consultar({ url, chave }, caminho, { toleraAusente = false } = {}) {
  const nome = caminho.split('?')[0];
  for (let tentativa = 1; ; tentativa++) {
    let resp;
    try {
      resp = await fetch(`${url}/rest/v1/${caminho}`, {
        headers: { apikey: chave, Authorization: `Bearer ${chave}` },
        signal: AbortSignal.timeout(30000)   // banco travado: aborta em 30 s em vez de segurar a fila
      });
    } catch (erro) {
      // TimeoutError/AbortError (travou) ou TypeError (rede caiu)
      if (tentativa > ESPERAS_SUPABASE.length) throw erro;
      await esperarSupabase(nome, tentativa, erro.message);
      continue;
    }

    /* Tabela que ainda não foi criada devolve 404. Para uma etapa que ainda
       não foi ligada no banco isso não é falha: é "essa parte ainda não
       existe". Deixar o build inteiro quebrar aqui pararia também a
       publicação de notícias, que não tem nada a ver. */
    if (resp.status === 404 && toleraAusente) return null;

    if ((resp.status >= 500 || resp.status === 429) && tentativa <= ESPERAS_SUPABASE.length) {
      await resp.body?.cancel().catch(() => {});   // solta a conexão já; se falhar, tanto faz
      await esperarSupabase(nome, tentativa, `HTTP ${resp.status}`);
      continue;
    }

    if (!resp.ok) {
      throw new Error(`Supabase respondeu ${resp.status} em ${caminho}: ${await resp.text()}`);
    }
    try {
      return await resp.json();
    } catch (erro) {
      // corpo travou no meio (o timeout de 30 s vale até o fim da leitura);
      // JSON inválido (SyntaxError) não se conserta tentando de novo
      if (erro.name === 'SyntaxError' || tentativa > ESPERAS_SUPABASE.length) throw erro;
      await esperarSupabase(nome, tentativa, erro.message);
    }
  }
}

async function esperarSupabase(nome, tentativa, motivo) {
  const ms = ESPERAS_SUPABASE[tentativa - 1];
  console.log(`   Supabase lento em ${nome} (${motivo}); tentativa ${tentativa + 1} de ${ESPERAS_SUPABASE.length + 1} em ${ms / 1000} s.`);
  await new Promise(r => setTimeout(r, ms));
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

/* Link com seta num círculo (visual novo, 20/10/2026): onde o desenho novo
   trocou o btn--dark ou o link-arrow por ele ("Ver todas as publicações",
   "Ver todas as notícias"). Um lugar só pra que os blocos gerados saiam com
   o mesmo desenho das páginas. A faixa de artigos manteve o btn--dark. */
function linkSeta(href, rotulo, extra = '') {
  return `<a class="link-seta${extra ? ' ' + extra : ''}" href="${esc(href)}"><span>${esc(rotulo)}</span>` +
    `<span aria-hidden="true" class="link-seta__circ"><i class="fa-solid fa-arrow-right"></i></span></a>`;
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/* Dia, mês e ano no fuso do Instituto (28/09/2026). Antes era UTC: uma
   notícia publicada às 21h em Cuiabá (01h do dia seguinte em UTC) saía no
   site com a data de amanhã, enquanto o painel mostrava a de hoje. */
const FUSO = 'America/Cuiaba';
function partesDaData(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d).map(x => [x.type, x.value]));
  return { dia: p.day, mes: Number(p.month), ano: p.year };
}

function dataCurta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = partesDaData(d);
  return `${p.dia} ${MESES[p.mes - 1]} ${p.ano}`;
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

/* Card de notícia — horizontal, na base do .info-card (branco, borda fina,
   cantos grandes, sombra leve, sobe no hover): foto 16:9 à esquerda, texto à
   direita, um card por linha na coluna de leitura. No celular a foto vai pra
   cima. Um por linha fica bom com 1 notícia ou com 20; a grade de 3 colunas
   do card de Formações deixava a notícia fina e alta quando havia poucas. */
/* URL de fonte como o painel manda: tira utm_* e afins (o Decildo colou
   um link com ?utm_source=chatgpt.com), e descarta o que não é http(s). */
function limparUrlFonte(bruta) {
  const t = String(bruta || '').trim();
  if (!/^https?:\/\//i.test(t)) return '';
  try {
    const u = new URL(t);
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(k)) u.searchParams.delete(k);
    }
    return u.toString().replace(/\?$/, '');
  } catch { return ''; }
}

/* Todo link que um editor digita no painel (link do curso, da publicação,
   PDF, temas relacionados) passa por aqui antes de virar href (28/09/2026).
   - "javascript:", "data:" e qualquer outro esquema viram '' (o esc() só
     impede fechar a aspa; não impede um link que roda código no site, que
     é o mesmo domínio do painel).
   - Endereço colado sem "https://" ("www.tjmt.jus.br/...", "tjmt.jus.br/...")
     ganha o https; sem isso o navegador lia como caminho do próprio site e
     o link dava 404.
   - Caminho do próprio site ("formacao-x.html", "assets/docs/y.pdf") passa. */
function urlSegura(bruta) {
  const t = String(bruta || '').trim();
  if (!t || t.startsWith('//')) return '';
  if (/^(https?:\/\/|mailto:)/i.test(t)) return t;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return '';
  if (/^www\./i.test(t) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(br|com|org|net|gov|jus|edu|int|info|io)(\/|$)/i.test(t)) return 'https://' + t;
  return t;
}

function cardNoticia(n, extra = '', selo = extra === 'noticia-card--destaque') {
  const data = dataCurta(n.publicado_em);
  const img = n.imagem_url || IMAGEM_PADRAO;
  const href = n.href || `noticia-${n.slug}.html`;
  const frente = n.frente || n.categoria;
  const cta = n.cta || 'Ler notícia';

  return `<article class="noticia-card${extra ? ' ' + extra : ''}">
<a class="noticia-card__link" href="${esc(href)}">
${n.capaTipografica && !n.imagem_url
    ? `<div class="noticia-card__media noticia-card__media--artigo" aria-hidden="true"><img alt="" decoding="async" loading="lazy" src="assets/images/ibpr-logo-icone.webp"/><span>Artigo</span>${selo ? '<span class="noticia-card__selo">Adicionada recentemente</span>' : ''}</div>`
    : `<div class="noticia-card__media"><img alt="${esc(n.imagem_alt || '')}" decoding="async"${attrAltura(web(img))} loading="lazy" src="${esc(web(img))}"${attrLargura(web(img))}/>${selo ? '<span class="noticia-card__selo">Adicionada recentemente</span>' : ''}</div>`}
<div class="noticia-card__body">
<p class="noticia-card__meta"><span class="noticia-card__frente">${esc(frente)}</span>${data ? `<span class="noticia-card__data">${data}</span>` : ''}</p>
<h3 class="noticia-card__title">${esc(n.titulo)}</h3>
<p class="noticia-card__resumo">${esc(n.resumo || '')}</p>
<span class="noticia-card__cta">${esc(cta)} <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></span>
</div>
</a>
</article>`;
}

/* Card da Home no visual novo (20/10/2026): foto, frente + data, título,
   resumo e "Ler ...". `destaque` é o primeiro, maior, e leva o selo
   "Adicionada recentemente" (é sempre o que entrou por último no site, ver
   gerarNoticias). Artigo sem capa não tem mais a capa tipográfica aqui: o
   desenho novo não tem versão sem foto, então entra a foto padrão do IBPR
   em Movimento, a mesma que a notícia sem foto já usava. */
function cardMovimento(n, destaque) {
  const data = dataCurta(n.publicado_em);
  const href = n.href || `noticia-${n.slug}.html`;
  const img = n.imagem_url || IMAGEM_PADRAO;
  const alt = n.imagem_url ? (n.imagem_alt || '') : '';
  return `<article class="mcard${destaque ? ' mcard--destaque' : ''}" data-aos="fade-up"><a class="mcard__link" href="${esc(href)}">
<div class="mcard__media"><img alt="${esc(alt)}" decoding="async"${attrAltura(web(img))} loading="lazy" src="${esc(web(img))}"${attrLargura(web(img))}/>${destaque ? '<span class="mcard__selo">Adicionada recentemente</span>' : ''}</div>
<div class="mcard__corpo"><p class="mcard__meta"><span class="mcard__frente">${esc(n.frente || n.categoria)}</span>${data ? `<span>${data}</span>` : ''}</p>
<h3 class="mcard__titulo">${esc(n.titulo)}</h3>
<p class="mcard__resumo">${esc(n.resumo || '')}</p>
<span class="mcard__cta">${esc(n.cta || 'Ler notícia')} <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></span></div>
</a></article>`;
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
function secaoMovimento(noticias, { kicker, titulo, sub, meta, kickerVazio, tituloVazio, subVazio, botao, linkTopo }) {
  const tem = noticias.length > 0;

  /* Home com notícia (16/09/2026): mesmo desenho do cabeçalho de
     Formações (texto à esquerda, botão à direita, largura do container) e
     um card em destaque abaixo. Fora do measure-narrow de propósito, pra
     alinhar com as outras seções da Home. */
  /* Visual novo (20/10/2026): a primeira publicação vira o card grande
     (.mcard--destaque) e as outras duas empilham ao lado (.mov-d__lado).
     Com uma publicação só, a coluna do lado não é escrita. */
  if (tem && linkTopo) {
    const [primeira, ...outras] = noticias;
    return `<div class="section-header formacoes__header topo-secao" data-aos="fade-up">
<div class="formacoes__header-text">
<p class="overline">${esc(kicker)}</p>
<h2>${esc(titulo)}</h2>
<p class="section-header__sub">${esc(sub)}</p>
</div>
${linkSeta(linkTopo.href, linkTopo.rotulo)}
</div>
<div class="mov-d">
${cardMovimento(primeira, true)}
${outras.length ? `<div class="mov-d__lado">\n${outras.map(n => cardMovimento(n, false)).join('\n')}\n</div>\n` : ''}</div>`;
  }

  // Com notícia, a lista ocupa o container inteiro, alinhada com Artigos e o
  // rodapé (06/10/2026); o estado vazio continua no measure-narrow.
  const estreito = tem ? '' : ' measure-narrow';
  const cabeca = `<div class="section-header section__head${estreito}" data-aos="fade-up">
<p class="overline">${esc(tem ? kicker : kickerVazio)}</p>
<h2>${esc(tem ? titulo : tituloVazio)}</h2>
${tem && meta ? `<p class="section-header__meta">${esc(meta)}</p>` : `<p class="section-header__sub">${esc(tem ? sub : subVazio)}</p>`}
${tem && meta ? `<button class="btn btn--dark section-header__acao" data-receber-publicacoes type="button"><i aria-hidden="true" class="fa-regular fa-bell"></i> Receber publicações</button>` : ''}
</div>`;

  // O selo "Adicionada recentemente" (28/09/2026, era "Publicação mais recente",
  // que confundia: a de maio aparecia com o selo abaixo de notícias de setembro) vai na que ENTROU no site por último
  // (criado_em), igual à Home; a ordem da lista continua pela data do evento.
  const maisNova = noticias.reduce((m, n) =>
    String(n.criado_em || n.publicado_em || '') > String((m && (m.criado_em || m.publicado_em)) || '') ? n : m, null);
  const corpo = tem
    ? `<div class="noticias__lista" data-aos="fade-up">\n${noticias.map(n => cardNoticia(n, '', n === maisNova)).join('\n')}\n</div>`
    : TRES_FRENTES;

  // O aviso "em breve" só existe enquanto não há publicação.
  const rodape = `<div class="movimento-foot${estreito}" data-aos="fade-up">
${tem ? '' : '<p class="overline">Primeiras publicações em breve</p>\n'}${botao || ''}</div>`;

  return [cabeca, corpo, rodape].join('\n');
}

/* "Outras notícias" no fim de cada notícia (14/10/2026): antes a página
   acabava em "Receber publicações" e quem terminava de ler não tinha pra
   onde seguir. Mesmo desenho do "Outros artigos" do artigo.
   Visual novo (20/10/2026): mesma faixa .mov-noticias da lista do IBPR em
   Movimento, com o "Ver todas" em link-seta ao lado do título. */
function blocoOutrasNoticias(noticias, atual) {
  const outras = noticias.filter(o => o.slug !== atual.slug).slice(0, 3);
  if (!outras.length) return '';
  return `<section aria-label="Outras notícias" class="mov-noticias" id="outras-noticias">
<div class="container">
<div class="section-header section__head">
<p class="overline">Continue lendo</p>
<h2>Outras notícias.</h2>
${linkSeta('ibpr-em-movimento.html', 'Ver todas as notícias', 'section-header__acao')}
</div>
<div class="noticias__lista" data-aos="fade-up">
${outras.map(o => cardNoticia(o)).join('\n')}
</div>
</div>
</section>`;
}

async function gerarNoticias(cfg, artigos = []) {
  const noticias = await consultar(cfg,
    'noticias?select=titulo,slug,resumo,conteudo,categoria,imagem_url,imagem_alt,imagem_legenda,fonte_nome,fonte_url,publicado_em,criado_em' +
    '&status=eq.publicado&order=publicado_em.desc.nullslast,criado_em.desc,slug.asc');

  console.log(`\n== Notícias publicadas: ${noticias.length}`);
  await conferirQueda('Notícias', 'noticia-', noticias.length);
  await prepararMedidas([...noticias, ...artigos].map(x => x.imagem_url));

  // --- Home: as 3 publicações que ENTRARAM NO SITE por último, notícias e
  //     artigos juntos (17/09/2026). Ordena por criado_em, não por
  //     publicado_em: o Decildo data a notícia com o dia do evento (março,
  //     maio...), e por data de publicação as novidades nunca chegavam à
  //     Home (decisão do João, 17/09 à noite). O card continua mostrando a
  //     data do evento; a lista completa segue por essa data. ---
  const recentes = [
    ...noticias.map(n => ({ ...n, frente: 'Notícia', cta: 'Ler notícia' })),
    ...artigos.map(a => ({
      ...a, href: `artigo-${a.slug}.html`, frente: 'Artigo', cta: 'Ler artigo', capaTipografica: true,
      imagem_alt: a.imagem_url ? a.imagem_alt : 'Instituto Brasileiro de Práticas Restaurativas (IBPR)',
      resumo: a.resumo, titulo: tituloCompleto(a)
    }))
  ].sort((x, y) => String(y.criado_em || y.publicado_em || '').localeCompare(String(x.criado_em || x.publicado_em || '')));

  let home = await ler('index.html');
  home = trocarRegiao(home, 'movimento-home', secaoMovimento(recentes.slice(0, 3), {
    kicker: 'IBPR em Movimento',
    titulo: 'Acompanhe a atuação do IBPR e da sua rede.',
    sub: 'Um espaço para acompanhar o que o Instituto e os profissionais da sua rede realizam, dentro e fora do IBPR.',
    kickerVazio: 'IBPR em Movimento',
    tituloVazio: 'Acompanhe a atuação do IBPR e da sua rede.',
    subVazio: 'Um espaço para acompanhar o que o Instituto e os profissionais da sua rede realizam, dentro e fora do IBPR.',
    botao: linkSeta('ibpr-em-movimento.html', 'Ir para o IBPR em Movimento'),
    linkTopo: { href: 'ibpr-em-movimento.html', rotulo: 'Ver todas as publicações' }
  }));
  await salvar('index.html', home);

  // --- Página IBPR em Movimento: todas ---
  let lista = await ler('ibpr-em-movimento.html');
  lista = trocarRegiao(lista, 'movimento-lista', secaoMovimento(noticias, {
    /* 06/10/2026: o Decildo pediu só "Notícias." no lugar de "Publicações do
       Instituto e da sua rede."; embaixo, uma linha só com dado do próprio site
       (quantas e a data da mais recente, que é a 1ª da lista), sem texto
       opinativo (decisão do João). O link pros artigos no pé saiu no mesmo
       dia: o bloco de Artigos logo abaixo já tem "Ver todos os artigos". */
    kicker: 'IBPR em Movimento',
    titulo: 'Notícias.',
    meta: `${noticias.length} ${noticias.length === 1 ? 'notícia' : 'notícias'}` +
      (dataCurta(noticias[0] && noticias[0].publicado_em) ? ` · mais recente em ${dataCurta(noticias[0].publicado_em)}` : ''),
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

    const legenda = String(n.imagem_legenda || '').trim();
    const figura = n.imagem_url
      ? `<figure class="noticia-figura${legenda ? ' noticia-figura--com-legenda' : ''}">\n` +
        `<div class="noticia-figura__moldura"><img alt="${esc(n.imagem_alt || '')}" decoding="async"${attrAltura(web(n.imagem_url))} src="${esc(web(n.imagem_url))}"${attrLargura(web(n.imagem_url))}/></div>\n` +
        (legenda ? `<figcaption class="noticia-figura__legenda">${esc(legenda)}</figcaption>\n` : '') +
        `</figure>`
      : '';

    // "Com informações de X": só quando a notícia veio de fora. Link em aba
    // nova, com rel de segurança; se só houver o nome, sai sem link.
    // Tolerâncias ao que chega do painel (17/09/2026, primeiras notícias do
    // Decildo): "Fonte: X." vira "X"; a URL perde utm_*; e fonte apontando
    // pro próprio site (www.ibpr.com.br) é conteúdo próprio, sem linha.
    const fonteNome = String(n.fonte_nome || '').trim().replace(/^fonte\s*:\s*/i, '').replace(/[.\s]+$/, '');
    const fonteUrl  = limparUrlFonte(n.fonte_url);
    const fonteEhOProprioSite = /(^|\.|\/)ibpr\.com\.br(\/|$)/i.test(fonteNome) && !fonteUrl;
    const fonte = fonteNome && !fonteEhOProprioSite
      ? `<p class="noticia-fonte">Com informações ${fonteUrl
          ? `de <a href="${esc(fonteUrl)}" rel="noopener" target="_blank">${esc(fonteNome)}<i aria-hidden="true" class="fa-solid fa-arrow-up-right-from-square"></i></a>`
          : `de ${esc(fonteNome)}`}.</p>`
      : '';

    const html = molde
      .replaceAll('{{TITULO}}', () => esc(n.titulo))
      .replaceAll('{{RESUMO}}', () => esc(n.resumo || ''))
      .replaceAll('{{META}}', () => esc(n.categoria) + (n.publicado_em ? ' · ' + dataCurta(n.publicado_em) : ''))
      .replaceAll('{{URL}}', () => esc(`${SITE}/${arquivo}`))
      .replaceAll('{{IMAGEM}}', () => esc(absoluto(n.imagem_url || IMAGEM_PADRAO)))
      // Alt da prévia: a descrição da foto da notícia; sem foto própria, o nome do Instituto.
      .replaceAll('{{IMAGEM_ALT}}', () => esc((n.imagem_url && n.imagem_alt) || 'Instituto Brasileiro de Práticas Restaurativas (IBPR)'))
      // Data de publicação pro Google e pras redes (ISO 8601), só quando existe.
      .replaceAll('{{PUBLICADO_META}}', () => n.publicado_em
        ? `<meta content="${esc(new Date(n.publicado_em).toISOString())}" property="article:published_time"/>`
        : '')
      .replaceAll('{{FIGURA}}', () => figura)
      .replaceAll('{{FONTE}}', () => fonte)
      .replaceAll('{{CORPO}}', () => corpo)
      .replaceAll('{{OUTRAS}}', () => blocoOutrasNoticias(noticias, n));

    await salvar(arquivo, html);
  }

  // --- Limpa páginas de notícias que não existem mais ---
  for (const f of await readdir(RAIZ)) {
    if (/^noticia-.+\.html$/.test(f) && !gerados.has(f)) await apagar(f);
  }
}


/* =====================================================================
   ARTIGOS (17/09/2026)
   =====================================================================
   Pedido do Dr. Decildo: uma área para os artigos do Instituto, dentro
   de IBPR em Movimento. Artigo tem autores com credenciais, resumo,
   palavras-chave, texto longo com seções e, às vezes, PDF ou DOI.
   ===================================================================== */

function tituloCompleto(a) {
  const sub = String(a.subtitulo || '').trim();
  return sub ? `${a.titulo}: ${sub}` : a.titulo;
}

/* Marcação leve do corpo → HTML. Escapa TUDO primeiro; só depois reconhece
   os poucos sinais aceitos (o painel explica os mesmos):
     linha em branco = parágrafo novo · "## " seção · "### " subseção ·
     "> " citação · "- " lista · "1. " lista numerada · *itálico* ·
     **negrito** · [1] vira nota ligada ao item 1 da seção "## Notas". */
function inlineRico(t) {
  const links = [];
  const guardar = html => { links.push(html); return `\u0000${links.length - 1}\u0000`; };
  const ancora = (url, texto) => `<a href="${url}" rel="noopener" target="_blank">${texto}</a>`;
  return t
    // [texto](url) primeiro, depois URL solta; os dois viram marcador pra
    // não serem relidos pelas regras de itálico/nota
    .replace(/\[([^\]\n]+?)\]\((https?:\/\/[^)\s]+)\)/g, (_, texto, url) => guardar(ancora(url, texto)))
    .replace(/(^|[\s(])(https?:\/\/[^\s<>]+?)([.,;:)]*)(?=\s|$)/g, (_, antes, url, fim) => antes + guardar(ancora(url, url)) + fim)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
    .replace(/\[(\d{1,3})\]/g, '<sup class="nota-ref" id="ref-$1"><a href="#nota-$1">$1</a></sup>')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

function slugSecao(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'secao';
}

/* Devolve { html, sumario: [{id, titulo}] }. Cada "## " ganha um id, que o
   sumário lateral ("Neste artigo") e o scrollspy usam. */
function corpoRico(texto) {
  const blocos = esc(String(texto || '')).replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  let emNotas = false;
  const saida = [];
  const sumario = [];
  /* Ids que a página do artigo já usa (molde e blocos do build): uma seção
     "## Citação" ou "## Conteúdo" não pode repetir, senão "Copiar citação"
     e "Pular para o conteúdo" apontam pro lugar errado (28/09/2026). */
  const usados = new Set(['conteudo', 'citacao', 'navbar', 'overlay', 'artigos']);

  for (const b of blocos) {
    const linhas = b.split('\n').map(l => l.trim());

    if (/^###\s+/.test(b)) { saida.push(`<h3>${inlineRico(b.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^##\s+/.test(b)) {
      const t = b.replace(/^##\s+/, '');
      emNotas = /^notas?$/i.test(t.trim());
      let id = emNotas ? 'notas' : slugSecao(t.replace(/^\d+(\.\d+)*\.?\s*/, ''));
      while (usados.has(id)) id += '-2';
      usados.add(id);
      sumario.push({ id, titulo: t.replace(/\*\*?/g, '') });
      saida.push(`<h2 id="${id}">${inlineRico(t)}</h2>`);
      continue;
    }
    if (linhas.every(l => /^&gt;\s?/.test(l))) {
      saida.push(`<blockquote><p>${linhas.map(l => inlineRico(l.replace(/^&gt;\s?/, ''))).join('<br/>')}</p></blockquote>`);
      continue;
    }
    if (linhas.every(l => /^-\s+/.test(l))) {
      saida.push(`<ul>${linhas.map(l => `<li>${inlineRico(l.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\d{1,3}\.\s+/.test(linhas[0]) && linhas.filter(l => /^\d{1,3}\.\s+/.test(l)).length >= Math.ceil(linhas.length / 2)) {
      // linha sem número é continuação do item anterior
      const agrupadas = [];
      for (const l of linhas) {
        if (/^\d{1,3}\.\s+/.test(l) || !agrupadas.length) agrupadas.push(l);
        else agrupadas[agrupadas.length - 1] += ' ' + l;
      }
      const itens = agrupadas.map(l => {
        const n = l.match(/^(\d{1,3})\.\s+/)[1];
        const corpo = inlineRico(l.replace(/^\d{1,3}\.\s+/, ''));
        return emNotas
          ? `<li id="nota-${n}" value="${n}">${corpo} <a class="nota-volta" href="#ref-${n}" aria-label="Voltar ao texto">↩</a></li>`
          : `<li value="${n}">${corpo}</li>`;
      });
      saida.push(`<ol${emNotas ? ' class="artigo-notas"' : ''}>${itens.join('')}</ol>`);
      continue;
    }
    saida.push(`<p>${inlineRico(linhas.join('<br/>'))}</p>`);
  }
  return { html: saida.join('\n'), sumario };
}

function blocoSumario(sumario, classe) {
  if (!sumario.length) return '';
  const itens = sumario.map(x => `<li><a href="#${x.id}">${x.titulo}</a></li>`).join('');
  if (classe === 'mobile') {
    return `<details class="artigo-toc artigo-toc--mobile">
<summary><i aria-hidden="true" class="fa-solid fa-list-ul"></i> Neste artigo</summary>
<ol>${itens}</ol>
</details>`;
  }
  return `<nav aria-label="Seções deste artigo" class="artigo-toc" data-toc>
<p class="artigo-toc__titulo">Neste artigo</p>
<ol>${itens}</ol>
</nav>`;
}

/* Palavras por minuto de leitura em português: 200 é a régua comum. */
function tempoLeitura(a) {
  if (!String(a.corpo || '').trim()) return 0;   // só resumo + PDF: não faz sentido
  const palavras = `${a.resumo || ''} ${a.corpo || ''}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}
function rotuloLeitura(a) {
  const m = tempoLeitura(a);
  return m ? `${m} min de leitura` : '';
}

function autoresLista(a) {
  return lista(a.autores).map(x => (typeof x === 'string' ? { nome: x, credenciais: [] } : x))
    .filter(x => x && x.nome);
}

/* A letra do círculo do autor (hero, bloco de autores e card). */
function inicial(nome) {
  return String(nome).trim().charAt(0).toUpperCase();
}

function nomesAutores(a) {
  const nomes = autoresLista(a).map(x => x.nome);
  if (nomes.length <= 1) return nomes.join('');
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/* "Decildo Ferreira Lopes" → "LOPES, Decildo Ferreira" (ABNT NBR 6023).
   Júnior/Filho/Neto/Sobrinho ficam junto do sobrenome. */
function nomeABNT(nome) {
  const partes = String(nome).trim().split(/\s+/);
  if (partes.length < 2) return partes.join('').toUpperCase();
  const sufixos = ['júnior', 'junior', 'filho', 'neto', 'sobrinho'];
  let corte = partes.length - 1;
  if (sufixos.includes(partes[corte].toLowerCase()) && partes.length > 2) corte -= 1;
  return `${partes.slice(corte).join(' ').toUpperCase()}, ${partes.slice(0, corte).join(' ')}`;
}

function citacaoABNT(a, url) {
  const autores = autoresLista(a).map(x => nomeABNT(x.nome)).join('; ');
  const ano = a.publicado_em ? partesDaData(new Date(a.publicado_em)).ano : '';
  const titulo = tituloCompleto(a);
  // revista que já traz o ano no nome (ex: "..., jul./dez. 2021") não ganha o ano de novo
  const onde = a.publicacao_nome
    ? `${a.publicacao_nome}${ano && !String(a.publicacao_nome).includes(String(ano)) ? `, ${ano}` : ''}`
    : `IBPR em Movimento, Instituto Brasileiro de Práticas Restaurativas${ano ? `, ${ano}` : ''}`;
  return `${autores}. ${titulo}. ${onde}. Disponível em: ${url}. Acesso em: `;
}

/* Card de artigo editorial (06/10/2026, o João achou o anterior sem graça):
   imagem 2:1 com o tempo de leitura em selo, data, título, resumo em 2 linhas,
   até 3 palavras-chave e um rodapé com as iniciais e os nomes dos autores +
   "Ler artigo". Serve artigos.html, o bloco do IBPR em Movimento e o
   "Outros artigos" de cada artigo; a Home usa cardNoticia. */
function cardArtigo(a, extra = '') {
  const data = dataCurta(a.publicado_em);
  const href = `artigo-${a.slug}.html`;
  const leitura = rotuloLeitura(a);
  /* Artigo sem capa (20/10/2026): na grade de 2 colunas do visual novo o
     card sem foto ficava com um vão branco do tamanho da foto do vizinho.
     Entra a foto padrão do IBPR em Movimento, a mesma do topo do artigo e
     do card da Home, com alt vazio (é decoração, não a capa do artigo). */
  const foto = web(a.imagem_url || IMAGEM_PADRAO);
  const altCapa = a.imagem_url ? (a.imagem_alt || '') : '';
  const capa = `<div class="artigo-card__media"><img alt="${esc(altCapa)}" decoding="async"${attrAltura(foto)} loading="lazy" src="${esc(foto)}"${attrLargura(foto)}/>${leitura ? `<span class="artigo-card__selo"><i aria-hidden="true" class="fa-regular fa-clock"></i> ${esc(leitura)}</span>` : ''}</div>`;
  const palavras = lista(a.palavras_chave).filter(Boolean).slice(0, 3);
  const autores = autoresLista(a);
  const iniciais = autores.slice(0, 3)
    .map(x => `<span class="artigo-card__avatar" aria-hidden="true">${esc(inicial(x.nome))}</span>`).join('');
  return `<article class="artigo-card${extra ? ' ' + extra : ''}">
<a class="artigo-card__link" href="${esc(href)}">
${capa}<div class="artigo-card__body">
<p class="noticia-card__meta"><span class="noticia-card__frente">Artigo</span>${data ? `<span class="noticia-card__data">${data}</span>` : ''}</p>
<h3 class="artigo-card__title">${esc(tituloCompleto(a))}</h3>
${a.resumo ? `<p class="artigo-card__resumo">${esc(a.resumo)}</p>` : ''}
${palavras.length ? `<ul class="artigo-card__palavras" aria-label="Palavras-chave">${palavras.map(k => `<li class="tag-pill">${esc(k)}</li>`).join('')}</ul>` : ''}
<div class="artigo-card__rodape">
${autores.length ? `<div class="artigo-card__avatares">${iniciais}</div><p class="artigo-card__autores">${esc(nomesAutores(a))}</p>` : ''}
<span class="noticia-card__cta">Ler artigo <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></span>
</div>
</div>
</a>
</article>`;
}

/* Estado vazio de artigos.html: fica escrito no build pelo mesmo motivo
   das TRES_FRENTES (o build precisa reconstruí-lo se o último artigo sair). */
const ARTIGOS_VAZIO = `<div class="section-header section__head" data-aos="fade-up">
<p class="overline">Em preparação</p>
<h2>Os primeiros artigos estão a caminho.</h2>
<p class="section-header__sub">O Instituto está organizando a sua produção acadêmica para publicar aqui, com texto completo e referências.</p>
</div>`;

function blocoAcesso(a, classe = '') {
  const partes = [];
  if (urlSegura(a.pdf_url)) {
    partes.push(`<a class="btn btn--dark" href="${esc(urlSegura(a.pdf_url))}" rel="noopener" target="_blank">Baixar o PDF <i aria-hidden="true" class="fa-solid fa-file-arrow-down"></i></a>`);
  }
  const doiUrl = a.doi ? `https://doi.org/${String(a.doi).replace(/^https?:\/\/doi\.org\//, '')}` : '';
  const linkFora = urlSegura(a.publicacao_url) || doiUrl;
  if (linkFora) {
    // rótulo curto: só o nome da revista (antes da 1ª vírgula)
    const rotulo = a.publicacao_nome ? `Ver em ${esc(String(a.publicacao_nome).split(',')[0].trim())}` : 'Ver no DOI';
    partes.push(`<a class="link-arrow" href="${esc(linkFora)}" rel="noopener" target="_blank">${rotulo} <i aria-hidden="true" class="fa-solid fa-arrow-up-right-from-square"></i></a>`);
  }
  if (!partes.length) return '';
  return `<div class="artigo-acesso${classe ? ' ' + classe : ''}">${partes.join('\n')}${a.doi ? `<p class="artigo-acesso__doi">DOI: <span>${esc(a.doi)}</span></p>` : ''}</div>`;
}

async function gerarArtigos(cfg) {
  const artigos = await consultar(cfg,
    'artigos?select=titulo,subtitulo,slug,autores,resumo,palavras_chave,corpo,pdf_url,doi,publicacao_nome,publicacao_url,imagem_url,imagem_alt,publicado_em,criado_em' +
    '&status=eq.publicado&order=publicado_em.desc.nullslast,criado_em.desc,slug.asc', { toleraAusente: true });

  if (artigos === null) {
    console.log('\n== Artigos: a tabela ainda não existe no banco. Nada foi alterado.');
    console.log('   (rode supabase/11-artigos.sql)');
    return [];
  }
  await conferirQueda('Artigos', 'artigo-', artigos.length);
  await prepararMedidas(artigos.map(a => a.imagem_url));
  console.log(`\n== Artigos publicados: ${artigos.length}`);

  // --- artigos.html: todos ---
  let pagina = await ler('artigos.html');
  const miolo = artigos.length
    // Cabeçalho igual ao da lista de notícias (14/10/2026): antes o h2 era só
    // pra leitor de tela e a lista abria com um "ARTIGOS" solto e um vão.
    // Visual novo (20/10/2026): mesma estrutura do cabeçalho de Artigos da IBPR
    // em Movimento (texto à esquerda, botão à direita), que o CSS de #artigos espera.
    ? `<div class="section-header formacoes__header" data-aos="fade-up">
<div class="formacoes__header-text">
<p class="overline">IBPR em Movimento</p>
<h2>Artigos.</h2>
<p class="section-header__meta">${esc(`${artigos.length} ${artigos.length === 1 ? 'artigo' : 'artigos'}` +
      (dataCurta(artigos[0] && artigos[0].publicado_em) ? ` · mais recente em ${dataCurta(artigos[0].publicado_em)}` : ''))}</p>
</div>
<button class="btn btn--dark section-header__acao" data-receber-publicacoes type="button"><i aria-hidden="true" class="fa-regular fa-bell"></i> Receber publicações</button>
</div>
<div class="artigos__lista" data-aos="fade-up">
${artigos.map(a => cardArtigo(a)).join('\n')}
</div>`
    : ARTIGOS_VAZIO;
  pagina = trocarRegiao(pagina, 'artigos-lista', miolo);
  await salvar('artigos.html', pagina);

  // --- Hub IBPR em Movimento: os 3 mais recentes; sem artigo, a seção some ---
  let hub = await ler('ibpr-em-movimento.html');
  // Visual novo (20/10/2026): a faixa saiu sem a grade de fundo (grid-overlay).
  const secaoHub = artigos.length
    ? `<section aria-label="Artigos" class="section section--white" id="artigos">
<div class="container" style="position:relative;z-index:1">
<div class="section-header formacoes__header" data-aos="fade-up">
<div class="formacoes__header-text">
<p class="overline">IBPR em Movimento</p>
<h2>Artigos.</h2>
</div>
<a class="btn btn--dark" href="artigos.html">Ver todos os artigos <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>
</div>
<div class="artigos__lista artigos__lista--hub" data-aos="fade-up">
${artigos.slice(0, 3).map(a => cardArtigo(a)).join('\n')}
</div>
</div>
</section>`
    : '';
  hub = trocarRegiao(hub, 'artigos-hub', secaoHub);
  await salvar('ibpr-em-movimento.html', hub);

  // --- Uma página por artigo ---
  const molde = await ler('build/templates/artigo.html');
  const gerados = new Set();

  for (const a of artigos) {
    const arquivo = `artigo-${a.slug}.html`;
    gerados.add(arquivo);
    const url = `${SITE}/${arquivo}`;

    // Título sem subtítulo explícito mas com dois-pontos: divide, pro h1 não virar 5 linhas.
    let titulo = a.titulo, subtitulo = String(a.subtitulo || '').trim();
    if (!subtitulo && /:\s+/.test(titulo)) {
      const i = titulo.indexOf(': ');
      subtitulo = titulo.slice(i + 2).trim(); titulo = titulo.slice(0, i).trim();
    }
    const completo = subtitulo ? `${titulo}: ${subtitulo}` : titulo;
    const resumoLimpo = String(a.resumo || '').replace(/\s+/g, ' ').trim();
    // Só corta a última palavra (pela metade) quando o resumo passa de 157
    // caracteres; antes cortava sempre e o resumo curto perdia a palavra final.
    const descricao = resumoLimpo.length > 157
      ? resumoLimpo.slice(0, 157).replace(/\s+\S*$/, '') + '…'
      : resumoLimpo;

    const autores = autoresLista(a);
    const blocoAutores = autores.length
      ? `<div class="artigo-autores">\n${autores.map(x => `<div class="artigo-autor">
<span class="artigo-autor__inicial" aria-hidden="true">${esc(inicial(x.nome))}</span>
<p class="artigo-autor__nome">${esc(x.nome)}</p>
${lista(x.credenciais).length ? `<p class="artigo-autor__cred">${lista(x.credenciais).map(esc).join('<br/>')}</p>` : ''}
</div>`).join('\n')}\n</div>`
      : '';

    const palavras = lista(a.palavras_chave).filter(Boolean);
    const blocoResumo = a.resumo
      ? `<div class="artigo-resumo">
<p class="overline">Resumo</p>
<p class="artigo-resumo__texto">${esc(a.resumo)}</p>
${palavras.length ? `<ul class="artigo-palavras" aria-label="Palavras-chave">${palavras.map(p => `<li class="tag-pill">${esc(p)}</li>`).join('')}</ul>` : ''}
</div>`
      : '';

    const citar = `<div class="artigo-citar">
<p class="overline">Como citar</p>
<p class="artigo-citar__texto" id="citacao">${esc(citacaoABNT(a, url))}<span data-acesso-em></span>.</p>
<button class="artigo-citar__copiar" data-copiar-citacao type="button"><i aria-hidden="true" class="fa-regular fa-copy"></i> Copiar citação</button>
</div>`;

    const outros = artigos.filter(o => o.slug !== a.slug).slice(0, 3);
    const blocoOutros = outros.length
      // Visual novo (20/10/2026): sem a grade de fundo, e com id="artigos",
      // igual à faixa de artigos do IBPR em Movimento (é o mesmo CSS).
      ? `<section aria-label="Outros artigos" class="section section--white" id="artigos">
<div class="container" style="position:relative;z-index:1">
<div class="section-header formacoes__header" data-aos="fade-up">
<div class="formacoes__header-text">
<p class="overline">Continue lendo</p>
<h2>Outros artigos.</h2>
</div>
<a class="btn btn--dark" href="artigos.html">Ver todos os artigos <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>
</div>
<div class="artigos__lista artigos__lista--hub" data-aos="fade-up">
${outros.map(o => cardArtigo(o)).join('\n')}
</div>
</div>
</section>`
      : '';

    const meta = ['Artigo', a.publicado_em ? dataCurta(a.publicado_em) : '', rotuloLeitura(a)].filter(Boolean).join(' · ');
    const corpo = corpoRico(a.corpo);
    const autoresHero = autores.length
      // Visual novo (19/10/2026): a inicial num círculo no lugar do ícone de pessoa.
      ? `<p class="artigo-hero__autores">${autores.map(x => `<span class="artigo-hero__autor"><span class="artigo-hero__inicial" aria-hidden="true">${esc(inicial(x.nome))}</span>${esc(x.nome)}</span>`).join('')}</p>`
      : '';
    // Baixar: PDF de verdade quando existe; senão a impressão da própria página
    // (folha de estilo de impressão), que a pessoa salva como PDF. Desde
    // 06/10/2026 o destaque do quadro Ações é "Receber publicações" (pedido do
    // Decildo), então o PDF virou botão comum.
    const acaoPdf = urlSegura(a.pdf_url)
      ? `<a class="artigo-acao" href="${esc(urlSegura(a.pdf_url))}" rel="noopener" target="_blank"><i aria-hidden="true" class="fa-solid fa-file-arrow-down"></i><span>Baixar o PDF</span></a>`
      : `<button class="artigo-acao" data-imprimir type="button"><i aria-hidden="true" class="fa-solid fa-file-arrow-down"></i><span>Baixar em PDF</span></button>`;

    const html = molde
      .replaceAll('{{TITULO_COMPLETO}}', () => esc(completo))
      .replaceAll('{{TITULO}}', () => esc(titulo))
      .replaceAll('{{SUBTITULO}}', () => subtitulo ? `<p class="hero-interna__sub">${esc(subtitulo)}</p>` : '')
      .replaceAll('{{DESCRICAO}}', () => esc(descricao))
      .replaceAll('{{META}}', () => esc(meta))
      .replaceAll('{{URL}}', () => esc(url))
      .replaceAll('{{IMAGEM}}', () => esc(absoluto(a.imagem_url || IMAGEM_PADRAO)))
      .replaceAll('{{IMAGEM_ALT}}', () => esc((a.imagem_url && a.imagem_alt) || 'Instituto Brasileiro de Práticas Restaurativas (IBPR)'))
      .replaceAll('{{PUBLICADO_META}}', () => a.publicado_em
        ? `<meta content="${esc(new Date(a.publicado_em).toISOString())}" property="article:published_time"/>`
        : '')
      .replaceAll('{{AUTORES}}', () => blocoAutores)
      .replaceAll('{{RESUMO_BLOCO}}', () => blocoResumo)
      .replaceAll('{{ACESSO}}', () => blocoAcesso(a))
      .replaceAll('{{ACESSO_FIM}}', () => (a.corpo && String(a.corpo).trim()) ? blocoAcesso(a, 'artigo-acesso--fim') : '')
      .replaceAll('{{CORPO}}', () => corpo.html)
      .replaceAll('{{SUMARIO}}', () => blocoSumario(corpo.sumario, 'lateral'))
      .replaceAll('{{SUMARIO_MOBILE}}', () => blocoSumario(corpo.sumario, 'mobile'))
      .replaceAll('{{AUTORES_HERO}}', () => autoresHero)
      .replaceAll('{{ACAO_PDF}}', () => acaoPdf)
      .replaceAll('{{ACOES_MOBILE}}', () => `<div class="artigo-acoes artigo-acoes--mobile">
<button class="artigo-acao artigo-acao--destaque" data-receber-publicacoes type="button"><i aria-hidden="true" class="fa-regular fa-bell"></i><span>Receber publicações</span></button>
${acaoPdf}
<button class="artigo-acao" data-copiar-citacao type="button"><i aria-hidden="true" class="fa-regular fa-copy"></i><span>Copiar citação</span></button>
<button class="artigo-acao" data-copiar-link type="button"><i aria-hidden="true" class="fa-solid fa-link"></i><span>Copiar link</span></button>
</div>`)
      .replaceAll('{{CITAR}}', () => citar)
      .replaceAll('{{OUTROS}}', () => blocoOutros);

    await salvar(arquivo, html);
  }

  for (const f of await readdir(RAIZ)) {
    if (/^artigo-.+\.html$/.test(f) && !gerados.has(f)) await apagar(f);
  }
  return artigos;
}


/* =====================================================================
   FORMAÇÕES
   =====================================================================
   Uma formação publicada aparece em SETE lugares. Este bloco é o que
   garante que criar um curso no painel atualize todos eles de uma vez:

     1. o menu suspenso "Formações" da navbar, em todas as páginas
     2. a lista de Formações do menu do celular, em todas as páginas
     3. a coluna "Formações" do rodapé, em todas as páginas
     4. a pilha de cards da Home (era um carrossel com bolinhas até 20/10/2026)
     5. o catálogo de formacoes.html (e o título fixo do catálogo)
     6. os dados estruturados de formacoes.html (o ItemList do Google)
     7. a página própria do curso, formacao-<slug>.html
        + o bloco "Outras formações" no fim de cada uma delas
   ===================================================================== */

/* Páginas fixas do site. As formacao-*.html e noticia-*.html ficam de fora
   porque são geradas (e recebem as regiões no momento em que nascem). */
const PAGINAS_FIXAS = [
  'index.html', 'formacoes.html', 'o-instituto.html', 'como-atuamos.html',
  'praticas-restaurativas.html', 'ibpr-em-movimento.html', 'artigos.html', 'area-do-aluno.html',
  'politica-de-privacidade.html',
  'build/templates/noticia.html', 'build/templates/formacao.html', 'build/templates/artigo.html'
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

/* Visual novo (19/10/2026): cada bloco é um "capítulo" numerado (01, 02...)
   com um anel que se desenha no scroll (curso.js), e o cartão lateral tem
   um índice com os mesmos capítulos. Por isso cada bloco aqui devolve, além
   do HTML, o id e o título: a numeração e o índice saem da lista dos blocos
   que EXISTEM nesta formação. Bloco sem conteúdo some, e os números dos
   seguintes sobem junto, sem buraco ("01, 02, 04").

   Os títulos dos capítulos são fixos, do desenho, como já eram antes. */

const ANEL = '<svg class="curso-anel" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" pathLength="1"/></svg>';
const CHECK = '<svg class="curso-check" viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle class="curso-check__aro" cx="12" cy="12" r="10.5" pathLength="1"/>' +
  '<path class="curso-check__traco" d="M7.4 12.4l3.1 3.1 6.1-6.6" pathLength="1"/></svg>';
const TRACO_TOPICO = '<svg class="curso-topicos__traco" viewBox="0 0 16 6" aria-hidden="true"><path d="M1 3.5 C 5 1.5, 10 5, 15 2.5" pathLength="1"/></svg>';

function dois(n) { return String(n).padStart(2, '0'); }

function tituloCapitulo(n, titulo) {
  return `<h2 class="curso-cap__titulo"><span class="curso-cap__num" aria-hidden="true">${ANEL}<span>${dois(n)}</span></span>` +
    `<span class="curso-cap__txt">${esc(titulo)}</span></h2>`;
}

function checks(itens) {
  return itens.map((t, i) => `<li style="--i:${i}">${CHECK}<span class="curso-checks__txt">${esc(t)}</span></li>`).join('\n');
}

/* Cada bloco recebe a formação e o número do capítulo, e devolve o HTML ou
   '' quando não tem o que mostrar. */
/* As páginas de formação publicadas nesta rodada (preenchido em gerarFormacoes). */
let FORMACOES_NO_AR = null;

const CAPITULOS = [
  { id: 'desenvolver', titulo: 'O que você vai desenvolver', bloco(f, n) {
    const itens = lista(f.desenvolver);
    if (!itens.length) return '';
    return `<section class="curso-cap" id="desenvolver" data-cap aria-label="${esc(this.titulo)}">
${tituloCapitulo(n, this.titulo)}
<ul class="curso-checks curso-checks--2col">
${checks(itens)}
</ul>
</section>`;
  } },

  { id: 'para-quem', titulo: 'Para quem é', atalho: true, bloco(f, n) {
    const itens = lista(f.para_quem);
    if (!itens.length) return '';
    return `<section class="curso-cap" id="para-quem" data-cap aria-label="${esc(this.titulo)}">
${tituloCapitulo(n, this.titulo)}
<ul class="curso-publico">
${itens.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('\n')}
</ul>
</section>`;
  } },

  /* O fio desenhado liga até 3 eixos (é o desenho de 3 colunas); com outra
     quantidade os cartões aparecem igual, só o fio fica de fora. */
  { id: 'eixos', titulo: 'Os eixos da formação', atalho: true, bloco(f, n) {
    const itens = lista(f.eixos).filter(e => e && e.chave);
    if (!itens.length) return '';
    const fio = itens.length === 3
      ? `<svg class="curso-eixos__fio" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
<path class="curso-eixos__base" d="M167 100 C 167 34, 255 10, 333 24 S 480 58, 500 100 C 500 34, 588 10, 667 24 S 813 58, 833 100"/>
<path class="curso-eixos__tinta" d="M167 100 C 167 34, 255 10, 333 24 S 480 58, 500 100 C 500 34, 588 10, 667 24 S 813 58, 833 100"/>
</svg>\n`
      : '';
    return `<section class="curso-cap" id="eixos" data-cap aria-label="${esc(this.titulo)}">
${tituloCapitulo(n, this.titulo)}
<div class="curso-eixos-palco">
${fio}<ol class="curso-eixos">
${itens.map((e, i) => `<li class="curso-eixo" style="--i:${i}"><div class="curso-eixo__face">` +
      `<span class="curso-eixo__num" aria-hidden="true">${dois(i + 1)}</span>` +
      `<span class="curso-eixo__chave">${esc(e.chave)}</span>` +
      `<span class="curso-eixo__frase">${esc(e.frase || '')}</span>` +
      `<span class="curso-eixo__desc">${esc(e.desc || '')}</span></div></li>`).join('\n')}
</ol>
</div>
</section>`;
  } },

  { id: 'conteudo-programa', titulo: 'Conteúdo do programa', atalho: true, bloco(f, n) {
    const itens = lista(f.modulos).filter(m => m && m.titulo);
    if (!itens.length) return '';
    return `<section class="curso-cap" id="conteudo-programa" data-cap aria-label="${esc(this.titulo)}">
${tituloCapitulo(n, this.titulo)}
<div class="course-modules curso-modulos" id="course-modules">
<div class="course-modules__bar">
<p class="course-modules__count">${plural(itens.length, 'módulo', 'módulos')}</p>
<button type="button" class="course-modules__toggle" data-accordion-toggle aria-expanded="false">Expandir todos</button>
</div>
<div class="curso-modulos__pilha">
${itens.map((m, i) => {
      const tops = lista(m.topicos);
      return `<details class="accordion curso-modulo" style="--i:${i}">
<summary class="accordion__summary"><span class="curso-modulo__num" aria-hidden="true">${dois(i + 1)}</span>` +
        `<span class="accordion__label">${esc(m.titulo)}</span><span class="accordion__meta">${plural(tops.length, 'tópico', 'tópicos')}</span>` +
        `<span class="curso-modulo__mais" aria-hidden="true"></span></summary>
<div class="accordion__content">
<ul class="curso-topicos">
${tops.map((t, j) => `<li style="--i:${j}">${TRACO_TOPICO}${esc(t)}</li>`).join('\n')}
</ul>
</div>
</details>`;
    }).join('\n')}
</div>
</div>
</section>`;
  } },

  { id: 'fundamento', titulo: 'Fundamento da formação', atalho: true, bloco(f, n) {
    const paras = String(f.fundamento || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (!paras.length) return '';
    return `<section class="curso-cap" id="fundamento" data-cap aria-label="${esc(this.titulo)}">
${tituloCapitulo(n, this.titulo)}
<div class="curso-fundamento">
${paras.map(p => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`).join('\n')}
</div>
</section>`;
  } },

  { id: 'resultados', titulo: 'O que sua instituição será capaz de implementar', bloco(f, n) {
    const itens = lista(f.resultados);
    if (!itens.length) return '';
    const intro = f.resultados_intro ? `<p class="curso-resultado__intro">${esc(f.resultados_intro)}</p>\n` : '';
    return `<section class="curso-cap curso-cap--resultado" id="resultados" data-cap aria-label="${esc(this.titulo)}">
<div class="curso-resultado">
${tituloCapitulo(n, this.titulo)}
${intro}<ul class="curso-checks">
${checks(itens)}
</ul>
</div>
</section>`;
  } },

  /* Tema com link vira o cartão com seta; sem link (ou com link recusado
     pelo urlSegura), o mesmo cartão sem a seta e sem ser clicável. Link pra
     uma formação que não está publicada (despublicada no painel) também perde
     o link: a página dela foi apagada e o tema levaria pra um 404. */
  { id: 'temas', titulo: 'Temas relacionados', bloco(f, n) {
    const itens = lista(f.temas_relacionados).filter(t => t && t.texto);
    if (!itens.length) return '';
    const destino = t => {
      const h = urlSegura(t.href);
      const curso = /^(formacao-[a-z0-9-]+\.html)(#.*)?$/.exec(h);
      return curso && FORMACOES_NO_AR && !FORMACOES_NO_AR.has(curso[1]) ? '' : h;
    };
    return `<section class="curso-cap" id="temas" data-cap aria-label="${esc(this.titulo)}">
${tituloCapitulo(n, this.titulo)}
<ul class="curso-temas">
${itens.map((t, i) => destino(t)
      ? `<li style="--i:${i}"><a class="curso-tema" href="${esc(destino(t))}"><span>${esc(t.texto)}</span><span class="link-seta__circ" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span></a></li>`
      : `<li style="--i:${i}"><span class="curso-tema"><span>${esc(t.texto)}</span></span></li>`).join('\n')}
</ul>
</section>`;
  } }
];

/* Bloco que ficou sem conteúdo simplesmente não aparece na página.
   Ordem (14/10/2026): o que decide a inscrição vem primeiro ("Para quem é"
   logo depois do "O que você vai desenvolver"; antes era o 6º de 7 blocos)
   e "Temas relacionados", que são links pra fora da página, vai pro fim.
   Devolve os capítulos que existem, já numerados: { id, titulo, atalho, html }. */
function capitulosDoCurso(f) {
  const saida = [];
  for (const c of CAPITULOS) {
    const html = c.bloco(f, saida.length + 1);
    if (html) saida.push({ id: c.id, titulo: c.titulo, atalho: !!c.atalho, html });
  }
  return saida;
}

/* Índice do cartão lateral: um ponto por capítulo, com o número e o nome
   pro leitor de tela (o curso.js mostra o nome do capítulo atual). */
function indiceDoCurso(caps) {
  return caps.map((c, i) =>
    `<li><a href="#${c.id}" data-indice="${i}" aria-label="${dois(i + 1)} · ${esc(c.titulo)}"></a></li>`).join('\n');
}

/* Atalhos no topo: os capítulos do meio da página (o primeiro já aparece
   logo abaixo do topo; o resultado e os temas ficam pro fim da leitura). */
function atalhosDoCurso(caps) {
  const itens = caps.filter(c => c.atalho);
  if (!itens.length) return '';
  return `<nav aria-label="Seções desta página" class="hero-interna__atalhos">
${itens.map(c => `<a class="hero-interna__atalho" href="#${c.id}">${esc(c.titulo)}</a>`).join('\n')}
</nav>\n`;
}

/* Foto do topo (visual novo): <picture> com a WebP e o JPG, em caminho
   RELATIVO. Antes era background de CSS e precisava de endereço absoluto
   (o url() de um .css resolve a partir do arquivo .css, não da página);
   agora é um <img> de verdade, que resolve a partir da página.
   Foto do repositório perde o "?v=2" do banco: o visual novo trocou as
   fotos de nome e não depende mais dele. Foto do painel (Supabase) passa
   como veio, sem WebP, com as medidas lidas do começo do arquivo. */
function heroDoCurso(f) {
  const bruta = String(f.imagem_hero_url || IMAGEM_PADRAO);
  const local = !/^https?:\/\//i.test(bruta);
  const jpg = local ? bruta.replace(/^\/+/, '').split('?')[0] : bruta;
  const webp = local ? web(jpg) : jpg;
  const temWebp = local && webp !== jpg;
  const medidas = medidasDe(jpg);
  return {
    foto: `<picture class="hero-interna__bg">
${temWebp ? `<source srcset="${esc(webp)}" type="image/webp"/>\n` : ''}<img alt="" decoding="async" fetchpriority="high"${medidas ? ` height="${medidas.altura}"` : ''} src="${esc(jpg)}"${medidas ? ` width="${medidas.largura}"` : ''}/>
</picture>`,
    preload: `<link as="image" fetchpriority="high" href="${esc(temWebp ? webp : jpg)}" rel="preload"${temWebp ? ' type="image/webp"' : ''}/>`
  };
}


/* --- o card, usado na Home, no catálogo e em "outras formações" ----- */

/* Card do visual novo (15/10/2026, pilha estilo clay.com): cada card prende
   no topo e o próximo sobe por cima. O pilha.js lê a posição na pilha pelo
   --i do style, por isso ele recomeça do 0 em cada lista. Já o "Formação 01"
   do selo é a posição do curso no catálogo inteiro (a ordem do painel), pra
   que o mesmo curso tenha o mesmo número na Home, no catálogo e no "Outras
   formações" de cada curso.
     `posicao`   índice na pilha (vira --i)
     `numero`    posição no catálogo, começando em 1
     `verTodas`  o botão claro "Ver todas"; sai no próprio catálogo */
function cardFormacao(f, { posicao, numero, verTodas = true }) {
  const { modulos, topicos } = contagem(f);
  const arq = esc(arquivoFormacao(f));
  const seta = '<i aria-hidden="true" class="fa-solid fa-arrow-right"></i>';
  const conteudo = modulos
    ? `<span class="fcard__conteudo"><span><i aria-hidden="true" class="fa-solid fa-layer-group"></i><strong>${modulos}</strong> ${modulos === 1 ? 'módulo' : 'módulos'}</span>` +
      `<span aria-hidden="true" class="fcard__sep">·</span>` +
      `<span><i aria-hidden="true" class="fa-solid fa-book-open"></i><strong>${topicos}</strong> ${topicos === 1 ? 'tópico' : 'tópicos'}</span></span>`
    : '';
  const meta = modulos
    ? `<p class="fcard__meta"><span><i aria-hidden="true" class="fa-solid fa-layer-group"></i>${plural(modulos, 'módulo', 'módulos')}</span><span><i aria-hidden="true" class="fa-solid fa-book-open"></i>${plural(topicos, 'tópico', 'tópicos')}</span></p>\n`
    : '';

  return `<article class="fcard" style="--i:${posicao}">
<div class="fcard__corpo">
<p class="fcard__selo"><span>Formação ${String(numero).padStart(2, '0')}</span>${conteudo}</p>
<h3 class="fcard__titulo"><a href="${arq}">${esc(tituloCurto(f))}</a></h3>
${f.publico_curto ? `<p class="fcard__publico">${esc(f.publico_curto)}</p>\n` : ''}<p class="fcard__desc">${esc(f.resumo || '')}</p>
${meta}<div class="fcard__acoes"><a class="fcard__btn" href="${arq}">Conhecer a formação ${seta}</a>${verTodas ? '<a class="fcard__btn fcard__btn--claro" href="formacoes.html">Ver todas</a>' : ''}</div>
</div>
<div class="fcard__foto"><img alt="${esc(f.imagem_card_alt || '')}" decoding="async"${attrAltura(web(f.imagem_card_url))} loading="lazy" src="${esc(web(f.imagem_card_url || ''))}"${attrLargura(web(f.imagem_card_url))}/></div>
<span aria-hidden="true" class="fcard__veu"></span>
</article>`;
}


/* --- as regiões de menu, iguais em todas as páginas ----------------- */

/* `atual` é o nome do arquivo que está sendo gerado, pra marcar o item do
   menu com aria-current="page" (o leitor de tela anuncia "página atual"). */
function regiaoNavbar(formacoes, atual) {
  const marca = arq => (arq === atual ? 'aria-current="page" ' : '');

  // Item do menu (18/09/2026): ícone da área + título + público em uma
  // linha, tudo do banco (area_icone, publico_curto). Sem publico_curto, a
  // linha de baixo cai fora e o item fica só com o título.
  const itens = formacoes.map(f => {
    const arq = arquivoFormacao(f);
    const desc = f.publico_curto ? `<span class="navbar__dropdown-desc">${esc(f.publico_curto)}</span>` : '';
    return `<li><a ${marca(arq)}class="navbar__dropdown-link" href="${esc(arq)}">` +
      `<span aria-hidden="true" class="navbar__dropdown-icon"><i class="fa-solid ${esc(f.area_icone || 'fa-graduation-cap')}"></i></span>` +
      `<span class="navbar__dropdown-text"><span class="navbar__dropdown-title">${esc(tituloCurto(f))}</span>${desc}</span>` +
      `<span aria-hidden="true" class="navbar__dropdown-seta"><i class="fa-solid fa-arrow-right"></i></span></a></li>`;
  });
  itens.push(`<li><a ${marca('formacoes.html')}class="navbar__dropdown-link navbar__dropdown-link--all" href="formacoes.html">Ver todas as formações <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></li>`);
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
    description: 'Curso on-line com aulas gravadas.'
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

  await prepararMedidas(formacoes.flatMap(f => [f.imagem_card_url, f.imagem_hero_url]));
  FORMACOES_NO_AR = new Set(formacoes.map(arquivoFormacao));

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
    formacoes.map((f, i) => cardFormacao(f, { posicao: i, numero: i + 1 })).join('\n'));
  /* A região formacoes-home-dots saiu em 20/10/2026: no visual novo os
     cards da Home ficam em pilha (cada um prende no topo e o próximo sobe
     por cima), sem carrossel e portanto sem bolinhas. Continuar gerando
     faria o build abortar por falta do marcador. */
  await salvar('index.html', home);

  // --- 5 e 6: catálogo e dados estruturados de formacoes.html ---
  let cat = aplicarMenus(await ler('formacoes.html'), formacoes, 'formacoes.html');
  // 17/09/2026, Word do Dr. Decildo: o título deixou de contar as formações
  // ("As quatro formações do Instituto") e virou fixo. A região continua
  // gerada pra manter o marcador; EXTENSO fica pra outros usos.
  const titulo = 'Formações para diferentes contextos';
  cat = trocarRegiao(cat, 'formacoes-catalogo-titulo', `<h2 class="catalogo__titulo">${esc(titulo)}</h2>`);
  cat = trocarRegiao(cat, 'formacoes-catalogo',
    formacoes.map((f, i) => cardFormacao(f, { posicao: i, numero: i + 1, verTodas: false })).join('\n'));
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

    const caps = capitulosDoCurso(f);
    const hero = heroDoCurso(f);

    let html = molde
      .replaceAll('{{TITULO}}', () => esc(f.titulo))
      .replaceAll('{{SUBTITULO}}', () => esc(f.subtitulo || ''))
      .replaceAll('{{META_DESC}}', () => esc(f.meta_descricao || f.resumo || ''))
      .replaceAll('{{URL}}', () => esc(`${SITE}/${arquivo}`))
      // og:image e twitter:image continuam ABSOLUTOS e no JPG: os robôs de
      // prévia (WhatsApp, LinkedIn) não resolvem caminho relativo nem
      // aceitam WebP em todo lugar.
      .replaceAll('{{IMAGEM_ABS}}', () => esc(absoluto(f.imagem_hero_url || IMAGEM_PADRAO)))
      .replaceAll('{{PRELOAD}}', () => hero.preload)
      .replaceAll('{{HERO_FOTO}}', () => hero.foto)
      /* Placeholder da foto do topo (ver build/dev/lqip.py). Só existe pras
         fotos do repositório; foto enviada pelo painel cai em "none", e a
         página mostra o gradiente azul até a foto chegar, como antes. */
      .replaceAll('{{LQIP}}', () => lqipDe(f.imagem_hero_url || IMAGEM_PADRAO))
      .replaceAll('{{SELO_AREA}}', () => f.area ? `<span class="citacao-selo">${esc(f.area)}</span>\n` : '')
      .replaceAll('{{ATALHOS}}', () => atalhosDoCurso(caps))
      .replaceAll('{{INDICE}}', () => indiceDoCurso(caps))
      .replaceAll('{{INDICE_PRIMEIRO}}', () => esc(caps.length ? caps[0].titulo : ''))
      /* Sem endereço da Hotmart, o botão NÃO vira um link pra "#": clicar e
         não acontecer nada é pior do que ver que ainda não está disponível,
         ainda mais no botão que fecha a venda. Mesmo tratamento que a Área
         do Aluno já dava ao "Entrar na plataforma". */
      .replaceAll('{{BOTAO_CURSO}}', () => urlSegura(f.link_curso)
        ? `<a class="btn btn--dark curso-cartao__btn" href="${esc(urlSegura(f.link_curso))}">Ir para o curso <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>`
        : '<button class="btn btn--dark curso-cartao__btn" type="button" aria-disabled="true" title="Inscrições ainda não abertas para esta formação">Inscrições em breve</button>')
      .replaceAll('{{JSONLD}}', () => jsonldCurso(f))
      .replaceAll('{{BLOCOS}}', () => caps.map(c => c.html).join('\n\n'))
      .replaceAll('{{OUTRAS}}', () => outras.map((o, i) =>
        cardFormacao(o, { posicao: i, numero: formacoes.indexOf(o) + 1 })).join('\n'));

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

/* --- medidas das fotos (width/height no <img>) ----------------------
   width/height no <img> não é estilo: é a reserva de espaço que impede a
   página de "pular" enquanto a foto carrega (CLS). O build lê as medidas do
   CABEÇALHO do arquivo, sem biblioteca (o build não tem dependências):
   JPEG (marcador SOF), PNG (bloco IHDR) e WebP (VP8, VP8L, VP8X).

   Foto do repositório: lida do disco. Foto enviada pelo painel (Supabase
   Storage, 20/10/2026): baixa só o começo do arquivo (até 256 KB, onde o
   cabeçalho sempre está), com tempo curto; uma vez por endereço por rodada.
   Qualquer falha (rede, arquivo estranho) devolve null e o <img> sai sem
   medidas, como era antes: a foto aparece igual, só sem a reserva. */
const MEDIDAS = new Map();
const LIMITE_CABECALHO = 256 * 1024;

/* Medidas das fotos remotas já lidas, guardadas em build/medidas.json.
   Por quê: se numa rodada o Storage não responder a tempo, a foto sairia
   sem width/height e o robô commitaria a página "sem medidas", e na rodada
   seguinte "com medidas" de novo, um vai e volta sem fim. Com o arquivo, a
   medida lida uma vez vale pra sempre (a foto enviada pelo painel ganha nome
   novo a cada envio, então o endereço nunca muda de conteúdo). */
let MEDIDAS_SALVAS = {};
try { MEDIDAS_SALVAS = JSON.parse(await readFile(path.join(RAIZ, 'build/medidas.json'), 'utf8')); } catch { MEDIDAS_SALVAS = {}; }
let medidasNovas = false;

function medidasDeBuffer(b) {
  if (!b || b.length < 24) return null;
  // PNG: assinatura de 8 bytes, depois o IHDR com largura e altura
  if (b.readUInt32BE(0) === 0x89504e47 && b.toString('ascii', 12, 16) === 'IHDR') {
    return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20) };
  }
  // WebP
  if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8X') return { largura: 1 + b.readUIntLE(24, 3), altura: 1 + b.readUIntLE(27, 3) };
    if (tipo === 'VP8 ') return { largura: b.readUInt16LE(26) & 0x3fff, altura: b.readUInt16LE(28) & 0x3fff };
    if (tipo === 'VP8L') {
      const v = b.readUInt32LE(21);
      return { largura: 1 + (v & 0x3fff), altura: 1 + ((v >> 14) & 0x3fff) };
    }
    return null;
  }
  // JPEG: anda de segmento em segmento até o SOF (o quadro com o tamanho)
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { altura: b.readUInt16BE(i + 5), largura: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/* Caminho de foto do próprio site ("assets/images/x.jpg?v=2" vira
   "assets/images/x.jpg"), ou null. Só pasta assets/, nunca "..": o build
   não abre arquivo fora dela por causa de um texto vindo do banco. */
function caminhoLocal(url) {
  const rel = String(url || '').replace(/^\/+/, '').split('?')[0];
  return /^assets\/[\w/.-]+$/.test(rel) && !rel.includes('..') ? rel : null;
}

function medidasLocal(rel) {
  try { return medidasDeBuffer(readFileSync(path.join(RAIZ, rel))); } catch { return null; }
}

async function medidasRemota(url) {
  try {
    const resp = await fetch(url, {
      headers: { Range: `bytes=0-${LIMITE_CABECALHO - 1}` },
      signal: AbortSignal.timeout(6000)
    });
    if (!resp.ok || !resp.body) return null;
    // lê no máximo LIMITE_CABECALHO, mesmo que o servidor ignore o Range
    const pedacos = [];
    let total = 0;
    for await (const p of resp.body) {
      pedacos.push(Buffer.from(p)); total += p.length;
      if (total >= LIMITE_CABECALHO) break;
    }
    return medidasDeBuffer(Buffer.concat(pedacos));
  } catch { return null; }
}

/* Mede de uma vez as fotos remotas que a etapa vai usar (as locais são
   lidas na hora, do disco). Depois disso medidasDe() responde sem esperar. */
async function prepararMedidas(urls) {
  for (const u of new Set(urls.filter(Boolean).map(String))) {
    if (MEDIDAS.has(u) || caminhoLocal(u)) continue;
    if (MEDIDAS_SALVAS[u]) { MEDIDAS.set(u, MEDIDAS_SALVAS[u]); continue; }
    const m = /^https:\/\//i.test(u) ? await medidasRemota(u) : null;
    MEDIDAS.set(u, m);
    if (m) { MEDIDAS_SALVAS[u] = m; medidasNovas = true; }
  }
}

function medidasDe(url) {
  const u = String(url || '');
  if (!MEDIDAS.has(u)) {
    const rel = caminhoLocal(u);
    MEDIDAS.set(u, rel ? medidasLocal(rel) : null);
  }
  return MEDIDAS.get(u);
}

/* Os dois pedaços do <img>, na ordem alfabética de atributos que o site usa
   (height depois de decoding, width depois de src). */
function attrAltura(url)  { const m = medidasDe(url); return m ? ` height="${m.altura}"` : ''; }
function attrLargura(url) { const m = medidasDe(url); return m ? ` width="${m.largura}"` : ''; }

/* Retrato de corpo recortado (visual novo, 19/10/2026): pra cada foto local
   "assets/images/fundadores/fulano.jpg" existe "fulano-recorte-900.webp" (o
   recorte sem fundo, que encosta no arco do cartão) e "fulano-recorte-cel.webp"
   (o mesmo, menor, pro celular). Foto enviada pelo painel não tem recorte
   (é a foto com fundo): entra inteira, e o cartão ganha a marca
   pessoa-cartao--foto-inteira, que no pessoas.css transforma a foto num
   retrato emoldurado no formato do arco. Quando o recorte for feito e
   salvo com o nome "-recorte-900.webp", ele passa a valer sozinho.
   Busto (21/10/2026): a Fernanda pediu as fotos oficiais de volta, sem o
   corpo estendido por IA. A foto oficial só teve o fundo tirado e foi salva
   como "-busto-900.webp" / "-busto-cel.webp"; o cartão ganha a marca
   pessoa-cartao--busto (a pessoa da cintura pra cima, dentro do arco). O
   recorte de corpo inteiro, se existir, vale antes do busto.
   Devolve { html, inteira, busto }. */
function fotoPessoa(p) {
  const alt = esc(p.foto_alt || p.nome);
  const base = String(p.foto_url || '').replace(/^\/+/, '').split('?')[0].replace(/\.(jpe?g|png|webp)$/i, '');
  // Só caminho do próprio site, sem "..": o build não abre arquivo fora da pasta de imagens.
  const local = /^assets\/images\/[a-z0-9/_-]+$/i.test(base) && !base.includes('..');
  for (const tipo of ['recorte', 'busto']) {
    const grande = local ? medidasLocal(`${base}-${tipo}-900.webp`) : null;
    if (!grande) continue;
    const cel = medidasLocal(`${base}-${tipo}-cel.webp`);
    const srcset = cel
      ? ` srcset="${esc(base)}-${tipo}-cel.webp ${cel.largura}w, ${esc(base)}-${tipo}-900.webp ${grande.largura}w"`
      : '';
    return { inteira: false, busto: tipo === 'busto', html: `<img alt="${alt}" decoding="async" height="${grande.altura}" loading="lazy" sizes="(max-width: 767px) 80vw, 40vw" src="${esc(base)}-${tipo}-900.webp"${srcset} width="${grande.largura}"/>` };
  }
  if (!p.foto_url) return { inteira: false, html: '' };
  /* Medidas: as que o banco guardou; sem elas, as lidas do arquivo. */
  const src = web(p.foto_url);
  const temBanco = p.foto_largura && p.foto_altura;
  const altura = temBanco ? ` height="${esc(p.foto_altura)}"` : attrAltura(src);
  const largura = temBanco ? ` width="${esc(p.foto_largura)}"` : attrLargura(src);
  return { inteira: true, html: `<img alt="${alt}" decoding="async"${altura} loading="lazy" src="${esc(src)}"${largura}/>` };
}

/* Um cartão de pessoa (visual novo, 19/10/2026): texto de um lado, retrato
   no arco do outro; um sim, um não, o cartão espelha (--invertido), e a
   contagem recomeça em cada lista. `naHome` é a prévia: lá não há sanfona
   da trajetória, e sim o link "Conhecer a trajetória" pra página do
   Instituto. */
function cartaoPessoa(p, i, naHome) {
  const cargo = p.cargo
    ? `<div class="fcard__selo"><span>${esc(p.cargo)}</span></div>\n` : '';

  const paras = naHome ? [] : lista(p.trajetoria).filter(Boolean);
  const trajetoria = paras.length
    ? `\n<details class="accordion">
<summary class="accordion__summary">Conheça a trajetória <i aria-hidden="true" class="fa-solid fa-chevron-down"></i></summary>
<div class="accordion__content">
${paras.map(t => `<p>${textoRico(t)}</p>`).join('\n')}
</div>
</details>`
    : '';
  const link = naHome
    ? `\n<a class="link-seta pessoa-cartao__link" href="o-instituto.html"><span>Conhecer a trajetória</span><span aria-hidden="true" class="link-seta__circ"><i class="fa-solid fa-arrow-right"></i></span></a>`
    : '';

  const foto = fotoPessoa(p);
  // A linha em branco antes do </article> na Home é a que já estava no
  // HTML aprovado; mantida pra que o build não reescreva a página à toa.
  return `<article class="founder pessoa-cartao${foto.inteira ? ' pessoa-cartao--foto-inteira' : ''}${foto.busto ? ' pessoa-cartao--busto' : ''}${i % 2 ? ' pessoa-cartao--invertido' : ''}" data-aos="fade-up">
<div class="pessoa-cartao__texto">
${cargo}<h3 class="founder__name">${esc(p.nome)}</h3>
<p class="founder__bio">${textoRico(p.bio)}</p>${trajetoria}${link}
</div>
<span aria-hidden="true" class="pessoa-cartao__arco"></span>
<span aria-hidden="true" class="pessoa-cartao__orbita"><i></i></span>
<div class="pessoa-cartao__foto">
${foto.html}
</div>
${naHome ? '\n' : ''}</article>`;
}

/* A lista. O separador de sementes entre uma pessoa e outra saiu no visual
   novo: os cartões espelhados já separam um do outro. */
function listaPessoas(pessoas, naHome) {
  return pessoas.map((p, i) => cartaoPessoa(p, i, naHome)).join('\n');
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

  await prepararMedidas(pessoas.filter(p => !(p.foto_largura && p.foto_altura)).map(p => web(p.foto_url)));

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
    listaPessoas(naHome.length ? naHome : direcao, true));
  await salvar('index.html', home);

  /* --- O Instituto: os dois blocos --- */
  let inst = await ler('o-instituto.html');
  inst = trocarRegiao(inst, 'pessoas-direcao', listaPessoas(direcao, false));

  /* O bloco da rede vem com o próprio título: sem ninguém nele, o título
     iria junto, em vez de sobrar sozinho em cima do vazio. */
  inst = trocarRegiao(inst, 'pessoas-rede', rede.length
    ? `<div class="section-header founders__header founders__subhead" data-aos="fade-up">
<h2 class="founders__titulo">Quem já se juntou a este propósito</h2>
</div>
<div class="founders__list">
${listaPessoas(rede, false)}
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

/* O miolo atual de um marcador inline, ou null se ele não existe. */
function trechoInline(html, nome) {
  const abre = `<!-- CMS:${nome} -->`;
  const i = html.indexOf(abre);
  const f = html.indexOf(`<!-- /CMS:${nome} -->`);
  return (i === -1 || f === -1 || f < i) ? null : html.slice(i + abre.length, f);
}

/* O texto que a pessoa lê: sem tags, com as entidades básicas desfeitas e
   os espaços normalizados. É a régua pra saber se o banco mudou alguma coisa. */
function textoVisivel(h) {
  return String(h).replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/* Reaplica no título novo os <span class="..__destaque"> do título antigo,
   quando as palavras destacadas continuam lá. Só o texto puro do destaque
   (sem tag dentro) é procurado, e só fora de tag, na 1ª ocorrência. A
   classe vem do próprio HTML da página, nunca do banco. */
function reaplicarDestaques(antigo, novo) {
  for (const [, classe, trecho] of antigo.matchAll(/<span class="([a-z0-9_ -]*__destaque)">([^<]+)<\/span>/g)) {
    const partes = novo.split(/(<[^>]*>)/);
    const k = partes.findIndex((p, j) => j % 2 === 0 && p.includes(trecho));
    if (k === -1) continue;
    partes[k] = partes[k].replace(trecho, () => `<span class="${classe}">${trecho}</span>`);
    novo = partes.join('');
  }
  return novo;
}

/* Títulos que o desenho quebra em linhas (20/10/2026): o "Da produção do
   conhecimento / à transformação institucional" da Abordagem é escrito como
   dois <span class="abordagem__linha-t">, um por linha, e a animação entra
   linha a linha. Se o Instituto mudar o título, o texto novo é dividido no
   mesmo número de linhas, no ponto natural mais perto do meio: depois de
   vírgula, ou antes de " e ", " de ", " da(s) ", " do(s) ", " à(s) ", " ao(s) ",
   " para " (o "à" é onde o título aprovado quebra). Sem
   ponto natural perto, no espaço mais perto do meio. Texto bem mais longo que o
   aprovado ganha uma linha a mais (ver a régua abaixo). Nenhuma palavra muda; o
   espaço onde a linha quebra vira o espaço entre os dois <span>, como já era.
   Nunca quebra dentro de uma tag ou de um destaque. */
function reaplicarLinhas(antigo, novo) {
  const m = /^\s*<span class="([a-z0-9_-]*__linha[a-z0-9_-]*)">/.exec(antigo);
  if (!m) return novo;
  const classe = m[1];
  const linhasAntigas = antigo.split(`<span class="${classe}">`).slice(1);
  if (linhasAntigas.length < 2) return novo;
  /* A linha mais comprida do título aprovado é a régua: no computador cada
     linha é "white-space: nowrap", então uma linha bem maior que ela vazaria
     da coluna. Texto novo mais longo ganha mais linhas (mesma classe, mesma
     estrutura), em vez de linhas compridas demais. */
  const regua = Math.max(...linhasAntigas.map(l => textoVisivel(l.replace(/<\/span>\s*$/, '')).length));

  // Espaços onde dá pra quebrar: fora de tag e fora de qualquer <span>/<em>.
  const cortes = [];
  let prof = 0;
  for (let i = 0; i < novo.length; i++) {
    if (novo[i] === '<') {
      const fim = novo.indexOf('>', i);
      const tag = novo.slice(i, fim + 1);
      if (/^<\/(span|em)>/.test(tag)) prof--;
      else if (/^<(span|em)\b/.test(tag)) prof++;
      i = fim;
      continue;
    }
    if (novo[i] === ' ' && prof === 0) {
      const natural = novo[i - 1] === ',' || /^ (e|de|da|do|das|dos|à|às|ao|aos|para) /.test(novo.slice(i, i + 7));
      cortes.push({ i, natural, pos: textoVisivel(novo.slice(0, i)).length });
    }
  }
  const total = textoVisivel(novo).length;

  const dividir = n => {
    const escolhidos = [];
    for (let k = 1; k < n; k++) {
      const alvo = total * k / n;
      const livres = cortes.filter(c => !escolhidos.length || c.i > escolhidos[escolhidos.length - 1].i);
      const perto = lista => lista.sort((a, b) => Math.abs(a.pos - alvo) - Math.abs(b.pos - alvo))[0];
      // ponto natural só vale se não desequilibrar demais (até 1/4 de uma linha do alvo)
      const c = perto(livres.filter(x => x.natural && Math.abs(x.pos - alvo) <= total / n / 4)) || perto(livres);
      if (!c) return null;   // texto curto demais pra tantas linhas
      escolhidos.push(c);
    }
    const partes = [];
    let ini = 0;
    for (const c of escolhidos) { partes.push(novo.slice(ini, c.i)); ini = c.i + 1; }
    partes.push(novo.slice(ini));
    return partes;
  };

  let partes = dividir(linhasAntigas.length);
  if (!partes) return novo;  // fica numa linha só, sem quebra
  const limite = regua * 1.2;   // folga de 20%: a coluna tem sobra à direita
  if (partes.some(p => textoVisivel(p).length > limite)) {
    /* Não coube no número de linhas do desenho: enche cada linha até a
       régua, quebrando no último ponto natural que caiba (ou no último
       espaço que caiba, se o natural deixaria a linha curta demais). */
    const escolhidos = [];
    let inicio = 0;
    while (total - inicio > limite) {
      const cabem = cortes.filter(c => c.pos > inicio && c.pos - inicio <= limite);
      if (!cabem.length) break;
      const naturais = cabem.filter(c => c.natural && c.pos - inicio >= limite * 0.6);
      const c = (naturais.length ? naturais : cabem)[(naturais.length ? naturais : cabem).length - 1];
      escolhidos.push(c);
      inicio = c.pos + 1;
    }
    if (escolhidos.length >= linhasAntigas.length - 1) {
      partes = [];
      let ini = 0;
      for (const c of escolhidos) { partes.push(novo.slice(ini, c.i)); ini = c.i + 1; }
      partes.push(novo.slice(ini));
    }
  }
  return partes.map(p => `<span class="${classe}">${p}</span>`).join(' ');
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

      /* Destaques do visual novo (20/10/2026): alguns títulos ganharam, à
         mão, um <span> que pinta parte da frase ("Conhecimento que <span
         class="hero-interna__destaque">transforma a prática</span>."). O
         banco guarda só o texto, então reescrever o título apagaria o
         destaque a cada publicação. Duas regras, só pra título e linha
         (prosa não tem destaque):
           1. o texto do banco é o mesmo que já se lê na página: o trecho
              fica como está, com o desenho que tiver;
           2. o texto mudou: o título novo é escrito, e o destaque volta se
              as palavras destacadas continuarem na frase. Se o Instituto
              tirou essas palavras, o título sai sem destaque, sem erro. */
      const atual = t.tipo === 'prosa' ? null : trechoInline(html, `texto:${t.chave}`);
      if (atual !== null && textoVisivel(atual) === textoVisivel(miolo)) { trocados++; continue; }
      const final = atual === null ? miolo : reaplicarLinhas(atual, reaplicarDestaques(atual, miolo));

      const novo = trocarRegiaoInline(html, `texto:${t.chave}`, final);
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
   SITEMAP
   =====================================================================
   Gerado no fim de tudo, lendo a pasta: assim a formação nova e a notícia
   nova entram sozinhas, sem ninguém lembrar de editar uma lista.

   Sem <lastmod> de propósito. A data teria que vir da data do arquivo, e
   no GitHub Actions o repositório é clonado do zero a cada execução: a
   data seria sempre "agora", o sitemap mudaria em toda rodada e o robô
   ficaria commitando sozinho pra sempre.
   ===================================================================== */

/* Foto local que tem irmã .webp na mesma pasta (15/10/2026): o site mostra a
   WebP, mais leve; og:image, twitter:image e dados estruturados continuam no
   JPG, porque prévia de link (WhatsApp, redes) nem sempre aceita WebP. Foto
   que veio pelo painel (Supabase) passa direto. */
function web(url) {
  const u = String(url || '');
  const m = /^(\/?)(assets\/images\/.+)\.(jpe?g|png)(\?.*)?$/i.exec(u);
  if (m && existsSync(path.join(RAIZ, m[2] + '.webp'))) return m[1] + m[2] + '.webp' + (m[4] || '');
  return url;
}

const FORA_DO_SITEMAP = new Set(['404.html']);
// A Home entra como "/" (14/10/2026): é pra onde os redirecionamentos levam,
// e o canonical/og:url do index.html também apontam pra "/".

async function gerarSitemap() {
  const paginas = (await readdir(RAIZ))
    .filter(f => f.endsWith('.html') && !f.startsWith('_') && !FORA_DO_SITEMAP.has(f))
    .sort();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginas.map(f => `  <url><loc>${SITE}/${f === 'index.html' ? '' : f}</loc></url>`).join('\n')}
</urlset>
`;

  console.log(`\n== Sitemap: ${paginas.length} páginas`);
  await salvar('sitemap.xml', xml);
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
  const artigos = await gerarArtigos(cfg);
  await gerarNoticias(cfg, artigos);
  await gerarSitemap();
  if (medidasNovas) {
    const ordenado = Object.fromEntries(Object.keys(MEDIDAS_SALVAS).sort().map(k => [k, MEDIDAS_SALVAS[k]]));
    await salvar('build/medidas.json', JSON.stringify(ordenado, null, 2) + '\n');
  }

  console.log(`\nResumo: ${escritos.size} arquivo(s) ${CONFERIR ? 'mudariam' : 'escritos'}, ${apagados} apagado(s).`);
} catch (erro) {
  // Sai com erro SEM ter commitado nada. O Action falha, o site fica como
  // estava, e o problema aparece no log em vez de virar site quebrado.
  console.error('\n✖ Build abortado:', erro.message);
  process.exit(1);
}
