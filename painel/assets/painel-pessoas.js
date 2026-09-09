/* =====================================================================
   IBPR — Painel administrativo, Etapa 3: Pessoas
   =====================================================================
   Ponto de entrada:  IBPR.painel.iniciarPessoas()  → painel/pessoas.html

   Mesma estrutura do painel-formacoes.js, bem menor: uma pessoa tem um
   punhado de campos e uma foto só. As peças comuns (mensagens na tela,
   tradução de erro, conexão) vêm de IBPR.painel.interno.

   DUAS COISAS QUE SÓ EXISTEM AQUI

   1. A trajetória é uma caixa de texto com parágrafos separados por linha
      em branco, e não uma lista de campos. É como as pessoas já escrevem
      no Word, e a prévia embaixo mostra na hora o que o site entendeu.

   2. O painel mede a foto sozinho (largura e altura em pixels) e grava as
      duas junto. Sem essas medidas no HTML, a página "pula" enquanto o
      retrato carrega, e ninguém do Instituto teria como saber disso.
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

  var BUCKET = 'pessoas';
  var TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB


  /* ===================================================================
     TEXTO ⇄ PARÁGRAFOS
     ===================================================================
     `de` e `para` precisam ser exatamente inversos: abrir uma pessoa e
     salvar sem mexer em nada não pode alterar o texto dela. */

  function paragrafosDe(texto) {
    return String(texto || '').split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);
  }

  function paragrafosPara(lista) {
    return (lista || []).join('\n\n');
  }

  /* Mostra, embaixo da caixa, em quantos parágrafos o site vai quebrar o
     texto. É o equivalente da prévia das listas das Formações. */
  function atualizarPrevia() {
    var alvo = $('previaTrajetoria');
    var paras = paragrafosDe($('trajetoria').value);

    if (!paras.length) {
      alvo.innerHTML = '';
      alvo.hidden = true;
      return;
    }
    alvo.hidden = false;
    alvo.innerHTML = '<p class="campo__entendi-titulo">O site entendeu ' + paras.length +
      (paras.length === 1 ? ' parágrafo:' : ' parágrafos:') + '</p><ul>' +
      paras.map(function (p) {
        var curto = p.length > 120 ? p.slice(0, 120) + '…' : p;
        return '<li>' + util.escapar(curto) + '</li>';
      }).join('') + '</ul>';
  }


  /* ===================================================================
     A TELA
     =================================================================== */
  function iniciarPessoas() {
    var db = interno.conectar();
    if (!db) return;

    var linhasBanco = [];   // pessoas carregadas do banco
    var emEdicao = null;    // a que está aberta no formulário (null = nova)
    var arquivoFoto = null; // File escolhido, ainda não enviado
    var medidaFoto = null;  // { largura, altura } da foto escolhida

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

    $('trajetoria').addEventListener('input', atualizarPrevia);


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

      db.from('pessoas').select('*')
        .order('grupo', { ascending: true })
        .order('ordem', { ascending: true })
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

    function desenharItem(p) {
      var publicada = p.status === 'publicado';
      var foto = p.foto_url ? '<img alt="" src="' + util.escapar(fotoNoPainel(p.foto_url)) + '"/>' : '';

      return '' +
        '<article class="painel-item" data-id="' + util.escapar(p.id) + '">' +
          '<div class="painel-item__foto painel-item__foto--retrato">' + foto + '</div>' +
          '<div>' +
            '<h2 class="painel-item__titulo">' + util.escapar(p.nome) + '</h2>' +
            '<p class="painel-item__meta">' +
              '<span class="selo selo--' + (publicada ? 'publicado' : 'rascunho') + '">' +
                (publicada ? 'Publicado' : 'Rascunho') +
              '</span>' +
              '<span>' + (p.grupo === 'direcao' ? 'Direção' : 'Rede') + '</span>' +
              (p.cargo ? '<span>' + util.escapar(p.cargo) + '</span>' : '') +
              '<span>posição ' + util.escapar(p.ordem) + '</span>' +
              (p.destaque_home ? '<span>na página inicial</span>' : '') +
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
      mostrarForm('Nova pessoa');
    });

    $('btnCancelar').addEventListener('click', function () {
      limparForm();
      mostrarLista();
    });

    function limparForm() {
      emEdicao = null;
      $('pessoaId').value = '';
      $('nome').value = '';
      $('cargo').value = '';
      $('bio').value = '';
      $('trajetoria').value = '';
      $('fotoAlt').value = '';
      $('grupo').value = 'rede';
      $('destaqueHome').checked = false;
      $('ordem').value = proximaPosicao('rede');
      $('foto').value = '';
      $('previaFoto').hidden = true;
      $('medidaFoto').hidden = true;
      arquivoFoto = null;
      medidaFoto = null;
      atualizarPrevia();
    }

    /* Pessoa nova entra no fim do bloco dela, não na frente. */
    function proximaPosicao(grupo) {
      var maior = linhasBanco
        .filter(function (p) { return p.grupo === grupo; })
        .reduce(function (m, p) { return Math.max(m, Number(p.ordem) || 0); }, 0);
      return maior + 1;
    }

    /* Trocar de bloco sem mexer na posição colocaria a pessoa no meio do
       outro bloco, com um número que já é de outra pessoa. */
    $('grupo').addEventListener('change', function () {
      if (!emEdicao) $('ordem').value = proximaPosicao($('grupo').value);
    });

    function abrirEdicao(id) {
      db.from('pessoas').select('*').eq('id', id).single().then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        var p = r.data;
        emEdicao = p;

        $('pessoaId').value = p.id;
        $('nome').value = p.nome || '';
        $('cargo').value = p.cargo || '';
        $('bio').value = p.bio || '';
        $('trajetoria').value = paragrafosPara(p.trajetoria);
        $('fotoAlt').value = p.foto_alt || '';
        $('grupo').value = p.grupo || 'rede';
        $('destaqueHome').checked = !!p.destaque_home;
        $('ordem').value = p.ordem;

        arquivoFoto = null;
        medidaFoto = null;
        $('foto').value = '';
        if (p.foto_url) {
          $('previaFotoImg').src = fotoNoPainel(p.foto_url);
          $('previaFoto').hidden = false;
        } else {
          $('previaFoto').hidden = true;
        }
        $('medidaFoto').hidden = true;

        atualizarPrevia();
        mostrarForm('Editar pessoa');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }


    /* --- foto -------------------------------------------------------- */
    $('foto').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) { arquivoFoto = null; medidaFoto = null; return; }

      if (f.size > TAMANHO_MAX) {
        aviso('A imagem tem ' + (f.size / 1048576).toFixed(1) + ' MB. O limite é 5 MB.');
        e.target.value = '';
        arquivoFoto = null;
        medidaFoto = null;
        return;
      }

      limparAviso();
      arquivoFoto = f;
      medidaFoto = null;

      var endereco = URL.createObjectURL(f);
      $('previaFotoImg').src = endereco;
      $('previaFoto').hidden = false;

      /* Mede a foto de verdade, pra gravar largura e altura junto. Se a
         leitura falhar (arquivo estranho), segue sem as medidas: o site
         só perde a reserva de espaço, não quebra. */
      var medidor = new Image();
      medidor.onload = function () {
        medidaFoto = { largura: medidor.naturalWidth, altura: medidor.naturalHeight };
        var aviso3x4 = medidor.naturalWidth >= medidor.naturalHeight
          ? ' Atenção: esta foto está deitada, e a moldura do site é em pé. Ela vai ser cortada nas laterais.'
          : '';
        $('medidaFoto').textContent = medidor.naturalWidth + ' × ' + medidor.naturalHeight + ' pixels.' + aviso3x4;
        $('medidaFoto').hidden = false;
      };
      medidor.onerror = function () { medidaFoto = null; };
      medidor.src = endereco;
    });

    function enviarFoto(arquivo, slug) {
      var ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
      var caminho = slug + '-' + Date.now() + '.' + ext;

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

      var nome = $('nome').value.trim();
      var bio = $('bio').value.trim();

      if (!nome) { aviso('O nome é obrigatório.'); $('nome').focus(); return; }
      if (!bio)  { aviso('A apresentação é obrigatória: é o texto que aparece embaixo do nome.'); $('bio').focus(); return; }

      /* Publicar alguém sem foto deixaria uma moldura vazia no meio da
         seção. Em rascunho pode, pra quem está montando aos poucos. */
      if (status === 'publicado' && !arquivoFoto && !(emEdicao && emEdicao.foto_url)) {
        aviso('Falta a foto. Toda pessoa publicada aparece com retrato na página.');
        $('foto').focus();
        return;
      }

      var id = $('pessoaId').value;
      var botoes = [$('btnPublicar'), $('btnRascunho'), $('btnCancelar')];
      botoes.forEach(function (b) { b.disabled = true; });

      var dados = {
        nome: nome,
        bio: bio,
        cargo: $('cargo').value.trim() || null,
        grupo: $('grupo').value,
        trajetoria: paragrafosDe($('trajetoria').value),
        foto_alt: $('fotoAlt').value.trim() || null,
        destaque_home: $('destaqueHome').checked,
        ordem: Number($('ordem').value) || proximaPosicao($('grupo').value),
        status: status
      };

      /* O slug aqui não é endereço de página (pessoa não tem página): ele
         nomeia a foto no storage. Mesmo assim nunca muda depois de criado,
         pra que corrigir a grafia de um nome não deixe as fotos antigas
         com um nome e as novas com outro. */
      var slugCongelado = (emEdicao && emEdicao.slug) ? emEdicao.slug : null;

      (slugCongelado ? Promise.resolve(slugCongelado) : gerarSlugUnico(nome, id))
        .then(function (slug) {
          dados.slug = slug;
          if (!arquivoFoto) return null;
          return enviarFoto(arquivoFoto, slug);
        })
        .then(function (url) {
          if (url) {
            dados.foto_url = url;
            /* As medidas só valem pra foto que veio junto com elas. Trocar
               a foto sem regravar largura e altura deixaria o HTML com a
               reserva de espaço da foto antiga. */
            dados.foto_largura = medidaFoto ? medidaFoto.largura : null;
            dados.foto_altura  = medidaFoto ? medidaFoto.altura  : null;
          }
          return id
            ? db.from('pessoas').update(dados).eq('id', id)
            : db.from('pessoas').insert(dados);
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

    function gerarSlugUnico(nome, ignorarId) {
      var base = util.slugify(nome) || 'pessoa';

      return db.from('pessoas').select('id,slug').like('slug', base + '%')
        .then(function (r) {
          if (r.error) throw r.error;
          var usados = (r.data || [])
            .filter(function (p) { return p.id !== ignorarId; })
            .map(function (p) { return p.slug; });

          if (usados.indexOf(base) === -1) return base;
          for (var i = 2; i < 500; i++) {
            if (usados.indexOf(base + '-' + i) === -1) return base + '-' + i;
          }
          return base + '-' + Date.now();
        });
    }


    /* --- a trava do bloco da direção -------------------------------- */
    /* "As pessoas por trás do propósito" é o coração da página do
       Instituto. Sem ninguém publicado ali, sobraria um título sozinho em
       cima do vazio. O build se recusa a gerar isso, mas é melhor avisar
       aqui, na hora do clique, do que deixar a pessoa achar que deu certo.

       O bloco da rede não tem essa trava: sem ninguém, ele some inteiro,
       com título e tudo, e a página continua fazendo sentido. */
    function ultimaDaDirecao(alvo) {
      if (!alvo || alvo.grupo !== 'direcao' || alvo.status !== 'publicado') return false;
      return linhasBanco.filter(function (p) {
        return p.grupo === 'direcao' && p.status === 'publicado';
      }).length <= 1;
    }

    function acharPessoa(id) {
      return linhasBanco.filter(function (p) { return p.id === id; })[0];
    }


    /* --- publicar/despublicar direto da lista ----------------------- */
    function alterarStatus(id, status) {
      if (status === 'rascunho' && ultimaDaDirecao(acharPessoa(id))) {
        aviso('Esta é a última pessoa publicada em "As pessoas por trás do propósito". ' +
              'A seção não pode ficar sem ninguém.');
        return;
      }

      db.from('pessoas').update({ status: status }).eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        carregarLista();
        aviso(status === 'publicado'
          ? 'Publicado. O site é atualizado automaticamente em cerca de 2 minutos.'
          : 'Despublicado. Sai do site no próximo build, em cerca de 2 minutos.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }


    /* --- apagar ----------------------------------------------------- */
    function apagar(id) {
      var alvo = acharPessoa(id);

      if (ultimaDaDirecao(alvo)) {
        aviso('Esta é a última pessoa publicada em "As pessoas por trás do propósito". ' +
              'A seção não pode ficar sem ninguém.');
        return;
      }

      if (!window.confirm('Apagar "' + (alvo ? alvo.nome : 'esta pessoa') + '"?\n\n' +
                          'Ela sai da página do Instituto. Não dá pra desfazer.')) return;

      db.from('pessoas').delete().eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        carregarLista();
        aviso('Pessoa apagada. Sai do site no próximo build.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }
  }

  painel.iniciarPessoas = iniciarPessoas;
})();
