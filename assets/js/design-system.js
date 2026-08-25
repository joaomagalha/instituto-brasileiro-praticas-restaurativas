// Interações exclusivas desta página de documentação (nav ativo,
// copiar hex, replay de animação, modal). O estado "scrolled" da
// navbar e o menu mobile vêm de site-interactions.js.

// Links ativos no menu conforme a seção visível
const dsNavLinks = Array.from(document.querySelectorAll('.navbar__link[href^="#"]'));
const dsSections = dsNavLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);

if (dsSections.length) {
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = dsNavLinks.find(a => a.getAttribute('href') === '#' + entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        dsNavLinks.forEach(a => a.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
  dsSections.forEach(sec => navObserver.observe(sec));
}

// Masked text reveal do hero — ativa ao carregar, sem depender de scroll
setTimeout(() => {
  document.querySelectorAll('.hero .ds-reveal-wrapper').forEach(el => {
    el.closest('.ds-reveal-target')?.classList.add('ds-reveal-active');
  });
}, 250);

const revealTextObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('ds-reveal-active');
      revealTextObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('.ds-reveal-target:not(.hero .ds-reveal-target)').forEach(el => revealTextObserver.observe(el));

// Copiar hex ao clicar em um swatch de cor
const dsToast = document.getElementById('dsToast');
let dsToastTimer = null;
document.querySelectorAll('.ds-swatch[data-hex]').forEach(swatch => {
  swatch.addEventListener('click', async () => {
    const hex = swatch.getAttribute('data-hex');
    try { await navigator.clipboard.writeText(hex); } catch (e) { /* clipboard indisponível — ignora */ }
    if (dsToast) {
      dsToast.querySelector('span').textContent = `${hex} copiado`;
      dsToast.classList.add('active');
      clearTimeout(dsToastTimer);
      dsToastTimer = setTimeout(() => dsToast.classList.remove('active'), 1800);
    }
  });
});

// Replay de animações
document.querySelectorAll('.ds-anim-replay').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.querySelector(btn.dataset.target);
    if (!target) return;
    const cls = Array.from(target.classList).find(c => c.startsWith('ds-run-'));
    if (!cls) return;
    target.classList.remove(cls);
    void target.offsetWidth;
    target.classList.add(cls);
  });
});

// Modal de demonstração
const dsModalOverlay = document.getElementById('dsModal');
document.querySelectorAll('[data-ds-modal-open]').forEach(btn => btn.addEventListener('click', () => dsModalOverlay?.classList.add('active')));
document.querySelectorAll('[data-ds-modal-close]').forEach(btn => btn.addEventListener('click', () => dsModalOverlay?.classList.remove('active')));
dsModalOverlay?.addEventListener('click', (e) => { if (e.target === dsModalOverlay) dsModalOverlay.classList.remove('active'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dsModalOverlay?.classList.remove('active'); });

// Parallax sutil nos elementos com data-ds-speed
const dsParallaxEls = document.querySelectorAll('[data-ds-speed]');
if (dsParallaxEls.length) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    dsParallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.dsSpeed) || 0.1;
      el.style.transform = `translateY(${y * speed}px)`;
    });
  }, { passive: true });
}
