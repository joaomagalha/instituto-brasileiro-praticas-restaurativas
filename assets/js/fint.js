/* Formações, "Para quem precisa" (19/10): marca a seção ao aparecer; o .is-visible
   dispara as entradas, a linha da trilha e as mini-interfaces. */
(function () {
  var sec = document.querySelector('.fint');
  if (!sec) return;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduz) { sec.classList.add('is-visible'); return; }
  new IntersectionObserver(function (es, io) {
    if (es[0].isIntersecting) { sec.classList.add('is-visible'); io.disconnect(); }
  }, { threshold: 0.2 }).observe(sec);
})();
