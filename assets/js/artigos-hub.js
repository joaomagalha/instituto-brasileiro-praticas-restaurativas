/* IBPR em Movimento, artigos (19/10): a seção é do build; aqui só se marca a
   entrada (.is-visible na seção e em cada folha) e a variável --p (0 a 1 conforme
   a folha atravessa a tela), usada no parallax da capa e na linha de leitura, e a posição da luz que
   segue o cursor sobre a folha. */
(function () {
  var sec = document.getElementById('artigos');
  if (!sec) return;
  var folhas = [].slice.call(sec.querySelectorAll('.artigo-card'));
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduz) { sec.classList.add('is-visible'); folhas.forEach(function (f) { f.classList.add('is-visible'); f.style.setProperty('--p', 1); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  io.observe(sec); folhas.forEach(function (f) { io.observe(f); });
  var pedido = false;
  function atualiza() {
    pedido = false;
    var h = innerHeight;
    folhas.forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (r.bottom < -100 || r.top > h + 100) return;
      f.style.setProperty('--p', Math.min(1, Math.max(0, (h - r.top) / (h * 0.6 + r.height * 0.6))).toFixed(3));
    });
  }
  function pede() { if (!pedido) { pedido = true; requestAnimationFrame(atualiza); } }
  addEventListener('scroll', pede, { passive: true });
  addEventListener('resize', pede);
  atualiza();
  // luz de papel: segue o cursor sobre a folha (só onde existe mouse)
  if (window.matchMedia && matchMedia('(hover: hover)').matches) folhas.forEach(function (f) {
    f.addEventListener('mousemove', function (e) {
      var r = f.getBoundingClientRect();
      f.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px'); f.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    });
  });
})();
