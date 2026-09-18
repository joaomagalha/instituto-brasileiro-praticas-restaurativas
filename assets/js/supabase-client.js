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

  /* Reduz a foto no próprio navegador antes de subir pro storage. Quem
     publica manda o que tem na mão (o Decildo subiu um PNG de 4,7 MB em
     17/09/2026, e a página da notícia pesava isso pra quem abre no
     celular). Regra: lado maior até `maxLado` (1800 px), sempre JPEG
     (PNG com transparência ganha fundo branco), e o resultado mira
     `alvoBytes` (500 KB): se passar, baixa a qualidade e depois a medida,
     em degraus. O teto de bytes existe por causa do WhatsApp: a mesma foto
     vira og:image da página, e o WhatsApp não mostra prévia de imagem
     pesada. Arquivo pequeno e já dentro da medida passa como está. Se algo
     falhar, devolve o original: o painel nunca trava por causa disto. Só
     JPEG/PNG/WebP; GIF e SVG seguem intocados. */
  /* Mede uma moldura de cor chapada nas bordas da imagem (branca ou
     qualquer cor). Devolve o recorte {x, y, w, h, aparou}. Regras, pra
     nunca estragar foto de verdade: só conta como moldura a linha ou
     coluna INTEIRA em que todo pixel está a menos de 18/255 da cor do
     canto; no máximo 12% por lado; e se o miolo ficar com menos de 70% da
     área, não apara nada. Mede numa cópia de até 400 px, por velocidade. */
  medirMoldura: function (img) {
    var W = img.naturalWidth, H = img.naturalHeight;
    var nada = { x: 0, y: 0, w: W, h: H, aparou: false };
    try {
      var esc = Math.min(1, 400 / Math.max(W, H));
      var w = Math.max(2, Math.round(W * esc)), h = Math.max(2, Math.round(H * esc));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      var d = ctx.getImageData(0, 0, w, h).data;
      var px = function (x, y) { var i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
      // Cor de referência: mediana dos 4 cantos (evita ruído de compressão).
      var cantos = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
      var ref = [0, 1, 2].map(function (k) { return cantos.map(function (c) { return c[k]; }).sort(function (a, b) { return a - b; })[1]; });
      var TOL = 18;
      var perto = function (x, y) { var p = px(x, y); return Math.abs(p[0] - ref[0]) <= TOL && Math.abs(p[1] - ref[1]) <= TOL && Math.abs(p[2] - ref[2]) <= TOL; };
      var linhaLisa = function (y) { for (var x = 0; x < w; x++) if (!perto(x, y)) return false; return true; };
      var colunaLisa = function (x) { for (var y = 0; y < h; y++) if (!perto(x, y)) return false; return true; };
      var maxY = Math.floor(h * 0.12), maxX = Math.floor(w * 0.12);
      var topo = 0, base = 0, esq = 0, dir = 0;
      while (topo < maxY && linhaLisa(topo)) topo++;
      while (base < maxY && linhaLisa(h - 1 - base)) base++;
      while (esq < maxX && colunaLisa(esq)) esq++;
      while (dir < maxX && colunaLisa(w - 1 - dir)) dir++;
      // Moldura de verdade tem pelo menos 2 lados; 1 lado só é conteúdo (céu, parede).
      var lados = [topo, base, esq, dir].filter(function (v) { return v >= 3; }).length;
      if (lados < 2) return nada;
      var x0 = Math.round(esq / esc), y0 = Math.round(topo / esc);
      var x1 = W - Math.round(dir / esc), y1 = H - Math.round(base / esc);
      if ((x1 - x0) * (y1 - y0) < 0.7 * W * H) return nada;
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, aparou: true };
    } catch (e) { return nada; }
  },

  comprimirImagem: function (arquivo, opcoes) {
    var maxLado = (opcoes && opcoes.maxLado) || 1800;
    var alvoBytes = (opcoes && opcoes.alvoBytes) || 500 * 1024;
    var LEVE = 400 * 1024;
    if (!arquivo || !/^image\/(jpeg|png|webp)$/i.test(arquivo.type)) return Promise.resolve(arquivo);

    // Degraus de tentativa: [fração do maxLado, qualidade JPEG].
    var DEGRAUS = [[1, 0.85], [1, 0.78], [0.8, 0.78], [0.66, 0.74]];

    return new Promise(function (resolve) {
      var endereco = URL.createObjectURL(arquivo);
      var img = new Image();
      var devolver = function (f) { URL.revokeObjectURL(endereco); resolve(f); };
      img.onload = function () {
        // Moldura chapada embutida (colagem exportada com borda branca,
        // 18/09/2026): apara antes de tudo, senão a borda vira parte da
        // foto e o card/pílula do site ficam "flutuando" nela.
        var corte = window.IBPR.util.medirMoldura(img);
        var w = corte.w, h = corte.h;
        var escalaBase = Math.min(1, maxLado / Math.max(w, h));
        if (escalaBase === 1 && arquivo.size <= LEVE && !corte.aparou) return devolver(arquivo);

        var nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg';
        var melhor = null;

        var tentar = function (i) {
          if (i >= DEGRAUS.length) return devolver(melhor || arquivo);
          var escala = escalaBase * DEGRAUS[i][0];
          try {
            var c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(w * escala));
            c.height = Math.max(1, Math.round(h * escala));
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, corte.x, corte.y, w, h, 0, 0, c.width, c.height);
            c.toBlob(function (blob) {
              if (!blob) return devolver(melhor || arquivo);
              var f = new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() });
              if (!melhor || f.size < melhor.size) melhor = f;
              // Dentro do alvo: pronto. Se não encolheu nada (JPEG já bem
              // comprimido e na medida), fica o original.
              if (f.size <= alvoBytes) return devolver(escala === 1 && !corte.aparou && f.size >= arquivo.size ? arquivo : f);
              tentar(i + 1);
            }, 'image/jpeg', DEGRAUS[i][1]);
          } catch (e) { devolver(melhor || arquivo); }
        };
        tentar(0);
      };
      img.onerror = function () { devolver(arquivo); };
      img.src = endereco;
    });
  },

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
      .slice(0, 80)
      .replace(/-[^-]*$/, function (fim, i, todo) {   // se cortou aos 80, termina na palavra inteira anterior
        return todo.length < 80 ? fim : '';
      });
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
