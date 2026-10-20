/* ===== MOVIMENTO NA ROLAGEM, TOCADO EM TEMPO (João, 20/10/2026: "a rolagem está
   dando trancos"). Antes, dezenas de animações ficavam presas à roda do mouse
   (CSS animation-timeline: view()/scroll()): cada parágrafo, cada cartão e o topo
   da Home com o vídeo eram recalculados a cada quadro. No teste no Chrome dele,
   desligar só isso deixou a rolagem lisa. Aqui o mesmo movimento é disparado
   quando o elemento cruza uma linha da tela (IntersectionObserver) e tocado em
   tempo pela placa de vídeo (Web Animations: só opacidade e posição). Nada roda
   enquanto a roda gira; só quando algo cruza a linha.
   - Saída perto do topo: quando o meio do bloco passa da linha de 6% da tela, ele
     some subindo um pouco; ao voltar a rolar pra cima, volta.
   - Topo da Home: depois de ~15% da tela rolada, o texto sai e o vídeo escurece.
   - Blocos grandes da Home encaixam (0,94 → 1) ao aparecer.
   - Passos da leitura (Práticas): sobem ao aparecer; o do meio da tela fica cheio.
   Quem pediu menos movimento no sistema não vê nada disso. ===== */
(function () {
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-rolagem');

  var SAIDA = [
    /* Home */
    '.topo-secao', '.palco-moldura', '.atua-andar', '.quote-mark', '.founder', '.formacoes__beneficios',
    /* páginas internas */
    '.hero-interna__conteudo', '.citacao-cartao:not(.citacao-cartao--cta)', '.leitura__lado', '.sustenta__topo',
    '.sustenta__pilar', '.mv2__topo', '.mv2-cartao', '.orienta__topo', '.orienta__faixa', '.founders__titulo',
    '.pessoa-cartao', '.convite', '.atuar__foto', '.catalogo__topo', '.fint__para', '.aluno__texto',
    '.mov-noticias .section-header', '#artigos .section-header', '.section > .container > *',
    '.leitura__passo', '.abordagem__lado', '.abordagem__texto', '.fint__topo', '.fint__eixo', '.atuar__item',
    '.aluno__tela', '.mov-noticias .noticia-card', '#artigos .artigo-card',
    /* formações */
    '.curso-cap__titulo', '.curso-checks li', '.curso-publico li', '.curso-eixo', '.curso-modulos .course-modules__bar',
    '.curso-modulo', '.curso-fundamento', '.curso-resultado', '.curso-temas li',
    /* artigos e notícias */
    '.artigo-corpo-secao .artigo-autor', '.artigo-corpo-secao .artigo-resumo', '.artigo-corpo-secao .prose--artigo > *',
    '.artigo-corpo-secao .artigo-citar', '.noticia-corpo .noticia-figura', '.noticia-corpo .prose p', '.noticia-corpo .noticia-fonte'
  ].join(',');

  var LINHA = 0.06;          // a saída começa quando o meio do bloco passa de 6% da tela
  var SAI = { duration: 450, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' };
  var passos = []; for (var i = 0; i <= 20; i++) passos.push(i / 20);

  /* toca a saída ou a volta, sem empilhar animações no mesmo elemento */
  function sair(el, fora) {
    if (!!el.__fora === fora) return;
    el.__fora = fora;
    if (!el.__anim) {
      el.__anim = el.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -5vh' }], SAI);
      el.__anim.pause();
      el.__anim.currentTime = 0;
    }
    el.__anim.playbackRate = fora ? 1 : -1;
    el.__anim.play();
  }

  var obsSaida = new IntersectionObserver(function (entradas) {
    var linha = innerHeight * LINHA;
    entradas.forEach(function (e) {
      var r = e.boundingClientRect;
      sair(e.target, r.top + r.height / 2 < linha);
    });
  }, { threshold: passos });
  document.querySelectorAll(SAIDA).forEach(function (el) {
    if (el.closest('.cta-final, footer, .fpilha')) return; // a chamada final, a pilha de Formações e o rodapé ficam de fora (como antes)
    obsSaida.observe(el);
  });

  /* topo da Home: texto sai e o vídeo escurece depois de ~15% da tela rolada */
  var hero = document.querySelector('.hero');
  var heroTexto = hero && hero.querySelector('.hero__content');
  if (hero && heroTexto) {
    var textoAnim = heroTexto.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,-8vh,0)' }], { duration: 500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    var veuAnim = hero.animate([{ opacity: 0 }, { opacity: 0.45 }], { duration: 600, easing: 'ease', fill: 'forwards', pseudoElement: '::after' });
    textoAnim.pause(); veuAnim.pause();
    var heroFora = false;
    var olhaHero = function () {
      var fora = scrollY > innerHeight * 0.15;
      if (fora === heroFora) return;
      heroFora = fora;
      [textoAnim, veuAnim].forEach(function (a) { a.playbackRate = fora ? 1 : -1; a.play(); });
    };
    addEventListener('scroll', olhaHero, { passive: true });
    olhaHero();
  }

  /* blocos grandes da Home encaixam ao aparecer (uma vez) */
  var obsEncaixe = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.animate([{ transform: 'scale(0.94)' }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' });
      obsEncaixe.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.proposito, .solucoes, .pratica-viva').forEach(function (el) {
    if (el.getBoundingClientRect().top > innerHeight) obsEncaixe.observe(el);
  });

  /* passos da leitura: sobem ao aparecer; o da faixa do meio fica cheio */
  var leitura = document.querySelectorAll('.leitura__passo');
  if (leitura.length) {
    var obsEntra = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); obsEntra.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    var obsMeio = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { e.target.classList.toggle('no-meio', e.isIntersecting); });
    }, { rootMargin: '-35% 0px -35% 0px' });
    leitura.forEach(function (el) { obsEntra.observe(el); obsMeio.observe(el); });
  }
})();
