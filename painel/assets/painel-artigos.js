/* =====================================================================
   IBPR — Painel administrativo, Etapa 5: Artigos (17/09/2026)
   =====================================================================
   Ponto de entrada:  IBPR.painel.iniciarArtigos()  → painel/artigos.html

   Mesma estrutura do módulo de notícias (dentro de painel.js), com o que
   só um artigo tem:

   1. AUTORES numa caixa de texto em blocos (nome na 1ª linha, credenciais
      nas seguintes, linha em branco entre autores), com prévia embaixo,
      como a trajetória em Pessoas. No banco vira uma lista JSON
      [{nome, credenciais: [...]}].
   2. PALAVRAS-CHAVE separadas por ponto e vírgula → lista JSON.
   3. PDF no mesmo bucket `artigos` da capa (o bucket aceita os dois).
   4. Sem "frente": artigo é sempre Artigo.

   As peças comuns (mensagens na tela, tradução de erro, storage, conta,
   sumário) vêm de IBPR.painel e IBPR.painel.interno.
   ===================================================================== */

(function () {
  'use strict';

  var painel = window.IBPR.painel;
  var interno = painel.interno;
  var $ = interno.$;
  var aviso = interno.aviso;
  var limparAviso = interno.limparAviso;
  var traduzirErro = interno.traduzirErro;
  var fotoNoPainel = interno.fotoNoPainel;
  var util = window.IBPR.util;

  var BUCKET = 'artigos';
  var IMAGEM_MAX = 5 * 1024 * 1024;   // 5 MB (imagem)
  var PDF_MAX = 20 * 1024 * 1024;     // 20 MB (o bucket barra acima disso)


  /* ===================================================================
     AUTORES: texto ⇄ lista. `de` e `para` têm que ser inversos exatos.
     =================================================================== */
  function autoresDeTexto(texto) {
    return String(texto || '').replace(/\r/g, '').split(/\n\s*\n/)
      .map(function (bloco) {
        var linhas = bloco.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        if (!linhas.length) return null;
        return { nome: linhas[0], credenciais: linhas.slice(1) };
      })
      .filter(Boolean);
  }

  function autoresParaTexto(lista) {
    if (!Array.isArray(lista)) return '';
    return lista.map(function (a) {
      if (typeof a === 'string') return a;
      return [a.nome].concat(a.credenciais || []).join('\n');
    }).join('\n\n');
  }

  function palavrasDeTexto(texto) {
    return String(texto || '').split(/;/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function palavrasParaTexto(lista) {
    return Array.isArray(lista) ? lista.join('; ') : '';
  }


  function iniciarArtigos() {
    var db = interno.conectar();
    if (!db) return;

    var imagemEscolhida = null;
    var pdfEscolhido = null;
    var linhas = [];
    var emEdicao = null;

    /* --- porteiro ---------------------------------------------------- */
    db.auth.getSession()
      .then(function (r) {
        var sessao = r.data && r.data.session;
        if (!sessao) { location.replace('index.html'); return; }
        painel.montarConta(sessao);
        carregarLista();
      })
      .catch(function () {
        $('carregando').hidden = true;
        aviso('Não foi possível falar com o servidor. Verifique a internet e recarregue a página.');
      });

    $('btnSair').addEventListener('click', function (e) {
      e.preventDefault();
      db.auth.signOut().then(function () { location.replace('index.html'); });
    });


    /* --- telas -------------------------------------------------------- */
    function mostrarLista() {
      $('telaLista').hidden = false;
      $('telaForm').hidden = true;
      limparAviso();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function mostrarForm(titulo) {
      $('formTitulo').textContent = titulo;
      $('telaLista').hidden = true;
      $('telaForm').hidden = false;
      painel.montarSumario('sumarioArtigo', 'formArtigo', 'Blocos');
      limparAviso();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }


    /* --- lista -------------------------------------------------------- */
    function carregarLista() {
      $('carregando').hidden = false;
      $('listaVazia').hidden = true;
      $('lista').innerHTML = '';

      db.from('artigos')
        .select('*')
        .order('publicado_em', { ascending: false, nullsFirst: false })
        .order('criado_em', { ascending: false })
        .then(function (r) {
          $('carregando').hidden = true;
          if (r.error) { aviso(traduzirErro(r.error)); return; }
          linhas = r.data || [];
          if (!linhas.length) { $('listaVazia').hidden = false; return; }
          $('lista').innerHTML = linhas.map(desenharItem).join('');
        })
        .catch(function (erro) {
          $('carregando').hidden = true;
          aviso(traduzirErro(erro));
        });
    }

    function nomes(a) {
      var lista = Array.isArray(a.autores) ? a.autores : [];
      return lista.map(function (x) { return typeof x === 'string' ? x : x.nome; }).filter(Boolean).join(', ');
    }

    function desenharItem(a) {
      var publicado = a.status === 'publicado';
      var data = util.formatarData(a.publicado_em || a.criado_em);
      var capa = a.imagem_url
        ? '<img alt="" src="' + util.escapar(fotoNoPainel(a.imagem_url)) + '"/>'
        : '<span class="painel-item__icone"><i aria-hidden="true" class="fa-solid fa-book-open"></i></span>';
      var titulo = a.titulo + (a.subtitulo ? ': ' + a.subtitulo : '');

      return '' +
        '<article class="painel-item" data-id="' + util.escapar(a.id) + '">' +
          '<div class="painel-item__foto">' + capa + '</div>' +
          '<div>' +
            '<h2 class="painel-item__titulo">' + util.escapar(titulo) + '</h2>' +
            '<p class="painel-item__meta">' +
              '<span class="selo selo--' + (publicado ? 'publicado' : 'rascunho') + '">' + (publicado ? 'Publicado' : 'Rascunho') + '</span>' +
              (nomes(a) ? '<span>' + util.escapar(nomes(a)) + '</span>' : '') +
              (data ? '<span>' + data + '</span>' : '') +
              (a.pdf_url ? '<span><i aria-hidden="true" class="fa-solid fa-file-pdf"></i> PDF</span>' : '') +
            '</p>' +
            '<div class="painel-item__acoes">' +
              '<button class="btn btn--outline btn--sm" data-acao="editar" type="button">Editar</button>' +
              (publicado
                ? '<button class="btn btn--fantasma btn--sm" data-acao="despublicar" type="button">Despublicar</button>'
                : '<button class="btn btn--dark btn--sm" data-acao="publicar" type="button">Publicar</button>') +
              '<button class="btn btn--perigo btn--sm" data-acao="apagar" type="button">Apagar</button>' +
            '</div>' +
          '</div>' +
        '</article>';
    }

    $('lista').addEventListener('click', function (e) {
      var botao = e.target.closest('[data-acao]');
      if (!botao) return;
      var id = botao.closest('.painel-item').dataset.id;
      var acao = botao.dataset.acao;
      if (acao === 'editar')      abrirEdicao(id);
      if (acao === 'publicar')    alterarStatus(id, 'publicado');
      if (acao === 'despublicar') alterarStatus(id, 'rascunho');
      if (acao === 'apagar')      apagar(id);
    });


    /* --- formulário --------------------------------------------------- */
    $('btnNova').addEventListener('click', function () { limparForm(); mostrarForm('Novo artigo'); });
    $('btnCancelar').addEventListener('click', function () { limparForm(); mostrarLista(); });

    function limparForm() {
      emEdicao = null;
      $('btnRascunho').textContent = 'Salvar rascunho';
      ['artigoId', 'titulo', 'subtitulo', 'resumo', 'palavrasChave', 'corpo', 'autores',
       'doi', 'publicacaoNome', 'publicacaoUrl', 'imagemAlt', 'publicadoEm', 'imagem', 'pdf']
        .forEach(function (id) { $(id).value = ''; });
      $('previa').hidden = true;
      $('pdfAtual').hidden = true;
      $('autoresPrevia').hidden = true;
      imagemEscolhida = null;
      pdfEscolhido = null;
    }

    function abrirEdicao(id) {
      db.from('artigos').select('*').eq('id', id).single().then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        var a = r.data;
        emEdicao = a;
        $('btnRascunho').textContent = (a.status === 'publicado') ? 'Salvar rascunho (tira do site)' : 'Salvar rascunho';

        $('artigoId').value = a.id;
        $('titulo').value = a.titulo || '';
        $('subtitulo').value = a.subtitulo || '';
        $('resumo').value = a.resumo || '';
        $('palavrasChave').value = palavrasParaTexto(a.palavras_chave);
        $('corpo').value = a.corpo || '';
        $('autores').value = autoresParaTexto(a.autores);
        $('doi').value = a.doi || '';
        $('publicacaoNome').value = a.publicacao_nome || '';
        $('publicacaoUrl').value = a.publicacao_url || '';
        $('imagemAlt').value = a.imagem_alt || '';
        $('publicadoEm').value = paraCampoData(a.publicado_em);

        imagemEscolhida = null; pdfEscolhido = null;
        $('imagem').value = ''; $('pdf').value = '';
        if (a.imagem_url) { $('previaImg').src = fotoNoPainel(a.imagem_url); $('previa').hidden = false; }
        else { $('previa').hidden = true; }
        mostrarPdfAtual(a.pdf_url);
        atualizarPreviaAutores();

        mostrarForm('Editar artigo');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }

    function mostrarPdfAtual(url) {
      if (!url) { $('pdfAtual').hidden = true; return; }
      var nome = String(url).split('/').pop().split('?')[0];
      $('pdfAtual').innerHTML = '<i aria-hidden="true" class="fa-solid fa-file-pdf"></i> PDF atual: <a href="' +
        util.escapar(url) + '" rel="noopener" target="_blank">' + util.escapar(decodeURIComponent(nome)) + '</a>. Escolher outro arquivo substitui este.';
      $('pdfAtual').hidden = false;
    }

    function paraCampoData(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      if (isNaN(d)) return '';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function doCampoData(valor) {
      if (!valor) return null;
      var d = new Date(valor + 'T12:00:00');
      return isNaN(d) ? null : d.toISOString();
    }


    /* --- prévia dos autores ----------------------------------------- */
    function atualizarPreviaAutores() {
      var lista = autoresDeTexto($('autores').value);
      var alvo = $('autoresPrevia');
      if (!lista.length) { alvo.hidden = true; alvo.innerHTML = ''; return; }
      alvo.className = 'campo__entendi';
      alvo.hidden = false;
      alvo.innerHTML = '<p class="campo__entendi-titulo">O site entendeu ' + lista.length +
        (lista.length === 1 ? ' autor' : ' autores') + '</p>' +
        lista.map(function (a) {
          return '<p><strong>' + util.escapar(a.nome) + '</strong>' +
            (a.credenciais.length ? '<br/><span style="color:var(--color-mist)">' + a.credenciais.map(util.escapar).join('<br/>') + '</span>' : '') + '</p>';
        }).join('');
    }
    $('autores').addEventListener('input', atualizarPreviaAutores);


    /* --- arquivos escolhidos ---------------------------------------- */
    $('imagem').addEventListener('change', function (e) {
      var original = e.target.files && e.target.files[0];
      if (!original) { imagemEscolhida = null; return; }
      // Reduzida no navegador (até 1800 px, JPEG) antes de subir.
      util.comprimirImagem(original).then(function (f) {
        if (f.size > IMAGEM_MAX) {
          aviso('A imagem tem ' + (f.size / 1048576).toFixed(1) + ' MB mesmo depois de reduzida. O limite é 5 MB.');
          e.target.value = ''; imagemEscolhida = null; return;
        }
        limparAviso();
        imagemEscolhida = f;
        $('previaImg').src = URL.createObjectURL(f);
        $('previa').hidden = false;
      });
    });

    $('pdf').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) { pdfEscolhido = null; return; }
      if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
        aviso('Só PDF é aceito aqui.'); e.target.value = ''; pdfEscolhido = null; return;
      }
      if (f.size > PDF_MAX) {
        aviso('O PDF tem ' + (f.size / 1048576).toFixed(1) + ' MB. O limite é 20 MB.');
        e.target.value = ''; pdfEscolhido = null; return;
      }
      limparAviso();
      pdfEscolhido = f;
    });

    /* Envia um arquivo pro bucket e devolve o endereço público. */
    function enviar(arquivo, slug, sufixo) {
      var ext = (arquivo.name.split('.').pop() || 'bin').toLowerCase();
      var caminho = slug + (sufixo ? '-' + sufixo : '') + '-' + Date.now() + '.' + ext;
      return db.storage.from(BUCKET)
        .upload(caminho, arquivo, { cacheControl: '31536000', upsert: false, contentType: arquivo.type || undefined })
        .then(function (r) {
          if (r.error) throw r.error;
          return db.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        });
    }


    /* --- salvar --------------------------------------------------------- */
    $('btnRascunho').addEventListener('click', function () { salvar('rascunho'); });
    $('btnPublicar').addEventListener('click', function () { salvar('publicado'); });

    function salvar(status) {
      limparAviso();

      if (status === 'rascunho' && emEdicao && emEdicao.status === 'publicado') {
        if (!window.confirm('Este artigo está publicado no site.\n\n' +
              'Salvar como rascunho TIRA ele do ar; as mudanças ficam guardadas só aqui no painel.\n' +
              'Para mudar o texto e continuar no site, use "Publicar no site".\n\n' +
              'Tirar do site mesmo assim?')) {
          return;
        }
      }

      var titulo = $('titulo').value.trim();
      var resumo = $('resumo').value.trim();
      var autores = autoresDeTexto($('autores').value);

      if (!titulo) { aviso('O título é obrigatório.'); $('titulo').focus(); return; }
      if (!resumo) { aviso('O resumo é obrigatório: é o que aparece no card e no topo do artigo.'); $('resumo').focus(); return; }
      if (!autores.length) { aviso('Informe pelo menos um autor (a primeira linha do bloco é o nome).'); $('autores').focus(); return; }

      var id = $('artigoId').value;
      var botoes = [$('btnPublicar'), $('btnRascunho'), $('btnCancelar')];
      botoes.forEach(function (b) { b.disabled = true; });

      var dados = {
        titulo: titulo,
        subtitulo: $('subtitulo').value.trim() || null,
        resumo: resumo,
        palavras_chave: palavrasDeTexto($('palavrasChave').value),
        corpo: $('corpo').value.trim() || null,
        autores: autores,
        doi: $('doi').value.trim().replace(/^https?:\/\/doi\.org\//i, '') || null,
        publicacao_nome: $('publicacaoNome').value.trim() || null,
        publicacao_url: $('publicacaoUrl').value.trim() || null,
        imagem_alt: $('imagemAlt').value.trim() || null,
        status: status
      };

      dados.publicado_em = (status === 'publicado')
        ? (doCampoData($('publicadoEm').value) || (emEdicao && emEdicao.publicado_em) || new Date().toISOString())
        : doCampoData($('publicadoEm').value);

      var slugCongelado = (emEdicao && emEdicao.status === 'publicado' && emEdicao.slug) ? emEdicao.slug : null;

      (slugCongelado ? Promise.resolve(slugCongelado) : gerarSlugUnico(titulo, id))
        .then(function (slug) {
          dados.slug = slug;
          return Promise.all([
            imagemEscolhida ? enviar(imagemEscolhida, slug, 'capa') : null,
            pdfEscolhido ? enviar(pdfEscolhido, slug, 'pdf') : null
          ]);
        })
        .then(function (urls) {
          if (urls[0]) dados.imagem_url = urls[0];
          if (urls[1]) dados.pdf_url = urls[1];
          return id
            ? db.from('artigos').update(dados).eq('id', id)
            : db.from('artigos').insert(dados);
        })
        .then(function (r) {
          if (r.error) throw r.error;
          // arquivo trocado: o antigo vira órfão no storage
          if (emEdicao) {
            if (dados.imagem_url && emEdicao.imagem_url && emEdicao.imagem_url !== dados.imagem_url) painel.apagarDoStorage(BUCKET, emEdicao.imagem_url);
            if (dados.pdf_url && emEdicao.pdf_url && emEdicao.pdf_url !== dados.pdf_url) painel.apagarDoStorage(BUCKET, emEdicao.pdf_url);
          }
          limparForm();
          mostrarLista();
          carregarLista();
          aviso(status === 'publicado'
            ? 'Publicado. O site é atualizado automaticamente em cerca de 2 minutos.'
            : 'Rascunho salvo. Não aparece no site enquanto não for publicado.', 'ok');
        })
        .catch(function (erro) { aviso(traduzirErro(erro)); })
        .then(function () { botoes.forEach(function (b) { b.disabled = false; }); });
    }

    function gerarSlugUnico(titulo, ignorarId) {
      var base = util.slugify(titulo) || 'artigo';
      return db.from('artigos').select('id,slug').like('slug', base + '%')
        .then(function (r) {
          if (r.error) throw r.error;
          var usados = (r.data || [])
            .filter(function (n) { return n.id !== ignorarId; })
            .map(function (n) { return n.slug; });
          if (usados.indexOf(base) === -1) return base;
          for (var i = 2; i < 500; i++) {
            if (usados.indexOf(base + '-' + i) === -1) return base + '-' + i;
          }
          return base + '-' + Date.now();
        });
    }


    /* --- status direto da lista --------------------------------------- */
    function alterarStatus(id, status) {
      var mudanca = { status: status };
      if (status === 'publicado') {
        var atual = linhas.filter(function (n) { return n.id === id; })[0];
        if (!atual || !atual.publicado_em) mudanca.publicado_em = new Date().toISOString();
      }
      db.from('artigos').update(mudanca).eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        carregarLista();
        aviso(status === 'publicado'
          ? 'Publicado. O site é atualizado automaticamente em cerca de 2 minutos.'
          : 'Despublicado. Sai do site no próximo build, em cerca de 2 minutos.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }


    /* --- apagar ----------------------------------------------------------- */
    function apagar(id) {
      if (!window.confirm('Apagar este artigo? Não dá pra desfazer.')) return;
      var alvo = linhas.filter(function (n) { return n.id === id; })[0];
      db.from('artigos').delete().eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        if (alvo) painel.apagarDoStorage(BUCKET, [alvo.imagem_url, alvo.pdf_url]);
        carregarLista();
        aviso('Artigo apagado.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }
  }

  painel.iniciarArtigos = iniciarArtigos;
})();
