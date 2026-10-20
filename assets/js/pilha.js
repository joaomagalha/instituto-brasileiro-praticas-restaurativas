/* Formações em pilha (estilo clay.com), compartilhado entre a Home e a página
   Formações (19/10, saiu do motion.js sem mudar a conta): o card de baixo recua e
   escurece conforme o próximo sobe por cima. Só transform/opacity, 1 rAF por
   rolagem. Também marca a entrada (.is-in) onde não há motion.js; na Home o
   motion.js já marca, e marcar de novo não muda nada. */
(function () {
  var pilha = document.getElementById('fpilha');
  if (!pilha) return;
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduzido || !('IntersectionObserver' in window)) { pilha.classList.add('is-in'); }
  else {
    new IntersectionObserver(function (es, io) {
      if (es[0].isIntersecting) { pilha.classList.add('is-in'); io.disconnect(); }
    }, { rootMargin: '0px 0px -10% 0px' }).observe(pilha);
  }
  if (reduzido) return;
  var fcards = Array.prototype.slice.call(pilha.querySelectorAll('.fcard'));
  var pedidoP = false, vendoP = false;
  var recua = function () {
    pedidoP = false;
    for (var k = 0; k < fcards.length - 1; k++) {
      var c = fcards[k], r = c.getBoundingClientRect(), rn = fcards[k + 1].getBoundingClientRect();
      var p = 1 - Math.min(1, Math.max(0, (rn.top - r.top) / r.height));
      c.style.setProperty('--recuo', (1 - 0.07 * p).toFixed(4));
      c.style.setProperty('--escuro', (0.22 * p).toFixed(3));
    }
  };
  window.addEventListener('scroll', function () { if (vendoP && !pedidoP) { pedidoP = true; requestAnimationFrame(recua); } }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vendoP = es[0].isIntersecting; pilha.classList.toggle('em-tela', vendoP); if (vendoP) recua(); }).observe(pilha);
})();
