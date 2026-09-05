// Interações reais do site (navbar, menu mobile, carrossel de formações,
// vídeo do hero). Adaptado da referência processada (Gaia).

// Vídeo do hero — autoplay em todos os dispositivos (mesmo padrão da Gaia),
// exceto pra quem pede "reduzir movimento" no sistema: fica parado no poster.
const heroVideo = document.querySelector('.hero__video');
if (heroVideo) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  heroVideo.muted = true;
  if (prefersReducedMotion) {
    heroVideo.pause();
    heroVideo.removeAttribute('autoplay');
  } else {
    heroVideo.play().catch(() => {});
  }
}

// Navbar: transparente → sólida ao rolar
const navbar = document.getElementById('navbar');
function updateNavbar() {
  if (!navbar) return;
  navbar.classList.toggle('scrolled', window.scrollY > 80);
}
window.addEventListener('scroll', updateNavbar, { passive: true });
updateNavbar();

// Dropdown desktop — suporta múltiplos itens de dropdown na mesma página
document.querySelectorAll('.navbar__item--dropdown').forEach((dropdownItem) => {
  const dropdownBtn = dropdownItem.querySelector('.navbar__link--dropdown');
  if (!dropdownBtn) return;
  dropdownBtn.addEventListener('click', () => {
    const isOpen = dropdownItem.classList.toggle('open');
    dropdownBtn.setAttribute('aria-expanded', String(isOpen));
  });
  document.addEventListener('click', (e) => {
    if (!dropdownItem.contains(e.target)) {
      dropdownItem.classList.remove('open');
      dropdownBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dropdownItem.classList.contains('open')) {
      dropdownItem.classList.remove('open');
      dropdownBtn.setAttribute('aria-expanded', 'false');
      dropdownBtn.focus();
    }
  });
});

// Menu mobile
const mobileMenu = document.getElementById('mobileMenu');
const menuBtn = document.getElementById('menuBtn');
const closeBtn = document.getElementById('closeBtn');
const overlay = document.getElementById('overlay');

function openMenu() {
  mobileMenu.classList.add('active');
  overlay.classList.add('active');
  document.body.classList.add('no-scroll');
  menuBtn.setAttribute('aria-expanded', 'true');
  mobileMenu.setAttribute('aria-hidden', 'false');
}
function closeMenu() {
  mobileMenu.classList.remove('active');
  overlay.classList.remove('active');
  document.body.classList.remove('no-scroll');
  menuBtn.setAttribute('aria-expanded', 'false');
  mobileMenu.setAttribute('aria-hidden', 'true');
}
menuBtn?.addEventListener('click', openMenu);
closeBtn?.addEventListener('click', closeMenu);
overlay?.addEventListener('click', closeMenu);
document.querySelectorAll('.mobile-menu__link').forEach(link => link.addEventListener('click', closeMenu));

