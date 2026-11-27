/* O que nos orienta (O Instituto, 26/11/2026, lista editorial): marca cada
   princípio com .is-in quando ele entra na tela, uma vez, pra linha desenhar e
   o conteúdo subir. Quem pediu menos movimento vê tudo parado (CSS).
   Versão anterior (faixa com 4 blocos em loop): scratchpad instituto/orienta-antes-lista.js. */
(function () {
  var itens = document.querySelectorAll('.ori2-item');
  if (!itens.length) return;
  document.documentElement.classList.add('ori2-js');
  if (!('IntersectionObserver' in window)) { itens.forEach(function (i) { i.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
  itens.forEach(function (i) { io.observe(i); });
})();
