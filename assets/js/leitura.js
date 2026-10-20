/* Leitura guiada (Práticas Restaurativas, 17/10): o contador grande do lado
   esquerdo mostra o passo que está no meio da tela. Só troca o número. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  document.querySelectorAll('.leitura').forEach(function (sec) {
    var atual = sec.querySelector('.leitura__atual');
    if (!atual) return;
    var passos = [].slice.call(sec.querySelectorAll('.leitura__passo'));
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = ('0' + (passos.indexOf(e.target) + 1)).slice(-2);
        if (atual.textContent === n) return;
        atual.textContent = n;
        atual.classList.remove('troca'); void atual.offsetWidth; atual.classList.add('troca');
      });
    }, { rootMargin: '-48% 0px -48% 0px' });
    passos.forEach(function (p) { io.observe(p); });
  });
})();

/* Bolinhas da linha (João, 19/10: "a primeira bolinha não aparece preenchida" e
   "desalinhadas"): a bolinha enche quando o enchimento da linha chega nela e fica
   cheia. A linha continua no CSS (view timeline); aqui só se lê até onde ela
   chegou. Sem suporte ou com menos movimento, a linha já está cheia e as
   bolinhas também (nenhuma recebe .vazio). */
(function () {
  if (!(window.CSS && CSS.supports('animation-timeline: view()'))) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var listas = [].slice.call(document.querySelectorAll('.leitura__passos'));
  if (!listas.length) return;
  var pedido = false, vistas = 0;
  var rem = parseFloat(getComputedStyle(document.documentElement).fontSize); // lido uma vez (20/10)
  function escala(lista) {
    var t = getComputedStyle(lista, '::after').transform;
    if (!t || t === 'none') return 1;
    var m = t.match(/matrix\(([^)]+)\)/);
    return m ? parseFloat(m[1].split(',')[3]) : 1;
  }
  function atualiza() {
    pedido = false;
    listas.forEach(function (lista) {
      if (!lista.__vista) return;
      var r = lista.getBoundingClientRect();
      var ponta = r.top + 0.6 * rem + escala(lista) * (r.height - 1.2 * rem);
      lista.querySelectorAll('.leitura__passo').forEach(function (p) {
        var n = p.querySelector('.leitura__num').getBoundingClientRect();
        var centro = n.top - 0.15 * rem + 0.6 * rem;
        p.classList.toggle('vazio', centro > ponta + 1);
      });
    });
  }
  function pede() { if (vistas && !pedido) { pedido = true; requestAnimationFrame(atualiza); } }
  // só lê a linha enquanto a lista está perto da tela (20/10)
  var perto = new IntersectionObserver(function (es) {
    es.forEach(function (e) { vistas += e.isIntersecting ? 1 : (e.target.__vista ? -1 : 0); e.target.__vista = e.isIntersecting; });
    pede();
  }, { rootMargin: '200px 0px' });
  listas.forEach(function (l) { perto.observe(l); });
  addEventListener('scroll', pede, { passive: true });
  addEventListener('resize', pede);
})();
