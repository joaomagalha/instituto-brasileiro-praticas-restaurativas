/* =====================================================================
   IBPR — consentimento de cookies
   =====================================================================
   O site tem uma única ferramenta que usa cookie: o Microsoft Clarity,
   que grava a sessão e monta mapa de calor pra entender como o visitante
   navega. Nada além disso: não existe formulário, login de visitante nem
   propaganda no site.

   A REGRA QUE MANDA AQUI: o Clarity NÃO carrega antes do "aceitar".
   Pedir permissão depois de já ter gravado a sessão seria pedir permissão
   pra uma coisa já feita. Enquanto a pessoa não escolhe, nenhuma requisição
   sai pro Clarity e nenhum cookie dele é criado.

   Isso segue o Guia Orientativo da ANPD sobre cookies (2022): cookie que
   não é necessário pro site funcionar depende de consentimento, e recusar
   tem que ser tão fácil quanto aceitar. Por isso os dois botões têm o mesmo
   peso visual, e não existe "aceitar tudo" grande com um "x" escondido.

   A escolha fica no localStorage do navegador da pessoa, não num servidor
   do Instituto: é a informação de menor sensibilidade possível.

       ibpr-cookies = "aceito" | "recusado"

   Trocar de ideia depois: a página de política tem o botão que chama
   IBPR.cookies.reabrir().
   ===================================================================== */

window.IBPR = window.IBPR || {};

window.IBPR.cookies = (function () {
  'use strict';

  var CHAVE = 'ibpr-cookies';
  var CLARITY = 'yfhufldvyc';
  var POLITICA = 'politica-de-privacidade.html';

  /* localStorage pode estourar (navegação anônima em alguns navegadores,
     cookies bloqueados por política do computador). Nesse caso a pessoa
     vê o aviso de novo a cada visita, o que é chato mas correto: sem
     memória, não dá pra afirmar que ela já consentiu. */
  function ler() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  }
  function gravar(v) {
    try { localStorage.setItem(CHAVE, v); } catch (e) {}
  }

  /* --- a ferramenta de medição, que só entra depois do sim ----------- */
  var carregado = false;
  function ligarClarity() {
    if (carregado || !CLARITY) return;
    carregado = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY);
  }

  /* Quem já aceitou antes não precisa ver nada de novo. */
  function decidir(escolha) {
    gravar(escolha);
    fechar();
    if (escolha === 'aceito') ligarClarity();
    /* Recusar depois de ter aceitado: o Clarity já pode ter sido carregado
       nesta aba. Recarregar é o único jeito honesto de parar de vez, em vez
       de deixar rodando até a pessoa sair. */
    else if (carregado) location.reload();
  }

  /* --- o aviso ------------------------------------------------------- */
  var caixa = null;

  function fechar() {
    if (!caixa) return;
    caixa.remove();
    caixa = null;
  }

  function mostrar() {
    if (caixa) return;

    caixa = document.createElement('div');
    caixa.className = 'aviso-cookies';
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-label', 'Aviso sobre cookies');
    caixa.innerHTML =
      '<div class="aviso-cookies__texto">' +
        '<p><strong>Este site usa cookies para entender como as pessoas navegam.</strong></p>' +
        '<p>São dados de navegação, usados só para melhorar o site. Você pode recusar, e nada ' +
          'muda no funcionamento das páginas. Detalhes na ' +
          '<a href="' + POLITICA + '">política de privacidade</a>.</p>' +
      '</div>' +
      '<div class="aviso-cookies__acoes">' +
        '<button class="btn btn--dark btn--sm" type="button" data-cookies="aceito">Aceitar</button>' +
        '<button class="btn btn--outline btn--sm" type="button" data-cookies="recusado">Recusar</button>' +
      '</div>';

    caixa.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cookies]');
      if (b) decidir(b.dataset.cookies);
    });

    /* Entra no COMEÇO do body, não no fim.
       Ele aparece embaixo na tela (position: fixed), mas a ordem do Tab
       segue o HTML: acrescentado no fim, quem navega por teclado só
       chegaria nos botões depois de percorrer a página inteira. Fica logo
       depois do "pular para o conteúdo", que por convenção é o primeiro. */
    var pular = document.querySelector('.skip-link');
    if (pular && pular.parentNode === document.body) {
      document.body.insertBefore(caixa, pular.nextSibling);
    } else {
      document.body.insertBefore(caixa, document.body.firstChild);
    }
    /* Deixa o navegador pintar antes de animar, senão a transição não roda.
       O setTimeout é rede de proteção: em aba de fundo o
       requestAnimationFrame não dispara, e sem ele o aviso ficaria com
       opacidade 0 pra sempre. Adicionar a classe duas vezes não faz mal. */
    var aparecer = function () { if (caixa) caixa.classList.add('is-visivel'); };
    requestAnimationFrame(aparecer);
    setTimeout(aparecer, 60);
  }

  function iniciar() {
    var escolha = ler();
    if (escolha === 'aceito') { ligarClarity(); return; }
    if (escolha === 'recusado') return;
    mostrar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  return {
    /* Chamado pelo botão da política de privacidade. */
    reabrir: function () {
      try { localStorage.removeItem(CHAVE); } catch (e) {}
      mostrar();
    },
    escolhaAtual: ler
  };
})();
