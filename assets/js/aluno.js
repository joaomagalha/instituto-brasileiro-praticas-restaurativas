/* Formações, "Já é aluno" (19/10, refinada): marca a seção ao aparecer e roda o
   ciclo da mini-tela. Um item por vez: o item da esquerda acende, a linha dele
   carrega e, ao terminar, abre o próximo (em loop), como os Princípios do O
   Instituto. Só roda com a seção na tela; pausa com o mouse em cima; clique ou
   teclado escolhem o item. Quem pede menos movimento troca só no clique. */
(function () {
  var sec = document.querySelector('.aluno');
  if (!sec) return;
  var botoes = [].slice.call(sec.querySelectorAll('.aluno__perk'));
  var estados = [].slice.call(sec.querySelectorAll('.aluno-ui__estado'));
  var lados = [].slice.call(sec.querySelectorAll('.aluno-ui__lateral span'));
  var atual = 0;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function abre(i) {
    atual = (i + botoes.length) % botoes.length;
    botoes.forEach(function (b, k) { b.classList.toggle('is-ativo', k === atual); b.setAttribute('aria-pressed', k === atual ? 'true' : 'false'); });
    estados.forEach(function (e, k) { e.classList.toggle('is-ativo', k === atual); });
    lados.forEach(function (l, k) { l.classList.toggle('is-ativo', k === atual); });
    var linha = botoes[atual].querySelector('.aluno__perk-linha i');
    linha.style.animation = 'none'; void linha.offsetWidth; linha.style.animation = '';
    // reinicia as animações internas do estado que abriu
    estados[atual].querySelectorAll('*').forEach(function (el) { el.getAnimations && el.getAnimations().forEach(function (a) { a.currentTime = 0; }); });
  }
  botoes.forEach(function (b, k) {
    b.addEventListener('click', function () { abre(k); });
    b.querySelector('.aluno__perk-linha i').addEventListener('animationend', function () { if (b.classList.contains('is-ativo')) abre(k + 1); });
  });
  var cartao = sec.querySelector('.aluno__cartao');
  cartao.addEventListener('mouseenter', function () { sec.classList.add('pausa'); });
  cartao.addEventListener('mouseleave', function () { sec.classList.remove('pausa'); });
  cartao.addEventListener('focusin', function () { sec.classList.add('pausa'); });
  cartao.addEventListener('focusout', function () { sec.classList.remove('pausa'); });
  if (!('IntersectionObserver' in window) || reduz) { sec.classList.add('is-visible', 'em-tela'); return; }
  sec.classList.add('rodando');
  new IntersectionObserver(function (es) {
    var v = es[0].isIntersecting;
    sec.classList.toggle('em-tela', v);
    if (v) sec.classList.add('is-visible');
  }, { threshold: 0.3 }).observe(sec);
})();
