/* Nossa abordagem (O Instituto, 19/10): marca a seção ao aparecer (o título e o
   texto sobem uma vez) e enche o fio ao lado do texto conforme a leitura. */
(function () {
  var sec = document.querySelector('.abordagem');
  if (!sec) return;
  if (!('IntersectionObserver' in window)) { sec.classList.add('is-visible'); return; }
  new IntersectionObserver(function (es, io) {
    if (es[0].isIntersecting) { sec.classList.add('is-visible'); io.disconnect(); }
  }, { threshold: 0.3 }).observe(sec);
  var texto = sec.querySelector('.abordagem__texto'), fio = sec.querySelector('.abordagem__fio i'), pedido = false;
  if (!texto || !fio) return;
  function enche() {
    pedido = false;
    var r = texto.getBoundingClientRect(), h = innerHeight;
    var p = Math.min(1, Math.max(0, (h * 0.75 - r.top) / (r.height + h * 0.25)));
    fio.style.transform = 'scaleY(' + p.toFixed(3) + ')';
  }
  addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(enche); } }, { passive: true });
  enche();
})();
