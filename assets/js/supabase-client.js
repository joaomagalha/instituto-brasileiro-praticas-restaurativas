/* =====================================================================
   IBPR — cliente do Supabase
   =====================================================================
   Cria uma única conexão com o Supabase e deixa disponível em
   `IBPR.db`. Todo o resto do site (painel e páginas públicas) usa esta
   mesma instância — criar várias faria o login se perder entre elas.

   Carregar SEMPRE nesta ordem, antes de qualquer script que use o banco:
     1. supabase-js (CDN)
     2. supabase-config.js
     3. supabase-client.js

   REGRA DE OURO DESTE PROJETO: se o Supabase não estiver configurado,
   estiver fora do ar ou pausado, `IBPR.db` fica `null` e nada quebra —
   as páginas públicas simplesmente mantêm o conteúdo estático que já
   está no HTML. O site nunca fica com buraco.
   ===================================================================== */

window.IBPR = window.IBPR || {};

(function () {
  'use strict';

  var cfg = window.IBPR.supabaseConfig || {};
  var lib = window.supabase; // vem do UMD do supabase-js

  // `configurado` responde: dá pra sequer tentar falar com o banco?
  // As páginas públicas usam isso pra decidir entre buscar conteúdo ou
  // deixar o HTML estático em paz.
  window.IBPR.configurado = Boolean(cfg.url && cfg.anonKey && lib);

  if (!window.IBPR.configurado) {
    window.IBPR.db = null;
    // Aviso só no console, nunca na tela do visitante.
    if (!lib) {
      console.warn('[IBPR] supabase-js não carregou. Conteúdo dinâmico desligado.');
    } else {
      console.warn('[IBPR] Supabase ainda não configurado (ver supabase/SETUP.md). Conteúdo dinâmico desligado.');
    }
    return;
  }

  window.IBPR.db = lib.createClient(cfg.url, cfg.anonKey, {
    auth: {
      // Mantém a sessão do painel entre recarregamentos da página.
      persistSession: true,
      autoRefreshToken: true
    }
  });
})();


/* ---------------------------------------------------------------------
   Utilitários compartilhados entre o painel e as páginas públicas.
   --------------------------------------------------------------------- */
window.IBPR.util = {

  /* Transforma um título em endereço de URL.
     "Parceria com o TJMT é firmada!" → "parceria-com-o-tjmt-e-firmada"
     Usado pelo build pra montar o arquivo noticia-<slug>.html */
  slugify: function (texto) {
    return String(texto || '')
      .normalize('NFD')                   // separa a letra do acento
      .replace(/[\u0300-\u036f]/g, '')   // remove os acentos soltos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')        // tudo que não é letra/número vira hífen
      .replace(/^-+|-+$/g, '')            // tira hífen sobrando nas pontas
      .slice(0, 80);
  },

  /* Data no formato que o site usa nos cards: "08 set 2026" */
  formatarData: function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return String(d.getDate()).padStart(2, '0') + ' ' +
           meses[d.getMonth()] + ' ' +
           d.getFullYear();
  },

  /* Escapa texto antes de jogar no HTML.
     Sem isto, uma notícia com "<script>" no título viraria código
     rodando na página (ataque conhecido como XSS). Como o conteúdo vem
     do banco e não do nosso HTML, todo texto passa por aqui. */
  /* Escapa texto do banco antes de virar HTML.
     As aspas entram na conta de propósito: o painel monta alguns atributos
     por concatenação (src="…", data-id="…"), e sem escapar as aspas um
     valor com " no meio fecharia o atributo mais cedo e o resto viraria
     código. Em texto normal, &quot; continua aparecendo como aspas. */
  escapar: function (texto) {
    var div = document.createElement('div');
    div.textContent = String(texto == null ? '' : texto);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};