// Carrossel de Formações — trilho em loop movido por transform.
//
// São 4 formações e cabem até 3 na tela ao mesmo tempo. Num carrossel
// comum isso deixaria só 2 posições de parada reais, e um ponto por card
// nunca funcionaria (os últimos seriam inalcançáveis). Clonando os cards
// uma vez, o trilho nunca "acaba": qualquer card pode assumir a primeira
// posição, os 4 pontos viram posições de verdade e as setas nunca morrem
// numa ponta. Ao passar do último card real, a posição volta pro começo
// sem transição — visualmente contínuo.
(function () {
  const track = document.getElementById('servicesTrack');
  const viewport = track?.closest('.services__viewport');
  if (!track || !viewport) return;

  const cards = Array.from(track.querySelectorAll('.service-card'));
  const dots = Array.from(document.querySelectorAll('.services__dot'));
  const prevBtn = document.querySelector('.services__arrow--prev');
  const nextBtn = document.querySelector('.services__arrow--next');
  const total = cards.length;
  if (!total) return;

  // Clones só pra dar continuidade visual ao trilho — escondidos de
  // leitor de tela e fora da navegação por teclado, pra não duplicar
  // os links das formações.
  cards.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
    track.appendChild(clone);
  });

  const DURATION = 550; // precisa bater com a transição de .services__track

  // pos  = posição física no trilho, de 0 a `total`. A posição `total`
  //        mostra os clones e é visualmente idêntica à 0 — é ela que
  //        permite a volta ao primeiro card sem salto.
  // atual = o card em destaque (0 a total-1), o que os pontos refletem.
  let pos = 0;
  let atual = 0;
  let normalizeTimer = null;

  // Passo = largura real do card + gap, medido do DOM em vez de suposto
  // por breakpoint — assim o JS acompanha qualquer mudança de tamanho no
  // CSS sem precisar ser editado junto.
  function step() {
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  }

  function place(animate) {
    if (!animate) track.style.transition = 'none';
    track.style.transform = `translate3d(${-pos * step()}px, 0, 0)`;
    if (!animate) {
      void track.offsetWidth; // força o reflow antes de devolver a transição
      track.style.transition = '';
    }
  }

  function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle('services__dot--active', i === atual));
  }

  // Troca a posição emprestada (`total`, sobre os clones) pela equivalente
  // real (0). Sem transição, então a volta ao início não aparece.
  function normalize() {
    if (pos === total) { pos = 0; place(false); }
  }

  // Encerra na hora qualquer animação ainda em curso, pra um clique novo
  // nunca ser engolido nem partir de um estado intermediário.
  function finishPending() {
    if (normalizeTimer) { clearTimeout(normalizeTimer); normalizeTimer = null; place(false); }
    normalize();
  }

  function schedule() {
    normalizeTimer = setTimeout(() => { normalizeTimer = null; normalize(); }, DURATION + 70);
  }

  function move(dir) {
    finishPending();
    let target = pos + dir;
    // indo pra trás a partir do primeiro card: pula (sem transição) pra
    // posição emprestada no fim e anima de lá, então a volta é contínua.
    if (target < 0) { pos = total; place(false); target = total - 1; }
    pos = target;
    atual = ((target % total) + total) % total;
    place(true);
    updateDots();
    schedule();
  }

  function goTo(i) {
    if (i === atual) return;
    finishPending();
    pos = i;
    atual = i;
    place(true);
    updateDots();
    schedule();
  }

  prevBtn?.addEventListener('click', () => move(-1));
  nextBtn?.addEventListener('click', () => move(1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  // Arrastar com dedo/mouse
  let dragStartX = null;
  viewport.addEventListener('pointerdown', (e) => { dragStartX = e.clientX; });
  window.addEventListener('pointerup', (e) => {
    if (dragStartX === null) return;
    const dx = e.clientX - dragStartX;
    dragStartX = null;
    if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => place(false), 120);
  }, { passive: true });

  place(false);
  updateDots();
})();

