/* "Na prática" como palco pinado (16/10). Enquanto a seção está na tela,
   lê a rolagem num rAF e marca o contexto ativo (data-passo 0|1|2) e o
   progresso (--pv-prog, 0 a 3). Só trava no computador (mesma media query
   do pratica.css); fora dela os 3 contextos ficam abertos. */
(function () {
  var sec = document.getElementById('pratica-viva');
  if (!sec || !sec.classList.contains('pratica-palco')) return;
  var itens = Array.prototype.slice.call(sec.querySelectorAll('.pv-ctx2'));
  var mq = window.matchMedia('(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)');
  var atual = -1, pedido = 0, visivel = false;
  var etqNum = sec.querySelector('.pv-palco__etiqueta-num');
  var etqNome = sec.querySelector('.pv-palco__etiqueta-nome');
  var nomes = itens.map(function (li) { return li.querySelector('.pv-ctx2__titulo').textContent; });

  function marca(passo) {
    if (passo === atual) return;
    atual = passo;
    sec.setAttribute('data-passo', String(passo));
    itens.forEach(function (li, i) {
      li.classList.toggle('is-ativo', i === passo);
      li.querySelector('.pv-ctx2__topo').setAttribute('aria-expanded', String(!mq.matches || i === passo));
    });
    if (etqNum) etqNum.textContent = '0' + (passo + 1) + '/0' + itens.length;
    if (etqNome) etqNome.textContent = nomes[passo];
  }
  function mede() {
    pedido = 0;
    if (!mq.matches) { sec.style.removeProperty('--pv-prog'); marca(0); return; }
    var r = sec.getBoundingClientRect();
    var total = sec.offsetHeight - window.innerHeight;
    var p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) * 3 : 0;
    sec.style.setProperty('--pv-prog', p.toFixed(3));
    marca(Math.min(2, Math.floor(p)));
  }
  function agenda() { if (visivel && !pedido) pedido = requestAnimationFrame(mede); }

  new IntersectionObserver(function (es) {
    visivel = es[0].isIntersecting;
    if (visivel) { sec.classList.add('is-in'); agenda(); }
  }, { threshold: 0.12 }).observe(sec);
  window.addEventListener('scroll', agenda, { passive: true });
  window.addEventListener('resize', agenda);
  if (mq.addEventListener) mq.addEventListener('change', mede);

  /* clicar num contexto rola até o trecho dele (só com a trava) */
  itens.forEach(function (li, i) {
    li.querySelector('.pv-ctx2__topo').addEventListener('click', function () {
      if (!mq.matches) return;
      var total = sec.offsetHeight - window.innerHeight;
      var topo = sec.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: topo + total * ((i + 0.5) / 3), behavior: 'smooth' });
    });
  });
  mede();
})();
