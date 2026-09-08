/* =====================================================================
   IBPR — notícias do "IBPR em Movimento" no site público
   =====================================================================
   Um arquivo, três comportamentos, escolhidos pelo que existe na página:

     #ibpr-movimento-preview  (index.html)          → 3 mais recentes
     #ibpr-movimento-lista    (ibpr-em-movimento)   → todas
     #noticiaArtigo           (noticia.html)        → uma, por ?slug=

   DUAS REGRAS QUE VALEM PRA TUDO AQUI:

   1. Melhoria progressiva nas LISTAGENS. O HTML já vem pronto e correto
      do servidor, mostrando as 3 frentes e o aviso "Primeiras publicações
      em breve". Este script só SUBSTITUI isso quando existe notícia
      publicada de verdade. Supabase desligado, pausado, fora do ar ou
      vazio: ninguém percebe.

   2. Nenhuma tela fica em "Carregando…" pra sempre. A página de leitura
      não tem HTML de reserva (o conteúdo dela só existe no banco), então
      toda falha precisa terminar numa mensagem clara. Por isso todas as
      consultas têm .catch() E prazo máximo de resposta.
   ===================================================================== */

(function () {
  'use strict';

  var IBPR = window.IBPR || {};
  var util = IBPR.util;
  var db = IBPR.db;
  var temBanco = Boolean(IBPR.configurado && db);

  var IMAGEM_PADRAO = 'assets/images/ibpr-movimento-hero.jpg';
  var PRAZO_MS = 8000;   // depois disto, desiste e mostra mensagem

  /* Corta qualquer consulta que demore demais. Sem isto, uma rede que
     não responde (diferente de uma que dá erro) deixa a promessa pendente
     pra sempre — e a tela travada em "Carregando…". */
  function comPrazo(promessa) {
    return Promise.race([
      promessa,
      new Promise(function (_, rejeitar) {
        setTimeout(function () { rejeitar(new Error('tempo esgotado')); }, PRAZO_MS);
      })
    ]);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // A página de leitura SEMPRE tem que chegar a um estado final,
    // com ou sem banco. É a única que não tem conteúdo de reserva.
    if (document.getElementById('noticiaArtigo')) {
      if (temBanco) montarArtigo();
      else finalizarComErro('indisponivel');
      return;
    }

    // Listagens: sem banco, o HTML estático já está bom. Não faz nada.
    if (!temBanco) return;

    if (document.getElementById('ibpr-movimento-preview')) montarSecao('ibpr-movimento-preview', 3);
    if (document.getElementById('ibpr-movimento-lista'))   montarSecao('ibpr-movimento-lista', null);
  });


  /* -------------------------------------------------------------------
     Seções de listagem (Home e página IBPR em Movimento)
     ------------------------------------------------------------------- */
  function montarSecao(idSecao, limite) {
    var secao = document.getElementById(idSecao);

    var consulta = db.from('noticias')
      .select('titulo,slug,resumo,categoria,imagem_url,imagem_alt,publicado_em')
      .eq('status', 'publicado')
      // nullsFirst:false — uma notícia publicada sem data não pode passar
      // na frente das que têm data (em DESC o Postgres põe null primeiro).
      .order('publicado_em', { ascending: false, nullsFirst: false });

    if (limite) consulta = consulta.limit(limite);

    comPrazo(consulta)
      .then(function (r) {
        if (r.error) throw r.error;
        var itens = r.data || [];
        if (!itens.length) return;   // nada publicado → mantém o HTML

        // 1. troca o bloco das 3 frentes pela grade de notícias
        var eixos = secao.querySelector('.course-eixos');
        if (!eixos) return;

        var grade = document.createElement('div');
        // measure-narrow é obrigatório: o cabeçalho e o rodapé da seção
        // usam essa mesma medida (92rem). Sem ela a grade nascia 232px
        // mais larga e 116px à esquerda dos dois, desalinhando a coluna.
        grade.className = 'noticias__grid measure-narrow';
        grade.innerHTML = itens.map(cartao).join('');
        eixos.replaceWith(grade);

        // 2. tira o aviso de "em breve", que deixou de ser verdade
        var aviso = secao.querySelector('.movimento-foot .overline');
        if (aviso) aviso.remove();

        // 3. troca os textos do cabeçalho que só faziam sentido enquanto
        //    não havia publicação. A copy alternativa fica no próprio HTML,
        //    em data-com-noticias, pra continuar editável sem mexer no JS.
        secao.querySelectorAll('[data-com-noticias]').forEach(function (el) {
          el.textContent = el.dataset.comNoticias;
        });
      })
      .catch(function (erro) {
        // Aqui o silêncio é a resposta certa: o visitante continua vendo
        // a seção "em breve", que é apresentável. Só registra no console.
        console.warn('[IBPR] Notícias não carregaram, mantendo o conteúdo estático:', erro.message);
      });
  }

  /* Reaproveita o .service-card das Formações tal e qual — mesma
     geometria, mesma foto 3:2, mesmo hover. Zero CSS novo. */
  function cartao(n) {
    var data = util.formatarData(n.publicado_em);
    var imagem = n.imagem_url || IMAGEM_PADRAO;

    return '' +
      '<article class="service-card">' +
        '<div class="service-card__img-wrap">' +
          '<img alt="' + util.escapar(n.imagem_alt || '') + '" class="service-card__photo" decoding="async" loading="lazy" src="' + util.escapar(imagem) + '"/>' +
        '</div>' +
        '<div class="service-card__body">' +
          '<p class="service-card__audience">' + util.escapar(n.categoria) +
            (data ? ' &middot; ' + data : '') + '</p>' +
          '<h3 class="service-card__title">' + util.escapar(n.titulo) + '</h3>' +
          '<p class="service-card__desc">' + util.escapar(n.resumo || '') + '</p>' +
          '<a class="service-card__link" href="noticia.html?slug=' + encodeURIComponent(n.slug) + '">' +
            'Ler notícia <i aria-hidden="true" class="fa-solid fa-arrow-right"></i>' +
          '</a>' +
        '</div>' +
      '</article>';
  }


  /* -------------------------------------------------------------------
     Página de leitura de uma notícia (noticia.html?slug=...)
     ------------------------------------------------------------------- */
  function montarArtigo() {
    var slug = new URLSearchParams(location.search).get('slug');
    if (!slug) { finalizarComErro('sem-endereco'); return; }

    comPrazo(
      db.from('noticias')
        .select('titulo,resumo,conteudo,categoria,imagem_url,imagem_alt,publicado_em')
        .eq('slug', slug)
        .eq('status', 'publicado')     // rascunho não abre nem por link direto
        .maybeSingle()
    )
      .then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) { finalizarComErro('nao-encontrada'); return; }
        desenharArtigo(r.data);
      })
      .catch(function (erro) {
        console.warn('[IBPR] Falha ao carregar a notícia:', erro.message);
        finalizarComErro('indisponivel');
      });
  }

  function desenharArtigo(n) {
    document.title = n.titulo + ' | IBPR em Movimento';
    document.getElementById('noticiaTitulo').textContent = n.titulo;
    document.getElementById('noticiaMeta').textContent =
      n.categoria + (n.publicado_em ? ' · ' + util.formatarData(n.publicado_em) : '');

    if (n.resumo) document.getElementById('noticiaResumo').textContent = n.resumo;

    if (n.imagem_url) {
      var img = document.getElementById('noticiaImagem');
      img.src = n.imagem_url;
      img.alt = n.imagem_alt || '';
      document.getElementById('noticiaFigura').hidden = false;
    }

    // corpo: parágrafos separados por linha em branco
    document.getElementById('noticiaCorpo').innerHTML = String(n.conteudo || '')
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean)
      .map(function (p) { return '<p>' + util.escapar(p).replace(/\n/g, '<br/>') + '</p>'; })
      .join('');

    document.getElementById('noticiaCarregando').hidden = true;
    document.getElementById('noticiaArtigo').hidden = false;
  }

  /* Três motivos diferentes, três textos. "Não encontrada" e "fora do ar"
     pedem reações diferentes de quem está lendo, e tratar tudo como
     "não encontrada" faria o Instituto parecer ter apagado a notícia
     quando o problema é passageiro. */
  var TEXTOS_ERRO = {
    'nao-encontrada': {
      hero: 'Notícia não encontrada.',
      titulo: 'Notícia não encontrada.',
      texto: 'Ela pode ter sido removida, ou o endereço está incompleto.'
    },
    'sem-endereco': {
      hero: 'Qual notícia?',
      titulo: 'Faltou o endereço da notícia.',
      texto: 'O link veio incompleto. Veja a lista completa das publicações.'
    },
    'indisponivel': {
      hero: 'Conteúdo indisponível.',
      titulo: 'Não foi possível carregar agora.',
      texto: 'Pode ser uma instabilidade momentânea. Tente de novo em alguns instantes.'
    }
  };

  function finalizarComErro(motivo) {
    var t = TEXTOS_ERRO[motivo] || TEXTOS_ERRO['indisponivel'];

    document.getElementById('noticiaTitulo').textContent = t.hero;
    document.getElementById('noticiaMeta').textContent = 'IBPR em Movimento';
    document.getElementById('noticiaErroTitulo').textContent = t.titulo;
    document.getElementById('noticiaErroTexto').textContent = t.texto;

    document.getElementById('noticiaCarregando').hidden = true;
    document.getElementById('noticiaErro').hidden = false;
  }
})();
