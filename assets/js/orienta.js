/* O que nos orienta (O Instituto, 19/10): um bloco aberto por vez; a linha do topo
   carrega e, ao terminar, abre o próximo (em loop). Só roda com a seção na tela;
   pausa com o mouse em cima; clique ou teclado abrem o bloco escolhido. Quem pediu
   menos movimento troca só no clique. */
(function () {
  var sec = document.querySelector('.orienta');
  if (!sec) return;
  var blocos = [].slice.call(sec.querySelectorAll('.orienta-bloco'));
  var atual = 0;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function abre(i) {
    atual = (i + blocos.length) % blocos.length;
    blocos.forEach(function (b, k) {
      var on = k === atual;
      b.classList.toggle('is-ativo', on);
      b.querySelector('.orienta-bloco__cab').setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    var linha = blocos[atual].querySelector('.orienta-bloco__linha i');
    linha.style.animation = 'none'; void linha.offsetWidth; linha.style.animation = '';
  }
  blocos.forEach(function (b, k) {
    b.querySelector('.orienta-bloco__cab').addEventListener('click', function () { abre(k); });
    b.addEventListener('click', function (e) { if (!b.classList.contains('is-ativo') && !e.target.closest('.orienta-bloco__cab')) abre(k); });
    b.querySelector('.orienta-bloco__linha i').addEventListener('animationend', function () { if (b.classList.contains('is-ativo')) abre(k + 1); });
  });
  // tempo restante ao lado do "1 de 4" (lido da própria animação da linha, então pausa junto)
  // e a folha que cresce a cada volta do ciclo (bloco 1)
  var ciclo = sec.querySelector('.orienta-ilu--1'), folhas = 1;
  var _abre = abre; abre = function (i) { _abre(i); if (ciclo) { folhas = 1; ciclo.setAttribute('data-folhas', 1); } };
  if (reduz) return;
  setInterval(function () {
    var b = blocos[atual], t = b.querySelector('.orienta-bloco__tempo'), an = b.querySelector('.orienta-bloco__linha i').getAnimations()[0];
    var dur = parseFloat(getComputedStyle(b).getPropertyValue('--dur')) * 1000 || 7000;
    if (t) t.textContent = ' · ' + Math.max(1, Math.ceil((dur - (an ? an.currentTime : 0)) / 1000)) + 's';
  }, 250);
  if (ciclo) setInterval(function () { if (blocos[0].classList.contains('is-ativo') && sec.classList.contains('em-tela') && !blocos[0].matches(':hover')) { folhas = folhas % 4 + 1; ciclo.setAttribute('data-folhas', folhas); } }, 1750);
  sec.classList.add('rodando');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { sec.classList.toggle('em-tela', es[0].isIntersecting); }, { threshold: 0.35 }).observe(sec);
  } else { sec.classList.add('em-tela'); }
})();
