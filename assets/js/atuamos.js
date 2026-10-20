/* Como Atuamos (19/10): cada seção .atuar ganha .is-visible ao aparecer e a
   variável --p (0 quando entra por baixo, 1 quando o meio dela chega ao meio da
   tela), usada no zoom lento da foto e no deslocamento dos cartões. */
(function () {
  var secs = [].slice.call(document.querySelectorAll('.atuar'));
  if (!secs.length) return;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduz) { secs.forEach(function (s) { s.classList.add('is-visible'); s.style.setProperty('--p', 1); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.2 });
  secs.forEach(function (s) { io.observe(s); });
  var pedido = false;
  function atualiza() {
    pedido = false;
    var h = innerHeight;
    secs.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;
      var p = Math.min(1, Math.max(0, (h - r.top) / (h * 0.5 + r.height * 0.5)));
      s.style.setProperty('--p', p.toFixed(3));
    });
  }
  function pede() { if (!pedido) { pedido = true; requestAnimationFrame(atualiza); } }
  addEventListener('scroll', pede, { passive: true });
  addEventListener('resize', pede);
  atualiza();
})();