// Soluções — nav fixa acompanhando os painéis.
//
// A versão anterior usava IntersectionObserver com rootMargin
// '-45% 0px -45% 0px', ou seja, decidia o item ativo pela faixa central da
// viewport. Só que a nav é sticky em top:13rem — ela vive no ALTO da tela,
// não no meio. Eram dois referenciais diferentes, e o painel cruzava o meio
// da tela bem antes de chegar ao lado da nav: em 22% das posições de rolagem
// o item aceso descrevia um painel que ainda não estava ali (a nav acendia
// "Construir respostas" enquanto "Fortalecer relações" continuava ao lado).
//
// Agora a referência é a própria nav: vence o painel que mais se sobrepõe à
// faixa vertical que ela ocupa. Como é medição direta a cada quadro, e não
// evento de cruzamento, o estado é sempre determinístico (exatamente um
// ativo, nunca dois nem nenhum) e não há como "perder" um painel numa
// rolagem rápida. Além do item ativo, publica --solucao-progresso (0→1),
// que preenche a barra lateral conforme o painel atravessa a nav — é o que
// faz a coluna parecer acompanhar as imagens em vez de saltar entre elas.
(function () {
  const nav = document.getElementById('solucoesNav');
  const panelsWrap = document.getElementById('solucoesPanels');
  if (!nav || !panelsWrap) return;

  const navItems = Array.from(nav.querySelectorAll('.solucoes__nav-item'));
  const panels = Array.from(panelsWrap.querySelectorAll('.solucoes__panel'));
  if (!navItems.length || !panels.length) return;

  // No mobile a nav não é sticky e os 3 itens já vêm abertos (ver
  // components.css, max-width 899px) — ali não existe "painel ao lado".
  const desktop = window.matchMedia('(min-width: 900px)');
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Só liga o realce recíproco nos painéis se o JS realmente rodou: sem
  // esta classe o CSS não escurece nada, então a seção continua legível
  // caso o script falhe.
  panelsWrap.classList.add('has-spy');

  let atual = -1;
  let agendado = false;

  function aplicar(indice, progresso) {
    if (indice !== atual) {
      atual = indice;
      navItems.forEach((item, i) => {
        const on = i === indice;
        item.classList.toggle('is-active', on);
        item.setAttribute('aria-current', String(on));
      });
      panels.forEach((p, i) => p.classList.toggle('is-current', i === indice));
    }
    nav.style.setProperty('--solucao-progresso', progresso.toFixed(3));
  }

  // Onde a troca acontece, como fração da altura da nav a partir do topo
  // dela. Os painéis sobem, então a relação é INVERSA do que parece:
  // linha mais BAIXA (fração maior) = o item acende mais CEDO, porque a
  // divisa entre dois painéis cruza uma linha baixa antes de cruzar uma
  // alta. 0.5 é o centro, que reproduz o comportamento anterior.
  const ANCORA = 0.65;

  function medir() {
    agendado = false;
    if (!desktop.matches) return;

    const navR = nav.getBoundingClientRect();
    // A regra anterior era "vence quem mais cobre a caixa da nav". Fazendo a
    // conta com a nav em 537px e os painéis em 487px, a sobreposição de dois
    // vizinhos empata exatamente quando a divisa entre eles cruza o CENTRO
    // da nav — ou seja, o item só trocava no ponto 50/50 de cobertura.
    // Como se lê de cima pra baixo, o painel novo já parece "o atual" antes
    // disso, e é daí que vinha a sensação de atraso. Com ANCORA em 0.65 a
    // troca passa a acontecer quando o painel novo cobre ~35% da nav, uns
    // 80px de rolagem mais cedo, sem chegar a acender antes de o painel
    // aparecer de fato.
    const linha = navR.top + navR.height * ANCORA;

    // Vence quem contém a linha. O fallback pelo mais próximo cobre as
    // bordas (antes do 1º painel, depois do último) pra nunca ficar sem
    // nenhum item aceso.
    let escolhido = 0;
    let melhorDist = Infinity;
    panels.forEach((p, i) => {
      if (melhorDist === -1) return;
      const r = p.getBoundingClientRect();
      if (r.top <= linha && r.bottom >= linha) { escolhido = i; melhorDist = -1; return; }
      const dist = linha < r.top ? r.top - linha : linha - r.bottom;
      if (dist < melhorDist) { melhorDist = dist; escolhido = i; }
    });

    // Progresso medido contra a MESMA linha da decisão, senão a barra
    // lateral encheria fora de sincronia com a troca do item.
    const r = panels[escolhido].getBoundingClientRect();
    const bruto = r.height ? (linha - r.top) / r.height : 0;
    aplicar(escolhido, Math.min(1, Math.max(0, bruto)));
  }

  function agendar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(medir);
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const painel = document.getElementById(item.dataset.target);
      if (!painel) return;
      // block:'start' respeita o scroll-margin-top de 13rem do painel, que é
      // o mesmo top da nav — o painel para exatamente ao lado do item
      // clicado. Com block:'center' ele parava no meio da tela, longe da nav.
      painel.scrollIntoView({ behavior: semMovimento.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar, { passive: true });
  desktop.addEventListener('change', () => {
    if (!desktop.matches) {
      // volta ao estado neutro do mobile: nada escurecido, nada "atual"
      atual = -1;
      panels.forEach((p) => p.classList.remove('is-current'));
    }
    agendar();
  });

  medir();
})();

// Voltar para onde a pessoa parou.
//
// Cenário: você está no meio da Home, clica em "Conhecer a formação", vai
// pra formacoes.html e aperta voltar — e cai no topo da Home, tendo que
// rolar tudo de novo pra achar onde estava. Apareceu na apresentação pro
// Decildo, o Rauny e a Fernanda.
//
// Normalmente o navegador resolve isso sozinho: ou pelo bfcache (a página
// volta inteira, com rolagem e tudo), ou pela restauração de histórico.
// Só que as duas falham com facilidade — bfcache é descartado por várias
// razões fora do nosso controle (cabeçalho no-store do servidor, aba
// recarregada, memória), e a restauração comum briga com o
// `scroll-behavior: smooth` que o site usa no <html>: a rolagem de volta
// vira animação e qualquer coisa a interrompe no meio.
//
// Isto aqui é rede de segurança, não substituto: guarda a posição por
// página e só repõe quando a navegação foi de histórico (voltar/avançar) e
// o navegador não deu conta. Se o bfcache funcionar, este código não toca
// em nada.
(function () {
  let armazem = null;
  try { armazem = window.sessionStorage; armazem.getItem('teste'); } catch (e) { return; }

  const chave = 'ibpr:scroll:' + location.pathname;
  let agendado = false;

  function guardar() {
    agendado = false;
    try { armazem.setItem(chave, String(Math.round(window.scrollY))); } catch (e) {}
  }

  window.addEventListener('scroll', function () {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(guardar);
  }, { passive: true });

  // pagehide cobre tanto sair da página quanto entrar no bfcache
  window.addEventListener('pagehide', guardar);

  function veioDoHistorico() {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (nav) return nav.type === 'back_forward';
    // navegadores antigos
    return performance.navigation && performance.navigation.type === 2;
  }

  function reporRolagem() {
    let alvo = 0;
    try { alvo = parseInt(armazem.getItem(chave) || '0', 10); } catch (e) { return; }
    if (!alvo || Math.abs(window.scrollY - alvo) < 50) return;

    // Sem desligar o smooth, esta reposição vira uma animação longa desde o
    // topo — visualmente pior que o problema original.
    const raiz = document.documentElement;
    const anterior = raiz.style.scrollBehavior;
    raiz.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.min(alvo, raiz.scrollHeight - window.innerHeight));
    raiz.style.scrollBehavior = anterior;
  }

  window.addEventListener('pageshow', function (e) {
    // bfcache: o navegador já devolveu a página inteira no lugar certo
    if (e.persisted) return;
    // âncora na URL manda mais que a posição guardada
    if (location.hash) return;
    if (!veioDoHistorico()) return;
    reporRolagem();
    // o documento pode assentar um pouco depois (fontes, imagens): confere
    // de novo, uma vez só
    window.addEventListener('load', function () {
      requestAnimationFrame(reporRolagem);
    }, { once: true });
  });
})();

