/* "O que muda" (27/11/2026): dois botões que alternam as listas. Sem JS as
   duas aparecem. Setas, Home e End trocam de aba pelo teclado. */
(function () {
  var caixa = document.querySelector('[data-abas]');
  if (!caixa) return;
  var abas = Array.prototype.slice.call(caixa.querySelectorAll('[role="tab"]'));
  var paineis = abas.map(function (a) { return document.getElementById(a.getAttribute('aria-controls')); });
  function ativa(i, foco) {
    abas.forEach(function (a, k) {
      a.setAttribute('aria-selected', k === i ? 'true' : 'false');
      a.tabIndex = k === i ? 0 : -1;
      paineis[k].hidden = k !== i;
    });
    if (foco) abas[i].focus();
  }
  abas.forEach(function (a, i) {
    paineis[i].setAttribute('role', 'tabpanel');
    paineis[i].setAttribute('aria-labelledby', a.id);
    a.addEventListener('click', function () { ativa(i); });
    a.addEventListener('keydown', function (e) {
      var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      ativa((n + abas.length) % abas.length, true);
    });
  });
  caixa.classList.add('com-abas');
  ativa(0);
})();
