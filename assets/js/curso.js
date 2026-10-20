/* Miolo das páginas de formação (19/10, "traço que se desenha"): marca .is-in
   nos capítulos quando entram na tela (o desenho é do curso.css), desenha o
   fio fino dos eixos soltando cada cartão quando ele chega e move o índice
   vivo do cartão (capítulo atual, anel de progresso e trilhos). */
(function () {
  var main = document.querySelector('.curso__main');
  if (!main) return;
  var raiz = document.documentElement;
  raiz.classList.add('js-curso');
  var caps = Array.prototype.slice.call(main.querySelectorAll('[data-cap]'));
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var eixos = Array.prototype.slice.call(main.querySelectorAll('.curso-eixo'));

  // fio dos eixos: se desenha em comprimento real e solta os cartões em sequência
  var fio = main.querySelector('.curso-eixos__tinta');
  function escreve() {
    var visivel = fio && fio.getBoundingClientRect().width > 0;
    if (fio) fio.classList.add('is-pronta');
    if (reduz || !visivel) {
      eixos.forEach(function (e, i) { setTimeout(function () { e.classList.add('is-solto'); }, reduz ? 0 : i * 160); });
      return;
    }
    var total = fio.getTotalLength(), dur = 1100;
    fio.style.strokeDasharray = total + ' ' + total;
    fio.style.strokeDashoffset = total;
    fio.getBoundingClientRect();
    fio.style.transition = 'stroke-dashoffset ' + dur + 'ms cubic-bezier(0.65, 0, 0.35, 1)';
    fio.style.strokeDashoffset = 0;
    [0, 0.5, 0.97].forEach(function (mk, i) {
      setTimeout(function () { if (eixos[i]) eixos[i].classList.add('is-solto'); }, mk * dur);
    });
  }

  function entra(el) {
    el.classList.add('is-in');
    if (el.id === 'eixos') setTimeout(escreve, reduz ? 0 : 150);
  }

  if ('IntersectionObserver' in window && !reduz) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { entra(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    caps.forEach(function (c) { io.observe(c); });
  } else {
    caps.forEach(entra);
  }

  // índice vivo
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-indice]'));
  var num = document.querySelector('.curso-indice__num');
  var nome = document.querySelector('.curso-indice__nome');
  var anel = document.querySelector('.curso-indice__anel');
  var atual = -1;
  function troca(el, txt) {
    if (!el) return;
    el.textContent = txt;
    if (reduz) return;
    el.classList.remove('is-troca'); void el.offsetWidth; el.classList.add('is-troca');
  }
  function indice() {
    var h = window.innerHeight, ativo = 0;
    caps.forEach(function (c, i) { if (c.getBoundingClientRect().top < h * 0.45) ativo = i; });
    if (ativo !== atual) {
      atual = ativo;
      links.forEach(function (a, i) {
        a.classList.toggle('is-atual', i === ativo);
        a.classList.toggle('is-lido', i < ativo);
      });
      if (num) {
        var s = document.createElement('span');
        num.textContent = ''; num.appendChild(s);
        troca(s, (ativo < 9 ? '0' : '') + (ativo + 1));
      }
      var tx = caps[ativo].querySelector('.curso-cap__txt');
      troca(nome, tx ? tx.textContent : '');
    }
    if (anel) {
      var r = main.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (h * 0.45 - r.top) / r.height));
      anel.style.setProperty('--progresso', (1 - p).toFixed(3));
    }
  }

  var pedido = false;
  function quadroRolagem() { pedido = false; indice(); }
  window.addEventListener('scroll', function () {
    if (!pedido) { pedido = true; requestAnimationFrame(quadroRolagem); }
  }, { passive: true });
  window.addEventListener('resize', indice);
  indice();
})();
