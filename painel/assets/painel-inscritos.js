/* =====================================================================
   IBPR — Painel: Inscritos (06/10/2026)
   =====================================================================
   Ponto de entrada:  IBPR.painel.iniciarInscritos()  → painel/inscritos.html

   Lista quem pediu pra receber as publicações pelo botão "Receber
   publicações" do site (tabela `inscritos`, supabase/17-inscritos.sql).
   O site NÃO envia e-mail sozinho (envio automático é projeto à parte):
   esta tela só serve pra copiar os e-mails pro Cco, baixar a planilha e
   tirar da lista quem pedir (LGPD).

   Remover segue a trava de 28/09: `.select('id')` + falhaDeGravacao, pra
   sessão caída não parecer sucesso.
   ===================================================================== */

(function () {
  'use strict';

  var painel = window.IBPR.painel;
  var interno = painel.interno;
  var $ = interno.$;
  var aviso = interno.aviso;
  var limparAviso = interno.limparAviso;
  var traduzirErro = interno.traduzirErro;
  var util = window.IBPR.util;

  function dataBR(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function iniciarInscritos() {
    var db = interno.conectar();
    if (!db) return;

    var linhas = [];

    interno.sessaoValida(db)
      .then(function (r) {
        var sessao = r.data && r.data.session;
        if (!sessao) { location.replace('index.html'); return; }
        window.IBPR.painel.montarConta(sessao);
        carregarLista();
      })
      .catch(function () {
        $('carregando').hidden = true;
        aviso('Não foi possível falar com o servidor. Verifique a internet e recarregue a página.');
      });

    $('btnSair').addEventListener('click', function (e) {
      e.preventDefault();
      db.auth.signOut({ scope: 'local' }).then(function () { location.replace('index.html'); })
        .catch(function () { location.replace('index.html'); });
    });

    function carregarLista() {
      $('carregando').hidden = false;
      $('listaVazia').hidden = true;
      $('lista').innerHTML = '';

      // O Supabase devolve no máximo 1000 linhas por consulta: busca em
      // páginas até vir uma página incompleta, senão a lista (e o Copiar e a
      // planilha) perderiam os mais antigos sem avisar.
      var PAGINA = 1000;
      var acumulado = [];
      (function buscar(de) {
        db.from('inscritos').select('id,nome,email,origem,criado_em')
          .order('criado_em', { ascending: false }).order('id', { ascending: true })
          .range(de, de + PAGINA - 1)
          .then(function (r) {
            if (r.error) { $('carregando').hidden = true; aviso(traduzirErro(r.error)); return; }
            acumulado = acumulado.concat(r.data || []);
            if ((r.data || []).length === PAGINA) { buscar(de + PAGINA); return; }
            $('carregando').hidden = true;
            linhas = acumulado;
            desenhar();
          });
      })(0);
    }

    function desenhar() {
      var vazio = !linhas.length;
      $('listaVazia').hidden = !vazio;
      $('btnCopiar').disabled = vazio;
      $('btnPlanilha').disabled = vazio;
      $('total').hidden = vazio;
      $('total').textContent = linhas.length + (linhas.length === 1 ? ' pessoa inscrita' : ' pessoas inscritas');

      $('lista').innerHTML = linhas.map(function (x) {
        return '<article class="painel-item painel-item--sem-foto" data-id="' + util.escapar(x.id) + '">' +
          '<div>' +
            '<h2 class="painel-item__titulo">' + util.escapar(x.nome || x.email) + '</h2>' +
            '<p class="painel-item__meta">' +
              (x.nome ? '<span>' + util.escapar(x.email) + '</span><span aria-hidden="true">·</span>' : '') +
              '<span>Inscrito em ' + util.escapar(dataBR(x.criado_em)) + '</span>' +
              (x.origem ? '<span aria-hidden="true">·</span><span>pela página ' + util.escapar(x.origem) + '</span>' : '') +
            '</p>' +
          '</div>' +
          '<div class="painel-item__acoes">' +
            '<button class="btn btn--perigo btn--sm" data-remover type="button"><i aria-hidden="true" class="fa-regular fa-trash-can"></i> Remover</button>' +
          '</div>' +
        '</article>';
      }).join('');
    }

    $('lista').addEventListener('click', function (e) {
      var botao = e.target.closest('[data-remover]');
      if (!botao) return;
      var id = botao.closest('.painel-item').dataset.id;
      var alvo = linhas.filter(function (x) { return x.id === id; })[0];
      if (!window.confirm('Tirar ' + (alvo ? alvo.email : 'esta pessoa') + ' da lista?\n\nUse quando a pessoa pedir para não receber mais.')) return;

      limparAviso();
      botao.disabled = true;
      db.from('inscritos').delete().eq('id', id).select('id')
        .then(function (r) {
          var falha = interno.falhaDeGravacao(r);
          if (falha) throw falha;
          linhas = linhas.filter(function (x) { return x.id !== id; });
          desenhar();
          aviso('Removido da lista.', 'ok');
        })
        .catch(function (erro) {
          aviso(traduzirErro(erro));
          botao.disabled = false;
        });
    });

    $('btnCopiar').addEventListener('click', function () {
      var texto = linhas.map(function (x) { return x.email; }).join(', ');
      var feito = function () { aviso(linhas.length + ' e-mails copiados. Cole no campo Cco do seu e-mail.', 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(feito, function () { window.prompt('Copie os e-mails:', texto); });
      } else {
        window.prompt('Copie os e-mails:', texto);
      }
    });

    $('btnPlanilha').addEventListener('click', function () {
      // valor que começa com = + - @ vira fórmula no Excel mesmo entre aspas
      // (alguém pode se inscrever com nome "=HYPERLINK(...)"): o ' na frente desarma
      var aspas = function (v) {
        var t = String(v || '');
        if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
        return '"' + t.replace(/"/g, '""') + '"';
      };
      var csv = ['Nome;E-mail;Inscrito em;Página']
        .concat(linhas.map(function (x) { return [x.nome, x.email, dataBR(x.criado_em), x.origem].map(aspas).join(';'); }))
        .join('\r\n');
      // BOM pro Excel abrir os acentos certos
      var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'inscritos-ibpr.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
  }

  painel.iniciarInscritos = iniciarInscritos;
})();
