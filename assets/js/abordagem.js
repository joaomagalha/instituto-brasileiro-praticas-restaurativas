/* Nossa abordagem (O Instituto, 19/10): marca a seção ao aparecer (o título e o
   texto sobem uma vez) e acende os três traços sob o título conforme a leitura. */
(function () {
  var sec = document.querySelector('.abordagem');
  if (!sec) return;
  if (!('IntersectionObserver' in window)) { sec.classList.add('is-visible'); return; }
  new IntersectionObserver(function (es, io) {
    if (es[0].isIntersecting) { sec.classList.add('is-visible'); io.disconnect(); }
  }, { threshold: 0.3 }).observe(sec);
  /* 26/11: o fio saiu; a mesma conta de leitura acende os três traços da logo
     sob o título (data-passo 1 a 3, como o leitura.js de Práticas) */
  var texto = sec.querySelector('.abordagem__texto'), pedido = false;
  if (!texto || !sec.querySelector('.abordagem__tracos')) return;
  function enche() {
    pedido = false;
    var r = texto.getBoundingClientRect(), h = innerHeight;
    var p = Math.min(1, Math.max(0, (h * 0.75 - r.top) / (r.height + h * 0.25)));
    sec.dataset.passo = String(p >= 0.9 ? 3 : p >= 0.5 ? 2 : p > 0.08 ? 1 : 0);
  }
  addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(enche); } }, { passive: true });
  enche();
})();
