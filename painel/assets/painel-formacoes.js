/* =====================================================================
   IBPR — Painel administrativo, Etapa 2b: Formações
   =====================================================================
   Ponto de entrada:  IBPR.painel.iniciarFormacoes()  → painel/formacoes.html

   Vive num arquivo separado do painel.js só por tamanho. As peças comuns
   (mensagens na tela, tradução de erro, conexão) vêm de
   IBPR.painel.interno.

   A IDEIA CENTRAL DO FORMULÁRIO
   Módulos, eixos e listas poderiam ser campos que se multiplicam na tela,
   com botõezinhos de "+" e "remover". Ficaria bonito e seria frágil: muita
   coisa pra dar errado, e ninguém do Instituto ia querer arrastar campo.
   Em vez disso, cada lista é uma caixa de texto com uma linha por item, e
   logo abaixo aparece uma PRÉVIA do que o site entendeu. Se a pessoa
   digitar errado, ela vê na hora, sem precisar publicar pra descobrir.
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

  var BUCKET = 'formacoes';
  var TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB


  /* ===================================================================
     TEXTO ⇄ LISTA
     ===================================================================
     Cada tipo de lista tem um par: `de` lê a caixa de texto e devolve a
     lista que vai pro banco; `para` faz o caminho de volta, pra preencher
     a caixa ao editar. Os dois precisam ser exatamente inversos, senão
     abrir e salvar sem mexer em nada já estragaria o conteúdo. */

  function linhas(texto) {
    return String(texto || '').split('\n')
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
  }

  var FORMATOS = {
    /* Uma frase por linha. */
    simples: {
      de: function (texto) { return linhas(texto); },
      para: function (lista) { return (lista || []).join('\n'); },
      previa: function (lista) {
        return lista.map(function (i) { return '<li>' + util.escapar(i) + '</li>'; }).join('');
      }
    },

    /* "Chave | Frase | Descrição" */
    eixos: {
      de: function (texto) {
        return linhas(texto).map(function (l) {
          var p = l.split('|').map(function (x) { return x.trim(); });
          return { chave: p[0] || '', frase: p[1] || '', desc: p[2] || '' };
        }).filter(function (e) { return e.chave; });
      },
      para: function (lista) {
        return (lista || []).map(function (e) {
          return [e.chave, e.frase, e.desc].join(' | ');
        }).join('\n');
      },
      previa: function (lista) {
        return lista.map(function (e, i) {
          return '<li><strong>' + String(i + 1).padStart(2, '0') + '. ' +
                 util.escapar(e.chave) + '</strong>' +
                 (e.frase ? ' — ' + util.escapar(e.frase) : '') +
                 (e.desc ? '<br/><span class="campo__entendi-sub">' + util.escapar(e.desc) + '</span>' : '') +
                 '</li>';
        }).join('');
      }
    },

    /* "## Título do módulo" e, abaixo, uma linha por tópico. */
    modulos: {
      de: function (texto) {
        var saida = [];
        String(texto || '').split('\n').forEach(function (bruta) {
          var l = bruta.trim();
          if (!l) return;
          if (l.indexOf('##') === 0) {
            saida.push({ titulo: l.replace(/^#+\s*/, ''), topicos: [] });
          } else if (saida.length) {
            saida[saida.length - 1].topicos.push(l.replace(/^[-*•]\s*/, ''));
          }
          /* Linha de tópico antes de qualquer "##" é ignorada de propósito:
             tópico sem módulo não tem onde aparecer no site. A prévia
             denuncia isso, porque a linha some da lista. */
        });
        return saida.filter(function (m) { return m.titulo; });
      },
      para: function (lista) {
        return (lista || []).map(function (m) {
          return ['## ' + m.titulo].concat(m.topicos || []).join('\n');
        }).join('\n\n');
      },
      previa: function (lista) {
        return lista.map(function (m) {
          var tops = m.topicos || [];
          return '<li><strong>' + util.escapar(m.titulo) + '</strong> ' +
                 '<span class="campo__entendi-sub">(' + tops.length +
                 (tops.length === 1 ? ' tópico' : ' tópicos') + ')</span>' +
                 (tops.length
                   ? '<ul>' + tops.map(function (t) { return '<li>' + util.escapar(t) + '</li>'; }).join('') + '</ul>'
                   : '') +
                 '</li>';
        }).join('');
      }
    },

    /* "Texto da etiqueta | endereço" */
    temas: {
      de: function (texto) {
        return linhas(texto).map(function (l) {
          var p = l.split('|').map(function (x) { return x.trim(); });
          return { texto: p[0] || '', href: p[1] || '' };
        }).filter(function (t) { return t.texto; });
      },
      para: function (lista) {
        return (lista || []).map(function (t) {
          return t.href ? t.texto + ' | ' + t.href : t.texto;
        }).join('\n');
      },
      previa: function (lista) {
        return lista.map(function (t) {
          return '<li>' + util.escapar(t.texto) +
                 (t.href
                   ? ' <span class="campo__entendi-sub">→ ' + util.escapar(t.href) + '</span>'
                   : ' <span class="campo__entendi-sub">(sem link)</span>') +
                 '</li>';
        }).join('');
      }
    }
  };

  /* Desenha, embaixo da caixa de texto, o que o site entendeu. */
  function atualizarPrevia(campo) {
    var alvo = $(campo.dataset.previa);
    if (!alvo) return;

    var formato = FORMATOS[campo.dataset.tipo];
    var itens = formato.de(campo.value);

    if (!itens.length) {
      alvo.innerHTML = '';
      alvo.hidden = true;
      return;
    }
    alvo.hidden = false;
    alvo.innerHTML = '<p class="campo__entendi-titulo">O site entendeu ' + itens.length +
      (itens.length === 1 ? ' item:' : ' itens:') + '</p><ul>' + formato.previa(itens) + '</ul>';
  }


  /* ===================================================================
     A TELA
     =================================================================== */
  function iniciarFormacoes() {
    var db = interno.conectar();
    if (!db) return;

    var linhasBanco = [];   // formações carregadas do banco
    var emEdicao = null;    // a que está aberta no formulário (null = nova)
    var arquivos = { hero: null, card: null };

    /* --- porteiro: sem sessão, volta pro login ---------------------- */
    db.auth.getSession()
      .then(function (r) {
        var sessao = r.data && r.data.session;
        if (!sessao) { location.replace('index.html'); return; }
        $('usuarioAtual').textContent = sessao.user.email;
        carregarLista();
      })
      .catch(function () {
        $('carregando').hidden = true;
        aviso('Não foi possível falar com o servidor. Verifique a internet e recarregue a página.');
      });

    $('btnSair').addEventListener('click', function (e) {
      e.preventDefault();
      db.auth.signOut().then(function () { location.replace('index.html'); })
        .catch(function () { location.replace('index.html'); });
    });


    /* --- prévias ao vivo -------------------------------------------- */
    var comPrevia = Array.prototype.slice.call(document.querySelectorAll('[data-previa]'));
    comPrevia.forEach(function (campo) {
      campo.addEventListener('input', function () { atualizarPrevia(campo); });
    });
    function redesenharPrevias() { comPrevia.forEach(atualizarPrevia); }


    /* --- trocar entre lista e formulário ---------------------------- */
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
      limparAviso();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }


    /* --- lista ------------------------------------------------------ */
    function carregarLista() {
      $('carregando').hidden = false;
      $('listaVazia').hidden = true;
      $('lista').innerHTML = '';

      db.from('formacoes').select('*')
        .order('ordem', { ascending: true })
        .order('titulo', { ascending: true })
        .then(function (r) {
          $('carregando').hidden = true;
          if (r.error) { aviso(traduzirErro(r.error)); return; }

          linhasBanco = r.data || [];
          if (!linhasBanco.length) { $('listaVazia').hidden = false; return; }
          $('lista').innerHTML = linhasBanco.map(desenharItem).join('');
        })
        .catch(function (erro) {
          $('carregando').hidden = true;
          aviso(traduzirErro(erro));
        });
    }

    function desenharItem(f) {
      var publicada = f.status === 'publicado';
      var mods = (f.modulos || []).length;
      var tops = (f.modulos || []).reduce(function (s, m) { return s + ((m.topicos || []).length); }, 0);

      var foto = f.imagem_card_url
        ? '<img alt="" src="' + util.escapar(fotoNoPainel(f.imagem_card_url)) + '"/>'
        : '';

      return '' +
        '<article class="painel-item" data-id="' + util.escapar(f.id) + '">' +
          '<div class="painel-item__foto">' + foto + '</div>' +
          '<div>' +
            '<h2 class="painel-item__titulo">' + util.escapar(f.titulo) + '</h2>' +
            '<p class="painel-item__meta">' +
              '<span class="selo selo--' + (publicada ? 'publicado' : 'rascunho') + '">' +
                (publicada ? 'Publicado' : 'Rascunho') +
              '</span>' +
              '<span>posição ' + util.escapar(f.ordem) + '</span>' +
              '<span>' + mods + (mods === 1 ? ' módulo' : ' módulos') + '</span>' +
              '<span>' + tops + (tops === 1 ? ' tópico' : ' tópicos') + '</span>' +
            '</p>' +
            '<div class="painel-item__acoes">' +
              '<button class="btn btn--outline btn--sm" data-acao="editar" type="button">Editar</button>' +
              (publicada
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


    /* --- formulário -------------------------------------------------- */
    $('btnNova').addEventListener('click', function () {
      limparForm();
      mostrarForm('Nova formação');
    });

    $('btnCancelar').addEventListener('click', function () {
      limparForm();
      mostrarLista();
    });

    /* Todos os campos de texto simples, em pares campo-do-formulário /
       coluna-do-banco. Ter isto numa lista só evita o clássico "adicionei
       o campo no HTML e esqueci de salvar/carregar ele". */
    var SIMPLES = [
      ['titulo', 'titulo'], ['tituloCurto', 'titulo_curto'], ['tituloRodape', 'titulo_rodape'],
      ['subtitulo', 'subtitulo'], ['resumo', 'resumo'], ['publicoCurto', 'publico_curto'],
      ['area', 'area'], ['areaIcone', 'area_icone'], ['linkCurso', 'link_curso'],
      ['fundamento', 'fundamento'], ['resultadosIntro', 'resultados_intro'],
      ['imagemCardAlt', 'imagem_card_alt'], ['metaDescricao', 'meta_descricao'],
      ['seoDescricao', 'seo_descricao'], ['seoPublico', 'seo_publico']
    ];

    /* Listas: campo / coluna / formato. */
    var LISTAS = [
      ['desenvolver', 'desenvolver', 'simples'],
      ['paraQuem', 'para_quem', 'simples'],
      ['resultados', 'resultados', 'simples'],
      ['eixos', 'eixos', 'eixos'],
      ['modulos', 'modulos', 'modulos'],
      ['temas', 'temas_relacionados', 'temas']
    ];

    function limparForm() {
      emEdicao = null;
      $('formacaoId').value = '';
      SIMPLES.forEach(function (p) { $(p[0]).value = ''; });
      LISTAS.forEach(function (p) { $(p[0]).value = ''; });

      $('areaIcone').value = 'fa-shapes';
      $('ordem').value = proximaPosicao();
      $('imagemHero').value = '';
      $('imagemCard').value = '';
      $('previaHero').hidden = true;
      $('previaCard').hidden = true;
      arquivos = { hero: null, card: null };
      redesenharPrevias();
    }

    /* Formação nova entra no fim da fila, não na frente. */
    function proximaPosicao() {
      var maior = linhasBanco.reduce(function (m, f) { return Math.max(m, Number(f.ordem) || 0); }, 0);
      return maior + 1;
    }

    function abrirEdicao(id) {
      db.from('formacoes').select('*').eq('id', id).single().then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        var f = r.data;
        emEdicao = f;

        $('formacaoId').value = f.id;
        SIMPLES.forEach(function (p) { $(p[0]).value = f[p[1]] || ''; });
        LISTAS.forEach(function (p) { $(p[0]).value = FORMATOS[p[2]].para(f[p[1]]); });

        $('areaIcone').value = f.area_icone || 'fa-shapes';
        $('ordem').value = f.ordem;

        arquivos = { hero: null, card: null };
        $('imagemHero').value = '';
        $('imagemCard').value = '';
        mostrarPreviaFoto('Hero', f.imagem_hero_url);
        mostrarPreviaFoto('Card', f.imagem_card_url);

        redesenharPrevias();
        mostrarForm('Editar formação');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }

    function mostrarPreviaFoto(qual, url) {
      if (url) {
        $('previa' + qual + 'Img').src = fotoNoPainel(url);
        $('previa' + qual).hidden = false;
      } else {
        $('previa' + qual).hidden = true;
      }
    }


    /* --- fotos ------------------------------------------------------- */
    [['imagemHero', 'hero', 'Hero'], ['imagemCard', 'card', 'Card']].forEach(function (t) {
      $(t[0]).addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) { arquivos[t[1]] = null; return; }

        if (f.size > TAMANHO_MAX) {
          aviso('A imagem tem ' + (f.size / 1048576).toFixed(1) + ' MB. O limite é 5 MB.');
          e.target.value = '';
          arquivos[t[1]] = null;
          return;
        }
        limparAviso();
        arquivos[t[1]] = f;
        $('previa' + t[2] + 'Img').src = URL.createObjectURL(f);
        $('previa' + t[2]).hidden = false;
      });
    });

    function enviarImagem(arquivo, slug, sufixo) {
      var ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
      var caminho = slug + '-' + sufixo + '-' + Date.now() + '.' + ext;

      return db.storage.from(BUCKET)
        .upload(caminho, arquivo, { cacheControl: '31536000', upsert: false })
        .then(function (r) {
          if (r.error) throw r.error;
          return db.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        });
    }


    /* --- salvar ------------------------------------------------------ */
    $('btnRascunho').addEventListener('click', function () { salvar('rascunho'); });
    $('btnPublicar').addEventListener('click', function () { salvar('publicado'); });

    function salvar(status) {
      limparAviso();

      var titulo = $('titulo').value.trim();
      var resumo = $('resumo').value.trim();

      if (!titulo) { aviso('O título é obrigatório.'); $('titulo').focus(); return; }
      if (!resumo) { aviso('O resumo é obrigatório: é o texto do card na Home e no catálogo.'); $('resumo').focus(); return; }

      var id = $('formacaoId').value;
      var botoes = [$('btnPublicar'), $('btnRascunho'), $('btnCancelar')];
      botoes.forEach(function (b) { b.disabled = true; });

      var dados = {};
      SIMPLES.forEach(function (p) { dados[p[1]] = $(p[0]).value.trim() || null; });
      LISTAS.forEach(function (p) { dados[p[1]] = FORMATOS[p[2]].de($(p[0]).value); });

      dados.titulo = titulo;   // obrigatório, não pode virar null
      dados.resumo = resumo;
      dados.area_icone = $('areaIcone').value || 'fa-shapes';
      dados.ordem = Number($('ordem').value) || proximaPosicao();
      dados.status = status;

      /* O slug de uma formação JÁ PUBLICADA nunca muda, mesmo que o título
         mude. Ele é o endereço da página: mexer nele quebraria todo link
         já compartilhado, e ainda faria o build apagar a página antiga e
         criar outra do zero, perdendo a posição dela no Google. */
      var slugCongelado = (emEdicao && emEdicao.status === 'publicado' && emEdicao.slug)
        ? emEdicao.slug
        : null;

      (slugCongelado ? Promise.resolve(slugCongelado) : gerarSlugUnico(titulo, id))
        .then(function (slug) {
          dados.slug = slug;

          // As duas fotos sobem em paralelo; qualquer uma pode não existir.
          return Promise.all([
            arquivos.hero ? enviarImagem(arquivos.hero, slug, 'topo') : null,
            arquivos.card ? enviarImagem(arquivos.card, slug, 'card') : null
          ]);
        })
        .then(function (urls) {
          if (urls[0]) dados.imagem_hero_url = urls[0];
          if (urls[1]) dados.imagem_card_url = urls[1];

          return id
            ? db.from('formacoes').update(dados).eq('id', id)
            : db.from('formacoes').insert(dados);
        })
        .then(function (r) {
          if (r.error) throw r.error;
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

    /* O slug vira o nome do arquivo: formacao-<slug>.html. O prefixo
       "formacao-" é obrigatório no banco e no build — é ele que impede uma
       formação chamada "index" de sobrescrever a página inicial do site. */
    function gerarSlugUnico(titulo, ignorarId) {
      var base = 'formacao-' + (util.slugify(titulo) || 'nova');

      return db.from('formacoes').select('id,slug').like('slug', base + '%')
        .then(function (r) {
          if (r.error) throw r.error;
          var usados = (r.data || [])
            .filter(function (f) { return f.id !== ignorarId; })
            .map(function (f) { return f.slug; });

          if (usados.indexOf(base) === -1) return base;
          for (var i = 2; i < 500; i++) {
            if (usados.indexOf(base + '-' + i) === -1) return base + '-' + i;
          }
          return base + '-' + Date.now();
        });
    }


    /* --- publicar/despublicar direto da lista ----------------------- */
    function alterarStatus(id, status) {
      /* Despublicar a última formação apagaria o menu, o rodapé, o
         carrossel da Home e o catálogo de uma vez só. O build se recusa a
         fazer isso, mas é melhor avisar aqui do que deixar a pessoa achar
         que funcionou e só descobrir depois. */
      if (status === 'rascunho') {
        var publicadas = linhasBanco.filter(function (f) { return f.status === 'publicado'; });
        if (publicadas.length <= 1) {
          aviso('Esta é a última formação publicada. O site precisa de pelo menos uma: ' +
                'sem nenhuma, o menu, o rodapé e o catálogo ficariam vazios.');
          return;
        }
      }

      db.from('formacoes').update({ status: status }).eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        carregarLista();
        aviso(status === 'publicado'
          ? 'Publicado. O site é atualizado automaticamente em cerca de 2 minutos.'
          : 'Despublicado. Sai do site no próximo build, em cerca de 2 minutos.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }


    /* --- apagar ----------------------------------------------------- */
    function apagar(id) {
      var alvo = linhasBanco.filter(function (f) { return f.id === id; })[0];
      var publicadas = linhasBanco.filter(function (f) { return f.status === 'publicado'; });

      if (alvo && alvo.status === 'publicado' && publicadas.length <= 1) {
        aviso('Esta é a última formação publicada. O site precisa de pelo menos uma.');
        return;
      }

      if (!window.confirm('Apagar "' + (alvo ? alvo.titulo : 'esta formação') + '"?\n\n' +
                          'A página dela sai do ar e o link deixa de funcionar. Não dá pra desfazer.')) return;

      db.from('formacoes').delete().eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        carregarLista();
        aviso('Formação apagada. Sai do site no próximo build.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }
  }

  painel.iniciarFormacoes = iniciarFormacoes;
})();
