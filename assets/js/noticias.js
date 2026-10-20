/* IBPR em Movimento, notícias (19/10): o miolo é do build; aqui só se marca a
   entrada (.is-visible em cada notícia), a variável --p (0 a 1 conforme a
   notícia atravessa a tela, usada no zoom lento da foto). */
(function () {
  var sec = document.querySelector('.mov-noticias');
  if (!sec) return;
  var cards = [].slice.call(sec.querySelectorAll('.noticia-card'));
  var lista = sec.querySelector('.noticias__lista');
  cards.forEach(function (c, i) { c.style.setProperty('--k', i); });
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduz) { sec.classList.add('is-visible'); cards.forEach(function (c) { c.classList.add('is-visible'); c.style.setProperty('--p', 1); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: '0px 0px -4% 0px' });
  io.observe(sec); cards.forEach(function (c) { io.observe(c); });
  var pedido = false;
  function atualiza() {
    pedido = false;
    var h = innerHeight;
    cards.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.bottom < -100 || r.top > h + 100) return;
      c.style.setProperty('--p', Math.min(1, Math.max(0, (h - r.top) / (h * 0.5 + r.height * 0.5))).toFixed(3));
    });
  }
  function pede() { if (!pedido) { pedido = true; requestAnimationFrame(atualiza); } }
  addEventListener('scroll', pede, { passive: true });
  addEventListener('resize', pede);
  atualiza();
})();
