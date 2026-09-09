/* =====================================================================
   IBPR — Painel administrativo, Etapa 4: Textos institucionais
   =====================================================================
   Ponto de entrada:  IBPR.painel.iniciarTextos()  → painel/textos.html

   POR QUE ESTA TELA É DIFERENTE DAS OUTRAS TRÊS

   Nas outras, a pessoa cria e apaga coisas: uma notícia, um curso, alguém
   da equipe. Aqui não existe "novo" nem "apagar". Cada bloco é um pedaço
   de texto que já está numa página do site, e o painel só troca as
   palavras dele. Criar um bloco sem lugar no HTML não faria nada; apagar
   um faria um pedaço da página parar de ser editável, sem aviso. O banco
   também recusa as duas coisas, então isto aqui é só a metade visível da
   trava.

   Por isso a tela é uma lista, não um formulário com lista: tudo aberto,
   agrupado por página e por seção, cada bloco com o seu botão de salvar.
   Quem entra pra corrigir uma frase acha ela sem precisar navegar.

   O botão "restaurar" devolve o texto que estava no site no dia em que o
   CMS foi ligado. É o desfazer de última instância, e não depende de
   ninguém lembrar do texto antigo.
   ===================================================================== */

(function () {
  'use strict';

  var painel = window.IBPR.painel;
  var interno = painel.interno;
  var $ = interno.$;
  var aviso = interno.aviso;
  var limparAviso = interno.limparAviso;
  var traduzirErro = interno.traduzirErro;
  var util = window.IBPR.util;


  function iniciarTextos() {
    var db = interno.conectar();
    if (!db) return;

    var linhas = [];

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


    /* --- carregar e desenhar --------------------------------------- */
    function carregarLista() {
      $('carregando').hidden = false;
      $('listaVazia').hidden = true;
      $('lista').innerHTML = '';

      db.from('textos').select('*').order('ordem', { ascending: true })
        .then(function (r) {
          $('carregando').hidden = true;
          if (r.error) { aviso(traduzirErro(r.error)); return; }

          linhas = r.data || [];
          if (!linhas.length) { $('listaVazia').hidden = false; return; }
          desenhar();
        })
        .catch(function (erro) {
          $('carregando').hidden = true;
          aviso(traduzirErro(erro));
        });
    }

    /* Agrupa por página e, dentro dela, por seção. A ordem vem do banco
       (coluna `ordem`), que é a ordem em que os blocos aparecem na página
       de verdade: quem está corrigindo um texto percorre a tela na mesma
       sequência em que leria o site. */
    function desenhar() {
      var html = '';
      var paginaAtual = null;
      var secaoAtual = null;

      linhas.forEach(function (t) {
        if (t.pagina !== paginaAtual) {
          if (paginaAtual !== null) html += '</section>';
          paginaAtual = t.pagina;
          secaoAtual = null;
          html += '<section class="painel-pagina">' +
                  '<h2 class="painel-pagina__nome">' + util.escapar(t.pagina) + '</h2>';
        }
        if (t.secao !== secaoAtual) {
          secaoAtual = t.secao;
          html += '<h3 class="painel-secao painel-secao--texto">' + util.escapar(t.secao) + '</h3>';
        }
        html += cartao(t);
      });

      if (paginaAtual !== null) html += '</section>';
      $('lista').innerHTML = html;
    }

    function cartao(t) {
      var editado = t.valor !== t.valor_original;
      var linhasCaixa = t.tipo === 'prosa' ? 8 : (t.valor.length > 160 ? 4 : 2);

      return '' +
        '<div class="painel-texto" data-id="' + util.escapar(t.id) + '">' +
          '<div class="painel-texto__cabeca">' +
            '<label for="campo-' + util.escapar(t.id) + '">' + util.escapar(t.rotulo) + '</label>' +
            (editado ? '<span class="selo selo--editado">Editado</span>' : '') +
          '</div>' +
          '<textarea id="campo-' + util.escapar(t.id) + '" rows="' + linhasCaixa + '" ' +
            'data-acao="campo">' + util.escapar(t.valor) + '</textarea>' +
          (t.ajuda ? '<span class="campo__dica">' + util.escapar(t.ajuda) + '</span>' : '') +
          '<div class="painel-texto__acoes">' +
            '<button class="btn btn--dark btn--sm" data-acao="salvar" type="button">Salvar</button>' +
            (editado
              ? '<button class="btn btn--fantasma btn--sm" data-acao="restaurar" type="button">' +
                'Restaurar o texto original</button>'
              : '') +
            '<span class="painel-texto__estado" data-papel="estado"></span>' +
          '</div>' +
        '</div>';
    }


    /* --- salvar e restaurar ----------------------------------------- */
    /* Um ouvinte só no container: os cartões são redesenhados a cada
       carregamento, e ouvintes individuais ficariam órfãos. */
    $('lista').addEventListener('click', function (e) {
      var botao = e.target.closest('[data-acao]');
      if (!botao || botao.tagName !== 'BUTTON') return;

      var cartaoEl = botao.closest('.painel-texto');
      var id = cartaoEl.dataset.id;
      var t = linhas.filter(function (x) { return x.id === id; })[0];
      if (!t) return;

      if (botao.dataset.acao === 'salvar') {
        gravar(t, cartaoEl.querySelector('textarea').value, cartaoEl, botao);
      }
      if (botao.dataset.acao === 'restaurar') {
        if (!window.confirm('Voltar este texto para como ele estava quando o site foi entregue?\n\n' +
                            'O que você escreveu aqui será substituído.')) return;
        cartaoEl.querySelector('textarea').value = t.valor_original;
        gravar(t, t.valor_original, cartaoEl, botao);
      }
    });

    function gravar(t, valor, cartaoEl, botao) {
      limparAviso();
      valor = String(valor).trim();

      /* Texto vazio deixaria um buraco na página. O build também se
         recusa a aplicar bloco vazio, mas explicar aqui é melhor do que
         deixar a pessoa achar que salvou e não ver mudança nenhuma. */
      if (!valor) {
        aviso('Este texto não pode ficar em branco: ele ocupa um lugar fixo na página. ' +
              'Se quiser voltar ao texto de antes, use "Restaurar o texto original".');
        cartaoEl.querySelector('textarea').focus();
        return;
      }

      var estado = cartaoEl.querySelector('[data-papel="estado"]');
      botao.disabled = true;
      estado.textContent = 'Salvando…';

      db.from('textos').update({ valor: valor }).eq('id', t.id)
        .then(function (r) {
          if (r.error) throw r.error;
          t.valor = valor;
          estado.textContent = 'Salvo. O site é atualizado em cerca de 2 minutos.';
          /* Redesenha só depois de um tempo, pra pessoa ler o aviso antes
             de a lista se refazer (o selo "Editado" e o botão de restaurar
             aparecem ou somem conforme o texto). */
          setTimeout(desenhar, 2500);
        })
        .catch(function (erro) {
          estado.textContent = '';
          aviso(traduzirErro(erro));
        })
        .then(function () { botao.disabled = false; });
    }
  }

  painel.iniciarTextos = iniciarTextos;
})();
