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
   - Topo da Home: depois de ~15% da tela rolada, os itens sobem em sequência e o véu clareia; na volta, reaparecem devagar.
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

  /* SAÍDA E VOLTA, 2ª versão (26/11, João: "travado ao scrollar para cima").
     Antes: 21 medições por bloco a cada pedacinho de rolagem, e o bloco só
     voltava quando o MEIO dele cruzava a linha; num cartão alto, metade dele já
     estava na tela, invisível, e aparecia de uma vez ao subir.
     Agora: a posição de cada bloco é medida uma vez (e de novo só quando a
     página muda de altura); na rolagem é só conta. O bloco sai quando sobra
     pouco dele na tela e volta assim que a borda de baixo reaparece, com uma
     folga entre as duas linhas pra não ficar liga-desliga. */
  var SAI = { duration: 650, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' };
  var VOLTA = { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' };
  var blocos = [];

  function sair(b, fora) {
    if (b.fora === fora) return;
    b.fora = fora;
    var el = b.el, cs = getComputedStyle(el);
    var de = { opacity: cs.opacity, translate: cs.translate === 'none' ? '0 0' : cs.translate };
    if (b.anim) b.anim.cancel();
    b.anim = el.animate([de, fora ? { opacity: 0, translate: '0 -4vh' } : { opacity: 1, translate: '0 0' }], fora ? SAI : VOLTA);
    /* de volta ao lugar, solta a animação: o bloco deixa de ser camada à parte */
    if (!fora) { var a = b.anim; a.onfinish = function () { if (b.anim === a) { a.cancel(); b.anim = null; } }; }
  }

  function topo(el) { var y = 0; for (var e = el; e; e = e.offsetParent) y += e.offsetTop; return y; } // ignora o translate da animação
  /* bloco preso na tela (position: sticky, ex.: título da leitura em Práticas): só sai
     quando o pai termina, então mede pela posição final dele no fim do pai (26/11) */
  function mede() { blocos.forEach(function (b) {
    b.h = b.el.offsetHeight;
    var p = b.el.parentElement;
    b.y = (getComputedStyle(b.el).position === 'sticky' && p) ? topo(p) + p.offsetHeight - b.h : topo(b.el);
  }); }

  var vh = innerHeight, pedido = false;
  function confere() {
    pedido = false;
    var y = scrollY, linha = vh * 0.06;
    for (var i = 0; i < blocos.length; i++) {
      var b = blocos[i]; if (!b.h) continue;
      var base = b.y + b.h - y;                        // borda de baixo, na tela
      var limite = linha + Math.min(b.h * 0.5, vh * 0.22);
      sair(b, b.fora ? base < limite + vh * 0.05 : base < limite);
    }
  }
  function agenda() { if (!pedido) { pedido = true; requestAnimationFrame(confere); } }

  document.querySelectorAll(SAIDA).forEach(function (el) {
    if (el.closest('.cta-final, footer, .fpilha')) return; // a chamada final, a pilha de Formações e o rodapé ficam de fora (como antes)
    blocos.push({ el: el, fora: false });
  });
  if (blocos.length) {
    mede(); confere();
    addEventListener('scroll', agenda, { passive: true });
    addEventListener('resize', function () { vh = innerHeight; mede(); agenda(); });
    /* fotos que carregam, sanfonas que abrem: a página muda de altura, mede de novo */
    if ('ResizeObserver' in window) {
      var ultima = 0;
      new ResizeObserver(function () { var h = document.body.offsetHeight; if (h !== ultima) { ultima = h; mede(); agenda(); } }).observe(document.body);
    }
  }

  /* topo da Home (26/11, João: saída refinada, volta suave, sem escurecer).
     Ida: itens sobem um a um e o véu clareia. Volta: o véu escurece primeiro e os
     itens reaparecem de cima pra baixo, mais devagar. Cada animação parte do valor
     que está na tela, então inverter no meio do caminho não dá salto. */
  var hero = document.querySelector('.hero');
  var itens = hero ? Array.prototype.slice.call(hero.querySelectorAll('.hero__eyebrow, .hero__linha, .hero__destaque, .hero__subtitle, .hero__actions')) : [];
  if (itens.length) {
    var veu = hero.querySelector('.hero__overlay');
    var emCurso = new Map(), capaAnim = null, heroFora = false;
    var toca = function (el, fora, alvo, tempo, atraso, curva) {
      var cs = getComputedStyle(el);
      var de = { opacity: cs.opacity }, para = { opacity: alvo.opacity };
      if (alvo.translate) { de.translate = cs.translate === 'none' ? '0 0' : cs.translate; para.translate = alvo.translate; }
      if (emCurso.has(el)) emCurso.get(el).cancel();
      var a = el.animate([de, para], { duration: tempo, delay: atraso, easing: curva, fill: 'both' });
      emCurso.set(el, a);
      /* de volta ao topo, solta o estilo: quem manda é o CSS de novo */
      if (!fora) a.onfinish = function () { a.cancel(); emCurso.delete(el); };
    };
    var olhaHero = function () {
      var fora = scrollY > innerHeight * 0.15;
      if (fora === heroFora) return;
      heroFora = fora;
      itens.forEach(function (el, i) {
        if (fora) toca(el, true, { opacity: 0, translate: '0 -3.5vh' }, 620, i * 65, 'cubic-bezier(.45,0,.25,1)');
        else toca(el, false, { opacity: 1, translate: '0 0' }, 900, 180 + i * 110, 'cubic-bezier(.22,.7,.25,1)');
      });
      if (veu) toca(veu, fora, { opacity: fora ? 0.25 : 1 }, fora ? 900 : 1100, 0, 'ease-in-out');
      var de = getComputedStyle(hero, '::after').opacity;
      if (capaAnim) capaAnim.cancel();
      capaAnim = hero.animate([{ opacity: de }, { opacity: fora ? 0.1 : 0 }], { duration: fora ? 900 : 1100, easing: 'ease-in-out', fill: 'forwards', pseudoElement: '::after' });
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
