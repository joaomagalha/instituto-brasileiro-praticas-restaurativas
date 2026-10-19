/* =====================================================================
   IBPR — "Receber publicações" (06/10/2026)
   =====================================================================
   Qualquer elemento com [data-receber-publicacoes] abre uma janela com
   nome, e-mail e o aceite da LGPD. A inscrição vai pela função
   `inscrever` do Supabase (API REST, sem carregar o supabase-js: é um
   POST só), que responde igual pra e-mail novo e já inscrito e aplica os
   limites anti-robô (supabase/20-seguranca-2026-10-19.sql). A lista só o
   editor vê, na aba Inscritos do painel (ver supabase/17-inscritos.sql).

   Carregar depois de supabase-config.js. Sem configuração, o botão vira
   um e-mail pronto pro ibpr@ibpr.com.br: o visitante nunca fica sem saída.
   ===================================================================== */

(function () {
  'use strict';

  var EMAIL_IBPR = 'ibpr@ibpr.com.br';
  var cfg = (window.IBPR && window.IBPR.supabaseConfig) || {};
  var dialogo = null;

  function montar() {
    dialogo = document.createElement('dialog');
    dialogo.className = 'inscricao';
    dialogo.setAttribute('aria-labelledby', 'inscricaoTitulo');
    dialogo.innerHTML =
      '<form class="inscricao__form" novalidate>' +
        '<button aria-label="Fechar" class="inscricao__fechar" data-fechar type="button"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button>' +
        '<p class="overline">IBPR em Movimento</p>' +
        '<h2 class="inscricao__titulo" id="inscricaoTitulo">Receber publicações</h2>' +
        '<p class="inscricao__texto">Deixe seu e-mail e receba as novas notícias e artigos do Instituto.</p>' +
        '<label class="inscricao__campo"><span>Nome <small>(opcional)</small></span><input autocomplete="name" maxlength="120" name="nome" type="text"/></label>' +
        '<label class="inscricao__campo"><span>E-mail</span><input aria-describedby="inscricaoMsg" autocomplete="email" maxlength="254" name="email" required type="email"/></label>' +
        // armadilha pra robô: humano não vê nem preenche
        '<label aria-hidden="true" class="inscricao__isca">Não preencha<input autocomplete="off" name="hp_x9" tabindex="-1" type="text"/></label>' +
        '<label class="inscricao__aceite"><input aria-describedby="inscricaoMsg" name="aceite" required type="checkbox"/><span>Aceito receber e-mails do IBPR e li a <a href="politica-de-privacidade.html" target="_blank" rel="noopener">política de privacidade</a>. Posso pedir para sair da lista a qualquer momento.</span></label>' +
        '<p aria-live="polite" class="inscricao__msg" id="inscricaoMsg" role="status" tabindex="-1"></p>' +
        '<button class="btn btn--dark inscricao__enviar" type="submit">Quero receber <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></button>' +
      '</form>';
    document.body.appendChild(dialogo);

    dialogo.querySelector('[data-fechar]').addEventListener('click', function () { dialogo.close(); });
    // clique fora da caixa fecha, mas só se começou fora também: arrastar
    // pra selecionar texto e soltar no fundo não pode fechar e perder o que foi digitado
    var comecouFora = false;
    dialogo.addEventListener('mousedown', function (e) { comecouFora = e.target === dialogo; });
    dialogo.addEventListener('click', function (e) { if (comecouFora && e.target === dialogo) dialogo.close(); comecouFora = false; });
    dialogo.querySelector('form').addEventListener('submit', enviar);
  }

  function mensagem(texto, tipo) {
    var p = dialogo.querySelector('.inscricao__msg');
    p.textContent = texto;
    p.className = 'inscricao__msg' + (tipo ? ' inscricao__msg--' + tipo : '');
  }

  function enviar(e) {
    e.preventDefault();
    var f = e.target;
    var nome = f.nome.value.trim();
    var email = f.email.value.trim();

    if (f.hp_x9.value) { mensagem('Inscrição recebida. Obrigado!', 'ok'); return; } // robô
    var emailOk = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
    f.email.setAttribute('aria-invalid', emailOk ? 'false' : 'true');
    f.aceite.setAttribute('aria-invalid', (!emailOk || f.aceite.checked) ? 'false' : 'true');
    // Mensagem que diz o que fazer (14/10/2026): vazio pede o e-mail; com
    // algo digitado e fora do formato, pede pra conferir.
    if (!emailOk) { mensagem(email ? 'Confira o e-mail digitado.' : 'Informe seu e-mail para receber.', 'erro'); f.email.focus(); return; }
    if (!f.aceite.checked) { mensagem('Para receber, é preciso marcar o aceite.', 'erro'); f.aceite.focus(); return; }

    var botao = f.querySelector('.inscricao__enviar');
    botao.disabled = true;
    mensagem('Enviando…');

    // sem resposta em 15 s (internet ruim), desiste e cai na mensagem de erro
    var corte = typeof AbortController === 'function' ? new AbortController() : null;
    var relogio = corte ? setTimeout(function () { corte.abort(); }, 15000) : null;

    fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/inscrever', {
      method: 'POST',
      signal: corte ? corte.signal : undefined,
      headers: {
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_nome: nome || null,
        p_email: email,
        p_origem: (location.pathname.split('/').pop() || 'index.html').slice(0, 200),
        p_consentimento: true
      })
    })
      .then(function (r) {
        // A função responde igual pra e-mail novo e já inscrito (19/10/2026,
        // revisão de segurança): resposta diferente deixava qualquer um testar
        // quem está na lista. 409 só aparece numa corrida rara; também é sucesso.
        if (r.ok || r.status === 409) {
          f.reset();
          mensagem('Pronto! Você vai receber as próximas publicações do IBPR.', 'ok');
          dialogo.querySelector('.inscricao__msg').focus();
          return;
        }
        // 400: a trava do banco (P0001, 20-seguranca) ou dado recusado (e-mail/nome fora da regra)
        if (r.status === 400) {
          return r.json().catch(function () { return {}; }).then(function (b) {
            mensagem(b && b.code === 'P0001'
              ? 'Muitas inscrições agora. Tente de novo em alguns minutos.'
              : 'Confira o nome e o e-mail digitados.', 'erro');
          });
        }
        throw new Error('HTTP ' + r.status);
      })
      .catch(function () {
        mensagem('Não foi possível enviar agora. Tente de novo em instantes ou escreva para ' + EMAIL_IBPR + '.', 'erro');
      })
      .then(function () { if (relogio) clearTimeout(relogio); botao.disabled = false; });
  }

  document.addEventListener('click', function (e) {
    var gatilho = e.target.closest('[data-receber-publicacoes]');
    if (!gatilho) return;
    e.preventDefault();

    if (!cfg.url || !cfg.anonKey || typeof HTMLDialogElement !== 'function') {
      location.href = 'mailto:' + EMAIL_IBPR + '?subject=' + encodeURIComponent('Quero receber as publicações do IBPR');
      return;
    }
    if (!dialogo) montar();
    mensagem('');
    dialogo.showModal();
    dialogo.querySelector('input[name="nome"]').focus();
  });
})();
