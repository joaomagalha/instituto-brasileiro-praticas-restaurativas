/* "O que sustenta" no celular, versão sanfona (João, 20/10): um botão em cada
   pilar mostra ou esconde o texto inteiro. O texto continua no HTML; o botão
   só aparece quando a sanfona está ligada no CSS. */
(function () {
  document.querySelectorAll('.sustenta:not(.sustenta--apoio) .sustenta__pilar').forEach(function (p, i) {
    var t = p.querySelector('.sustenta__texto'); if (!t) return;
    if (!t.id) t.id = 'sustenta-texto-' + (i + 1);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sustenta__abrir';
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', t.id);
    b.innerHTML = '<span>Ler o texto completo</span><i aria-hidden="true" class="fa-solid fa-plus"></i>';
    b.addEventListener('click', function () {
      var on = p.classList.toggle('is-aberto');
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
      b.firstChild.textContent = on ? 'Fechar o texto' : 'Ler o texto completo';
    });
    t.parentNode.insertBefore(b, t);
  });
})();
