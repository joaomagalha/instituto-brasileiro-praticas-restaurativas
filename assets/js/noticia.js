/* Corpo da notícia (19/10): marca .is-in na foto, em cada parágrafo, na fonte e
   no fim quando entram na tela (a animação é do noticia.css). */
(function () {
  var corpo = document.querySelector('.noticia-corpo');
  if (!corpo) return;
  var itens = corpo.querySelectorAll('.noticia-figura, .prose p, .noticia-fonte, .noticia-fim');
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
