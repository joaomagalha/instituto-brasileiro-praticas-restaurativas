// Protótipo 15/10/2026: revelador no lugar do AOS + citação que acende +
// fio dourado. Só marca classes; quem anima é o CSS (motion.css).
(function () {
  var raiz = document.documentElement;
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Citação: quebra o texto em palavras e destaca "um caminho"
  var cit = document.querySelector('.quote-mark__text');
  if (cit) {
    var palavras = cit.textContent.trim().split(/\s+/);
    cit.innerHTML = palavras.map(function (p, i) {
      return '<span class="palavra" style="--i:' + i + '">' + p + '</span>';
    }).join(' ');
    var spans = cit.querySelectorAll('.palavra');
    for (var i = 0; i < spans.length - 1; i++) {
      if (spans[i].textContent === 'um' && /^caminho/.test(spans[i + 1].textContent)) {
        spans[i].classList.add('destaque'); spans[i + 1].classList.add('destaque');
      }
    }
  }

  // Propósito em palco: 3 cards, o ativo no centro (data-pos 0), vizinhos em
  // -1 e +1. Com 3 cards o loop é natural: cada um anda uma casa.
  var palco = document.getElementById('palco');
  if (palco) {
    var cards = Array.prototype.slice.call(palco.querySelectorAll('.proposito-card'));
    var dots = Array.prototype.slice.call((palco.closest('.proposito') || document).querySelectorAll('.palco__dot'));
    var status = document.getElementById('palcoStatus');
    var secao = palco.closest('.proposito') || document;
    var contNum = secao.querySelector('.proposito__contador-num');
    var n = cards.length, atual = 0;
    var posDe = function (i) { var d = (i - atual + n) % n; return d === 0 ? 0 : (d === 1 ? 1 : -1); };
    var redesenha = function (card) {
      cards.forEach(function (c) { c.classList.remove('chegou'); });
      card.classList.remove('is-visible'); void card.offsetWidth; card.classList.add('is-visible', 'chegou');
    };
    var aplica = function (anuncia) {
      cards.forEach(function (c, i) {
        var p = posDe(i), antes = c.getAttribute('data-pos');
        // quem dá a volta (de uma borda pra outra) não atravessa o palco:
        // pula escondido e reaparece no lugar novo
        if (antes !== null && Math.abs(p - Number(antes)) === 2) {
          c.classList.add('salta');
          requestAnimationFrame(function () { requestAnimationFrame(function () { c.classList.remove('salta'); }); });
        }
        c.setAttribute('data-pos', p);
        c.setAttribute('aria-hidden', p === 0 ? 'false' : 'true');
        var lk = c.querySelector('a'); if (lk) lk.tabIndex = p === 0 ? 0 : -1;
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === atual);
        if (i === atual) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      if (contNum) contNum.textContent = (atual < 9 ? '0' : '') + (atual + 1);
      if (anuncia && status) status.textContent = (atual + 1) + ' de ' + n + ': ' + cards[atual].querySelector('.proposito-card__title').textContent;
    };
    var vai = function (i) {
      atual = (i + n) % n; palco.classList.add('ja-trocou'); aplica(true);
      if (palco.classList.contains('is-in')) redesenha(cards[atual]);
    };
    aplica(false);
    // loops das ilustrações só rodam com o palco na tela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { palco.classList.toggle('em-tela', es[0].isIntersecting); }, { threshold: 0.05 }).observe(palco);
    } else { palco.classList.add('em-tela'); }
    (palco.closest('.proposito') || document).querySelector('.palco__seta--ant').addEventListener('click', function () { vai(atual - 1); });
    (palco.closest('.proposito') || document).querySelector('.palco__seta--prox').addEventListener('click', function () { vai(atual + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { vai(i); }); });
    // clicar num vizinho traz ele pro centro (o link dele fica fora do Tab)
    var arrastou = 0;
    palco.addEventListener('click', function (e) {
      var c = e.target.closest('.proposito-card');
      if (!c) return;
      // o clique que o navegador solta no fim de um arrasto não conta
      if (Date.now() - arrastou < 400) { e.preventDefault(); return; }
      var p = c.getAttribute('data-pos');
      if (p !== '0') e.preventDefault();
      if (p === '1') vai(atual + 1); else if (p === '-1') vai(atual - 1);
    });
    palco.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { vai(atual + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { vai(atual - 1); e.preventDefault(); }
    });
    // arrastar: dedo pelos eventos de toque (o pointer pode ser cancelado
    // pela rolagem), mouse pelo pointer; 40 px na horizontal pra trocar
    var x0 = null, y0 = 0;
    var inicio = function (x, y) { x0 = x; y0 = y; };
    var fim = function (x, y) {
      if (x0 === null) return;
      var dx = x - x0, dy = y - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { arrastou = Date.now(); vai(atual + (dx < 0 ? 1 : -1)); }
    };
    palco.addEventListener('touchstart', function (e) { inicio(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    palco.addEventListener('touchend', function (e) { var t = e.changedTouches[0]; fim(t.clientX, t.clientY); }, { passive: true });
    palco.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') inicio(e.clientX, e.clientY); });
    palco.addEventListener('pointerup', function (e) { if (e.pointerType === 'mouse') fim(e.clientX, e.clientY); });
  }

  // Hero preso: quando a folha cobre o hero inteiro, o vídeo pausa; volta ao subir
  var lencol = document.getElementById('lencol'), heroVideo = document.querySelector('.hero__video');
  if (lencol && heroVideo && 'IntersectionObserver' in window && !reduzido) {
    var marca = document.createElement('div');
    marca.setAttribute('aria-hidden', 'true');
    marca.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none';
    lencol.prepend(marca);
    new IntersectionObserver(function (es) {
      var e = es[0];
      if (!e.isIntersecting && e.boundingClientRect.top < 0) heroVideo.pause();
      else heroVideo.play().catch(function () {});
    }).observe(marca);
  }

  // Fio: mede o comprimento de cada traço pro desenho começar do zero
  document.querySelectorAll('.fio path').forEach(function (p) {
    p.style.setProperty('--len', Math.ceil(p.getTotalLength()));
  });

  // Como Atuamos em andares: o realce da lista passa pelos 3 subpontos e a
  // legenda ao lado acompanha. Só gira com o andar na tela.
  document.querySelectorAll('.atua-andar').forEach(function (andar) {
    var itens = andar.querySelectorAll('.atua-ui__item');
    var leg = andar.querySelector('.atua-ui__legenda');
    if (!itens.length) return;
    var i = 0, timer = null;
    var marca = function (k) {
      itens.forEach(function (it, j) { it.classList.toggle('is-on', j === k); });
      if (leg && leg.textContent !== itens[k].textContent) {
        leg.classList.add('troca');
        setTimeout(function () { leg.textContent = itens[k].textContent; leg.classList.remove('troca'); }, 350);
      }
    };
    marca(0);
    if (reduzido || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !timer) timer = setInterval(function () { i = (i + 1) % itens.length; marca(i); }, 2600);
      else if (!es[0].isIntersecting && timer) { clearInterval(timer); timer = null; }
    }, { threshold: 0.3 }).observe(andar);
  });

  // Formações em pilha: foi pro pilha.js (19/10, compartilhado com a página Formações)

  // Atraso em cascata: data-aos-delay (herdado do AOS) ou a ordem entre irmãos
  var alvos = document.querySelectorAll('[data-aos], .quote-mark, .fio, .palco, .fpilha');
  alvos.forEach(function (el) {
    var d = el.getAttribute('data-aos-delay');
    if (d) el.style.setProperty('--atraso', (parseInt(d, 10) / 1000) + 's');
  });

  if (reduzido || !('IntersectionObserver' in window)) {
    alvos.forEach(function (el) { el.classList.add('is-in'); });
    document.querySelectorAll('.founder').forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  // Fotos dos fundadores: a cortina começa a abrir antes de a foto entrar na
  // tela (o gatilho geral só disparava com ~180px dela já à vista).
  var fundadores = document.querySelectorAll('.founder');
  var vigiaFund = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); vigiaFund.unobserve(e.target); } });
  }, { rootMargin: '0px 0px 15% 0px', threshold: 0 });
  fundadores.forEach(function (f) { vigiaFund.observe(f); });

  var vigia = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); vigia.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  alvos.forEach(function (el) { vigia.observe(el); });
})();
