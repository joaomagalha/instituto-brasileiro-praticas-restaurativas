/* Missão e visão (O Instituto, 19/10): monta as mini-interfaces quando o cartão
   aparece (.is-visible, uma vez) e só deixa os loops rodando com ele na tela
   (.em-tela; as luzinhas em SVG pausam junto). */
(function () {
  var cartoes = document.querySelectorAll('.mv2-cartao');
  if (!cartoes.length) return;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function svgs(c, roda) { c.querySelectorAll('svg').forEach(function (s) { if (s.pauseAnimations) { roda && !reduz ? s.unpauseAnimations() : s.pauseAnimations(); } }); }
  cartoes.forEach(function (c) { svgs(c, false); });
  if (!('IntersectionObserver' in window)) { cartoes.forEach(function (c) { c.classList.add('is-visible', 'em-tela'); svgs(c, true); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var c = e.target;
      if (e.isIntersecting) c.classList.add('is-visible');
      c.classList.toggle('em-tela', e.isIntersecting);
      svgs(c, e.isIntersecting);
    });
  }, { threshold: 0.3 });
  cartoes.forEach(function (c) { io.observe(c); });
})();