// Âncora entre páginas: garantir que o alvo pare abaixo da navbar fixa.
//
// Quando a página abre já com #ancora na URL, o navegador rola antes de
// tudo assentar. Se qualquer coisa acima do alvo mudar de tamanho depois
// (fonte trocando, imagem entrando, animação de entrada terminando), o
// salto fica errado e o começo do bloco some atrás da navbar — foi o que
// acontecia com as fichas de formação, que erravam exatos 100px.
// A causa principal já foi removida (o alvo não carrega mais transform de
// entrada); isto aqui cobre o resto.
(function () {
  if (!location.hash) return;

  function recolocar() {
    let alvo;
    try { alvo = document.querySelector(location.hash); } catch (e) { return; }
    if (!alvo) return;

    const estilo = getComputedStyle(alvo);
    const folga = parseFloat(estilo.scrollMarginTop) || 0;
    const atual = alvo.getBoundingClientRect().top;
    // já está no lugar? não mexe
    if (Math.abs(atual - folga) < 2) return;

    const raiz = document.documentElement;
    const anterior = raiz.style.scrollBehavior;
    raiz.style.scrollBehavior = 'auto';
    window.scrollBy(0, atual - folga);
    raiz.style.scrollBehavior = anterior;
  }

  window.addEventListener('load', function () {
    requestAnimationFrame(recolocar);
    // segunda conferida depois das animações de entrada do AOS (800ms)
    setTimeout(recolocar, 900);
  }, { once: true });
})();

// Botão de voltar das páginas internas.
//
// A navbar leva pro topo da Home; isto aqui faz outra coisa: desfaz o
// clique e devolve a pessoa ao ponto exato de onde ela veio.
//
// Só history.back() consegue isso — a posição da rolagem fica guardada
// junto com a entrada do histórico (e o bloco acima cobre os casos em
// que o navegador não devolve). Um href pra âncora pararia no começo da
// seção, que é justamente o incômodo que estamos resolvendo.
//
// Por isso o href do HTML é só destino de emergência: quem abriu a
// página por link direto (WhatsApp, Google, favorito) não tem histórico
// deste site pra desfazer, e aí o clique segue o link normalmente.
(function () {
  const botoes = document.querySelectorAll('[data-voltar]');
  if (!botoes.length) return;

  function temHistoricoDoSite() {
    // aba nova: não há entrada anterior pra onde voltar
    if (window.history.length <= 1) return false;
    if (!document.referrer) return false;

    let de;
    try { de = new URL(document.referrer); } catch (e) { return false; }
    if (de.origin !== location.origin) return false;
    // veio da própria página (recarga, âncora interna): voltar cairia
    // aqui mesmo de novo, não na página de origem
    return de.pathname !== location.pathname;
  }

  const podeVoltar = temHistoricoDoSite();

  botoes.forEach(function (botao) {
    botao.addEventListener('click', function (e) {
      if (!podeVoltar) return;                                       // segue o href
      if (e.button !== 0) return;                                    // meio/direito
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;  // abrir em nova aba
      e.preventDefault();
      window.history.back();
    });
  });

  // O flutuante só entra depois que o botão do hero sai de vista — antes
  // disso seriam dois botões iguais na tela ao mesmo tempo. O recuo de
  // 100px no topo é a navbar fixa: ela cobre o botão do hero antes de ele
  // sair da viewport de verdade.
  const fab = document.querySelector('.back-fab');
  const noHero = document.querySelector('.page-back');
  if (!fab || !noHero) return;

  if (!('IntersectionObserver' in window)) {
    fab.classList.add('is-visible');
    return;
  }

  new IntersectionObserver(function (entradas) {
    fab.classList.toggle('is-visible', !entradas[0].isIntersecting);
  }, { rootMargin: '-100px 0px 0px 0px', threshold: 0 }).observe(noHero);
})();
