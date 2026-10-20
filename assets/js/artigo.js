/* Corpo do artigo (19/10): marca .is-in nos autores, no resumo, em cada
   parágrafo/fala, no "Como citar" e no fim quando entram na tela (a animação é
   do artigo.css), igual ao noticia.js. */
(function () {
  var corpo = document.querySelector('.artigo-corpo-secao');
  if (!corpo) return;
  var itens = corpo.querySelectorAll('.artigo-autor, .artigo-resumo, .prose--artigo > *, .artigo-citar, .noticia-fim');
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduz || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(itens, function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -4% 0px', threshold: 0 });
  Array.prototype.forEach.call(itens, function (el) { io.observe(el); });
})();
