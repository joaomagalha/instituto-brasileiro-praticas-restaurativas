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
  // --p vai só na foto (20/10): gravada na seção, recalculava a seção inteira, com
  // os cartões de vidro, a cada quadro; os cartões não andam mais com a rolagem
  var fotos = secs.map(function (s) { return s.querySelector('.atuar__img'); });
  var vistas = 0, pedido = false;
  function atualiza() {
    pedido = false;
    var h = innerHeight;
    secs.forEach(function (s, i) {
      if (!fotos[i]) return;
      var r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;
      var p = Math.min(1, Math.max(0, (h - r.top) / (h * 0.5 + r.height * 0.5)));
      fotos[i].style.setProperty('--p', p.toFixed(3));
    });
  }
  function pede() { if (vistas && !pedido) { pedido = true; requestAnimationFrame(atualiza); } }
  var naTela = new IntersectionObserver(function (es) {
    es.forEach(function (e) { vistas += e.isIntersecting ? 1 : (e.target.__vista ? -1 : 0); e.target.__vista = e.isIntersecting; });
    pede();
  });
  secs.forEach(function (s) { naTela.observe(s); });
  addEventListener('scroll', pede, { passive: true });
  addEventListener('resize', pede);
  atualiza();
})();
