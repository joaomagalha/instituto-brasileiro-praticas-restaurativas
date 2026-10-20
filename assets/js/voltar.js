/* Botão Voltar (19/10): cria o <a data-voltar>; o clique é tratado pelo
   site-interactions.js (history.back() quando veio de outra página do site,
   senão segue o href). Por isso este script entra ANTES dele, sem defer.
   Versão escolhida: junto da navbar, sempre à vista. Sobre o hero fica de
   vidro; fora dele ganha is-claro (degradê navy com grão no voltar.css). */
(function () {
  var pag = location.pathname.split('/').pop() || 'index.html';
  if (pag === 'index.html' || document.querySelector('.voltar')) return;
  var destino = /^formacao-/.test(pag) ? 'formacoes.html'
    : /^artigo-/.test(pag) ? 'artigos.html'
    : (/^noticia-/.test(pag) || pag === 'artigos.html') ? 'ibpr-em-movimento.html'
    : 'index.html';

  var a = document.createElement('a');
  a.className = 'voltar';
  a.href = destino;
  a.setAttribute('data-voltar', '');
  a.setAttribute('aria-label', 'Voltar para a página anterior');
  a.innerHTML = '<span class="voltar__seta" aria-hidden="true"><i class="fa-solid fa-arrow-left"></i></span><span class="voltar__txt">Voltar</span>';
  document.body.appendChild(a);

  // acompanha a base da navbar
  var nav = document.querySelector('.navbar__container') || document.querySelector('.navbar');
  function prende() {
    if (!nav) return;
    var r = nav.getBoundingClientRect();
    a.style.setProperty('--voltar-top', Math.max(r.bottom, 0) + 10 + 'px');
    a.style.setProperty('--voltar-left', Math.max(r.left, 12) + 'px');
    fundo();
  }

  // o que está atrás do botão: dentro de um hero (escuro) ou não (claro)
  function fundo() {
    var b = a.getBoundingClientRect();
    var pilha = document.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    var escuro = false;
    for (var i = 0; i < pilha.length; i++) {
      var el = pilha[i];
      if (el === a || a.contains(el) || (nav && nav.contains(el))) continue;
      escuro = !!el.closest('[class*="hero"]');
      break;
    }
    a.classList.toggle('is-claro', !escuro);
  }

  // entra suave logo depois de abrir e fica sempre à vista
  requestAnimationFrame(function () { requestAnimationFrame(function () { a.classList.add('is-visivel'); }); });

  // a navbar anima margem e tamanho (400ms) ao entrar/sair do .scrolled:
  // segue quadro a quadro até 600ms depois do último gatilho, depois para
  var ate = 0, rodando = false;
  // no celular o botão fica sobre a margem do texto: some ao descer lendo e
  // volta ao subir (no computador fica sempre à vista)
  var cel = window.matchMedia('(max-width: 767px)'), ultimoY = window.scrollY;
  function recolhe() {
    var y = window.scrollY;
    if (Math.abs(y - ultimoY) < 6) return;
    a.classList.toggle('is-recolhido', cel.matches && y > ultimoY && y > 160);
    ultimoY = y;
  }
  function segue() {
    recolhe();
    ate = performance.now() + 600;
    if (rodando) return;
    rodando = true;
    requestAnimationFrame(function quadro(t) {
      prende();
      if (t < ate) requestAnimationFrame(quadro); else rodando = false;
    });
  }
  window.addEventListener('scroll', segue, { passive: true });
  window.addEventListener('resize', segue);
  window.addEventListener('load', segue);
  if (nav) { nav.addEventListener('transitionrun', segue); nav.addEventListener('transitionend', segue); }
  prende();
})();
