/* =====================================================================
   IBPR — Painel administrativo, Etapa 1: Notícias
   =====================================================================
   Duas telas, dois pontos de entrada:
     IBPR.painel.iniciarLogin()    → painel/index.html
     IBPR.painel.iniciarNoticias() → painel/noticias.html

   Depende de IBPR.db (supabase-client.js) já ter sido carregado.
   ===================================================================== */

window.IBPR = window.IBPR || {};

/* ---------------------------------------------------------------------
   Bloco "Se bater dúvida"
   ---------------------------------------------------------------------
   Nasce fechado: a tela abre direto no trabalho, e as respostas ficam a um
   clique de distância pra quem precisar. Quem abrir continua com ele aberto
   nas próximas visitas, por aba, então quem está aprendendo não precisa
   reabrir toda vez. A escolha é de quem usa. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var guia = document.querySelector('details.painel-guia');
    if (!guia) return;
    var chave = 'ibpr-guia-' + location.pathname.split('/').pop();
    try {
      if (localStorage.getItem(chave) === 'aberto') guia.open = true;
    } catch (e) {}
    guia.addEventListener('toggle', function () {
      try { localStorage.setItem(chave, guia.open ? 'aberto' : 'fechado'); } catch (e) {}
    });
  });
})();

window.IBPR.painel = (function () {
  'use strict';

  var db = null;          // preenchido no início de cada tela
  var $ = function (id) { return document.getElementById(id); };
  var util = window.IBPR.util;

  var BUCKET = 'noticias';
  var TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB


  /* -------------------------------------------------------------------
     Mensagens na tela
     ------------------------------------------------------------------- */
  function aviso(texto, tipo) {
    var el = $('msg');
    if (!el) return;
    el.className = 'painel-msg painel-msg--' + (tipo || 'erro');
    el.textContent = texto;
    el.hidden = false;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function limparAviso() {
    var el = $('msg');
    if (el) el.hidden = true;
  }

  /* Traduz os erros do Supabase, que vêm em inglês e técnicos demais
     pra quem vai usar o painel (Fernanda, Decildo, Rauny). */
  function traduzirErro(erro) {
    var m = String((erro && erro.message) || erro || '');
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(m))       return 'Este e-mail ainda não foi confirmado. Avise o João.';
    if (/duplicate key|already exists/i.test(m)) return 'Já existe um item com esse título. Mude o título um pouco.';
    if (/Could not find the table|does not exist.*relation|relation .* does not exist/i.test(m))
      return 'Esta parte do painel ainda não foi ligada no banco de dados. ' +
             'Avise o João: falta rodar o arquivo SQL desta etapa (ver supabase/SETUP.md).';
    if (/row-level security|violates row-level/i.test(m))
      return 'Você entrou, mas este usuário não está autorizado a publicar. ' +
             'Peça pro João cadastrar você como editor (passo 6 do SETUP).';
    if (/mime type|not allowed/i.test(m)) return 'Esse tipo de arquivo não é aceito. Use JPG, PNG ou WebP.';
    if (/jwt|expired|Auth session missing/i.test(m)) return 'Sua sessão expirou. Entre de novo.';
    if (/same.*password|should be different/i.test(m)) return 'A senha nova precisa ser diferente da antiga.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
    if (/exceeded the maximum allowed size/i.test(m)) return 'A imagem é grande demais. Use uma de até 5 MB.';
    return 'Não deu certo: ' + m;
  }

  /* Endereço de foto pra usar DENTRO do painel.
     O caminho guardado no banco pode ser relativo à raiz do site
     ("assets/images/fundadores/fulano.jpg"), que é onde as páginas moram.
     O painel mora em /painel/, então o mesmo caminho apontaria pra
     painel/assets/... e a foto apareceria quebrada na lista e na prévia.
     Foto enviada pelo próprio painel vem do storage, já absoluta, e passa
     direto. Só o site publicado usa o caminho como está no banco. */
  function fotoNoPainel(url) {
    if (!url) return '';
    return /^(https?:)?\/\//.test(url) ? url : '../' + String(url).replace(/^\/+/, '');
  }

  /* Barra os dois pontos de entrada quando o Supabase não está ligado
     ainda — sem isto a tela quebra sem explicar por quê. */
  function exigirConfiguracao() {
    if (window.IBPR.configurado) {
      db = window.IBPR.db;
      return true;
    }
    aviso('O painel ainda não está conectado ao banco de dados. ' +
          'Falta preencher as chaves em assets/js/supabase-config.js (ver supabase/SETUP.md).', 'info');
    return false;
  }


  /* ===================================================================
     TELA 1 — LOGIN
     =================================================================== */
  function iniciarLogin() {
    if (!exigirConfiguracao()) return;

    // Já logado? Vai direto pras notícias.
    db.auth.getSession().then(function (r) {
      if (r.data && r.data.session) location.replace('noticias.html');
    });

    var form = $('formLogin');
    var botao = $('btnEntrar');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      limparAviso();

      var email = $('email').value.trim();
      var senha = $('senha').value;

      if (!email || !senha) {
        aviso('Preencha e-mail e senha.');
        return;
      }

      botao.disabled = true;
      botao.textContent = 'Entrando…';

      db.auth.signInWithPassword({ email: email, password: senha })
        .then(function (r) {
          if (r.error) throw r.error;
          location.replace('noticias.html');
        })
        .catch(function (erro) {
          aviso(traduzirErro(erro));
          botao.disabled = false;
          botao.innerHTML = 'Entrar <i aria-hidden="true" class="fa-solid fa-arrow-right"></i>';
        });
    });

    /* --- Esqueci minha senha ---------------------------------------
       Sem isto, quem esquecesse a senha dependeria do João ir no
       Supabase resetar na mão. Com três pessoas do Instituto usando o
       painel, isso viraria chamado toda semana. */
    var formRec = $('formRecuperar');

    $('linkEsqueci').addEventListener('click', function (e) {
      e.preventDefault();
      limparAviso();
      // Aproveita o e-mail já digitado no login, se houver.
      $('emailRecuperar').value = $('email').value.trim();
      form.hidden = true;
      formRec.hidden = false;
      $('emailRecuperar').focus();
    });

    $('linkVoltarLogin').addEventListener('click', function (e) {
      e.preventDefault();
      limparAviso();
      formRec.hidden = true;
      form.hidden = false;
    });

    formRec.addEventListener('submit', function (e) {
      e.preventDefault();
      limparAviso();

      var email = $('emailRecuperar').value.trim();
      if (!email) { aviso('Digite o e-mail da sua conta.'); return; }

      var btn = $('btnEnviarLink');
      btn.disabled = true;
      btn.textContent = 'Enviando…';

      // redirectTo montado a partir do endereço atual: funciona igual no
      // localhost e no site publicado, sem endereço fixo no código.
      var destino = location.origin +
        location.pathname.replace(/[^/]*$/, '') + 'nova-senha.html';

      db.auth.resetPasswordForEmail(email, { redirectTo: destino })
        .then(function (r) {
          if (r.error) throw r.error;
          // Resposta igual exista ou não a conta: dizer "este e-mail não
          // existe" entregaria a estranhos a lista de quem tem acesso.
          aviso('Se este e-mail tiver conta no painel, o link chega em alguns minutos. ' +
                'Confira também a caixa de spam.', 'ok');
          formRec.hidden = true;
          form.hidden = false;
        })
        .catch(function (erro) {
          aviso(traduzirErro(erro));
        })
        .then(function () {
          btn.disabled = false;
          btn.innerHTML = 'Enviar link <i aria-hidden="true" class="fa-solid fa-paper-plane"></i>';
        });
    });
  }


  /* ===================================================================
     TELA 3 — DEFINIR NOVA SENHA (destino do link do e-mail)
     =================================================================== */
  function iniciarNovaSenha() {
    if (!exigirConfiguracao()) return;

    var form = $('formNovaSenha');
    var sub = $('subtitulo');

    /* O supabase-js lê o token que vem na URL e abre a sessão sozinho,
       mas isso é assíncrono: por isso esperamos o evento em vez de
       perguntar a sessão na hora, senão dava "link inválido" por corrida. */
    var resolvido = false;

    db.auth.onAuthStateChange(function (evento, sessao) {
      if (sessao && !resolvido) { resolvido = true; liberar(); }
    });

    db.auth.getSession().then(function (r) {
      if (r.data && r.data.session && !resolvido) { resolvido = true; liberar(); }
    });

    // Se em 6s nada abriu sessão, o link expirou ou já foi usado.
    setTimeout(function () {
      if (!resolvido) {
        resolvido = true;
        sub.textContent = 'Este link não vale mais.';
        aviso('O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".');
        $('voltar').hidden = false;
      }
    }, 6000);

    function liberar() {
      sub.textContent = 'Escolha a senha que você vai usar daqui pra frente.';
      form.hidden = false;
      $('senha1').focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      limparAviso();

      var s1 = $('senha1').value;
      var s2 = $('senha2').value;

      if (s1.length < 8)  { aviso('A senha precisa ter pelo menos 8 caracteres.'); return; }
      if (s1 !== s2)      { aviso('As duas senhas não são iguais.'); return; }

      var btn = $('btnSalvarSenha');
      btn.disabled = true;
      btn.textContent = 'Salvando…';

      db.auth.updateUser({ password: s1 })
        .then(function (r) {
          if (r.error) throw r.error;
          aviso('Senha alterada. Entrando no painel…', 'ok');
          setTimeout(function () { location.replace('noticias.html'); }, 1200);
        })
        .catch(function (erro) {
          aviso(traduzirErro(erro));
          btn.disabled = false;
          btn.innerHTML = 'Salvar e entrar <i aria-hidden="true" class="fa-solid fa-arrow-right"></i>';
        });
    });
  }


  /* ===================================================================
     TELA 2 — NOTÍCIAS
     =================================================================== */
  function iniciarNoticias() {
    if (!exigirConfiguracao()) return;

    var arquivoEscolhido = null;   // File selecionado, ainda não enviado
    var linhas = [];               // últimas notícias carregadas do banco
    var emEdicao = null;           // linha aberta no formulário (null = nova)

    /* --- porteiro: sem sessão, volta pro login ---------------------- */
    db.auth.getSession()
      .then(function (r) {
        var sessao = r.data && r.data.session;
        if (!sessao) {
          location.replace('index.html');
          return;
        }
        $('usuarioAtual').textContent = sessao.user.email;
        carregarLista();
      })
      .catch(function (erro) {
        // Sem isto a tela ficava presa em "Carregando…" quando o Supabase
        // não respondia — o pior tipo de falha, porque não explica nada.
        $('carregando').hidden = true;
        aviso('Não foi possível falar com o servidor. Verifique a internet e recarregue a página.');
      });

    $('btnSair').addEventListener('click', function (e) {
      e.preventDefault();
      db.auth.signOut().then(function () { location.replace('index.html'); });
    });


    /* --- trocar entre lista e formulário ---------------------------- */
    function mostrarLista() {
      $('telaLista').hidden = false;
      $('telaForm').hidden = true;
      limparAviso();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function mostrarForm(titulo) {
      $('formTitulo').textContent = titulo;
      $('telaLista').hidden = true;
      $('telaForm').hidden = false;
      limparAviso();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }


    /* --- carregar e desenhar a lista -------------------------------- */
    function carregarLista() {
      $('carregando').hidden = false;
      $('listaVazia').hidden = true;
      $('lista').innerHTML = '';

      // Sem filtro de status: quem está logado enxerga rascunho também.
      db.from('noticias')
        .select('*')
        .order('publicado_em', { ascending: false, nullsFirst: false })
        .order('criado_em', { ascending: false })
        .then(function (r) {
          $('carregando').hidden = true;
          if (r.error) { aviso(traduzirErro(r.error)); return; }

          linhas = r.data || [];
          if (!linhas.length) { $('listaVazia').hidden = false; return; }

          $('lista').innerHTML = linhas.map(desenharItem).join('');
        })
        .catch(function (erro) {
          $('carregando').hidden = true;
          aviso(traduzirErro(erro));
        });
    }

    function desenharItem(n) {
      var publicada = n.status === 'publicado';
      var data = util.formatarData(n.publicado_em || n.criado_em);

      var foto = n.imagem_url
        ? '<img alt="" src="' + util.escapar(fotoNoPainel(n.imagem_url)) + '"/>'
        : '';

      return '' +
        '<article class="painel-item" data-id="' + util.escapar(n.id) + '">' +
          '<div class="painel-item__foto">' + foto + '</div>' +
          '<div>' +
            '<h2 class="painel-item__titulo">' + util.escapar(n.titulo) + '</h2>' +
            '<p class="painel-item__meta">' +
              '<span class="selo selo--' + (publicada ? 'publicado' : 'rascunho') + '">' +
                (publicada ? 'Publicado' : 'Rascunho') +
              '</span>' +
              // o espaçamento entre categoria e data vem do gap do flex,
              // então não precisa de "·" no meio (ficava separador duplo)
              '<span>' + util.escapar(n.categoria) + '</span>' +
              (data ? '<span>' + data + '</span>' : '') +
            '</p>' +
            '<div class="painel-item__acoes">' +
              '<button class="btn btn--outline btn--sm" data-acao="editar" type="button">Editar</button>' +
              (publicada
                ? '<button class="btn btn--fantasma btn--sm" data-acao="despublicar" type="button">Despublicar</button>'
                : '<button class="btn btn--dark btn--sm" data-acao="publicar" type="button">Publicar</button>') +
              '<button class="btn btn--perigo btn--sm" data-acao="apagar" type="button">Apagar</button>' +
            '</div>' +
          '</div>' +
        '</article>';
    }

    /* Um só ouvinte no container, em vez de um por botão: os itens são
       redesenhados a cada carregamento, e ouvintes individuais ficariam
       órfãos. (Padrão: event delegation.) */
    $('lista').addEventListener('click', function (e) {
      var botao = e.target.closest('[data-acao]');
      if (!botao) return;
      var id = botao.closest('.painel-item').dataset.id;
      var acao = botao.dataset.acao;

      if (acao === 'editar')      abrirEdicao(id);
      if (acao === 'publicar')    alterarStatus(id, 'publicado');
      if (acao === 'despublicar') alterarStatus(id, 'rascunho');
      if (acao === 'apagar')      apagar(id);
    });


    /* --- formulário: abrir vazio ou preenchido ---------------------- */
    $('btnNova').addEventListener('click', function () {
      limparForm();
      mostrarForm('Nova notícia');
    });

    $('btnCancelar').addEventListener('click', function () {
      limparForm();
      mostrarLista();
    });

    function limparForm() {
      emEdicao = null;
      $('noticiaId').value = '';
      $('titulo').value = '';
      $('resumo').value = '';
      $('conteudo').value = '';
      $('imagemAlt').value = '';
      $('categoria').value = 'Rede';
      $('publicadoEm').value = '';
      $('imagem').value = '';
      $('previa').hidden = true;
      arquivoEscolhido = null;
    }

    function abrirEdicao(id) {
      db.from('noticias').select('*').eq('id', id).single().then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        var n = r.data;
        emEdicao = n;

        $('noticiaId').value = n.id;
        $('titulo').value = n.titulo || '';
        $('resumo').value = n.resumo || '';
        $('conteudo').value = n.conteudo || '';
        $('categoria').value = n.categoria || 'Rede';
        $('imagemAlt').value = n.imagem_alt || '';
        $('publicadoEm').value = paraCampoData(n.publicado_em);

        arquivoEscolhido = null;
        $('imagem').value = '';
        if (n.imagem_url) {
          $('previaImg').src = fotoNoPainel(n.imagem_url);
          $('previa').hidden = false;
        } else {
          $('previa').hidden = true;
        }

        mostrarForm('Editar notícia');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }

    /* ISO do banco → "AAAA-MM-DD" que o <input type="date"> entende,
       no fuso local (senão a data pula um dia). */
    function paraCampoData(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      if (isNaN(d)) return '';
      return d.getFullYear() + '-' +
             String(d.getMonth() + 1).padStart(2, '0') + '-' +
             String(d.getDate()).padStart(2, '0');
    }

    /* "AAAA-MM-DD" → ISO. Fixa meio-dia local pra que a conversão de
       fuso nunca empurre a notícia pro dia anterior. */
    function doCampoData(valor) {
      if (!valor) return null;
      var d = new Date(valor + 'T12:00:00');
      return isNaN(d) ? null : d.toISOString();
    }


    /* --- prévia da imagem escolhida --------------------------------- */
    $('imagem').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) { arquivoEscolhido = null; return; }

      if (f.size > TAMANHO_MAX) {
        aviso('A imagem tem ' + (f.size / 1048576).toFixed(1) + ' MB. O limite é 5 MB.');
        e.target.value = '';
        arquivoEscolhido = null;
        return;
      }

      limparAviso();
      arquivoEscolhido = f;
      $('previaImg').src = URL.createObjectURL(f);
      $('previa').hidden = false;
    });

    /* Envia a imagem pro storage e devolve o endereço público dela. */
    function enviarImagem(arquivo, slug) {
      var ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
      var caminho = slug + '-' + Date.now() + '.' + ext;

      return db.storage.from(BUCKET)
        .upload(caminho, arquivo, { cacheControl: '31536000', upsert: false })
        .then(function (r) {
          if (r.error) throw r.error;
          return db.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        });
    }


    /* --- salvar ------------------------------------------------------ */
    $('btnRascunho').addEventListener('click', function () { salvar('rascunho'); });
    $('btnPublicar').addEventListener('click', function () { salvar('publicado'); });

    function salvar(status) {
      limparAviso();

      var titulo = $('titulo').value.trim();
      var resumo = $('resumo').value.trim();

      if (!titulo) { aviso('O título é obrigatório.'); $('titulo').focus(); return; }
      if (!resumo) { aviso('O resumo é obrigatório: é o texto que aparece no card.'); $('resumo').focus(); return; }

      var id = $('noticiaId').value;
      var botoes = [$('btnPublicar'), $('btnRascunho'), $('btnCancelar')];
      botoes.forEach(function (b) { b.disabled = true; });

      var dados = {
        titulo: titulo,
        resumo: resumo,
        conteudo: $('conteudo').value.trim() || null,
        categoria: $('categoria').value,
        imagem_alt: $('imagemAlt').value.trim() || null,
        status: status
      };

      // Data de publicação: só faz sentido quando está publicado.
      // Ordem: o que estiver no campo → a data que já existia → agora.
      dados.publicado_em = (status === 'publicado')
        ? (doCampoData($('publicadoEm').value)
           || (emEdicao && emEdicao.publicado_em)
           || new Date().toISOString())
        : doCampoData($('publicadoEm').value);

      // Encadeia: garantir slug → enviar imagem (se houver) → gravar.
      //
      // O slug de uma notícia JÁ PUBLICADA nunca muda, mesmo que o título
      // mude. Ele é o endereço dela: se mudar, todo link já compartilhado
      // (WhatsApp, e-mail, outro site) passa a dar "não encontrada".
      // Corrigir uma vírgula no título não pode quebrar o que já circulou.
      var slugCongelado = (emEdicao && emEdicao.status === 'publicado' && emEdicao.slug)
        ? emEdicao.slug
        : null;

      (slugCongelado ? Promise.resolve(slugCongelado) : gerarSlugUnico(titulo, id))
        .then(function (slug) {
          dados.slug = slug;
          if (!arquivoEscolhido) return null;
          return enviarImagem(arquivoEscolhido, slug);
        })
        .then(function (url) {
          if (url) dados.imagem_url = url;
          return id
            ? db.from('noticias').update(dados).eq('id', id)
            : db.from('noticias').insert(dados);
        })
        .then(function (r) {
          if (r.error) throw r.error;
          limparForm();
          mostrarLista();
          carregarLista();
          aviso(status === 'publicado'
            ? 'Publicado. O site é atualizado automaticamente em cerca de 2 minutos.'
            : 'Rascunho salvo. Não aparece no site enquanto não for publicado.', 'ok');
        })
        .catch(function (erro) {
          aviso(traduzirErro(erro));
        })
        .then(function () {
          botoes.forEach(function (b) { b.disabled = false; });
        });
    }

    /* O slug é o endereço da notícia e precisa ser único no banco.
       Se "parceria-com-o-tjmt" já existir, vira "parceria-com-o-tjmt-2".
       `ignorarId` evita que a própria notícia sendo editada conte como
       conflito consigo mesma. */
    function gerarSlugUnico(titulo, ignorarId) {
      var base = util.slugify(titulo) || 'noticia';

      return db.from('noticias').select('id,slug').like('slug', base + '%')
        .then(function (r) {
          if (r.error) throw r.error;
          var usados = (r.data || [])
            .filter(function (n) { return n.id !== ignorarId; })
            .map(function (n) { return n.slug; });

          if (usados.indexOf(base) === -1) return base;
          for (var i = 2; i < 500; i++) {
            if (usados.indexOf(base + '-' + i) === -1) return base + '-' + i;
          }
          return base + '-' + Date.now();
        });
    }


    /* --- publicar/despublicar direto da lista ----------------------- */
    function alterarStatus(id, status) {
      var mudanca = { status: status };

      if (status === 'publicado') {
        // Só carimba a data se ainda não existir. Uma notícia de agosto
        // que foi despublicada e volta ao ar continua sendo de agosto —
        // sem isto ela reaparecia com a data de hoje, no topo da lista,
        // como se fosse novidade.
        var atual = linhas.filter(function (n) { return n.id === id; })[0];
        if (!atual || !atual.publicado_em) {
          mudanca.publicado_em = new Date().toISOString();
        }
      }

      db.from('noticias').update(mudanca).eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        carregarLista();
        aviso(status === 'publicado'
          ? 'Publicado. O site é atualizado automaticamente em cerca de 2 minutos.'
          : 'Despublicado. Sai do site no próximo build, em cerca de 2 minutos.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }


    /* --- apagar ----------------------------------------------------- */
    function apagar(id) {
      // confirm() é bloqueante e simples — aqui é o comportamento certo:
      // apagar não tem volta, então tem que custar um clique consciente.
      if (!window.confirm('Apagar esta notícia? Não dá pra desfazer.')) return;

      db.from('noticias').delete().eq('id', id).then(function (r) {
        if (r.error) { aviso(traduzirErro(r.error)); return; }
        carregarLista();
        aviso('Notícia apagada.', 'ok');
      }).catch(function (erro) { aviso(traduzirErro(erro)); });
    }
  }


  return {
    iniciarLogin: iniciarLogin,
    iniciarNoticias: iniciarNoticias,
    iniciarNovaSenha: iniciarNovaSenha,

    /* Peças compartilhadas com painel-formacoes.js, que é um arquivo
       separado só pra este aqui não virar um monstro de mil linhas.
       Não são pra uso fora do painel. */
    interno: {
      $: $,
      aviso: aviso,
      limparAviso: limparAviso,
      traduzirErro: traduzirErro,
      fotoNoPainel: fotoNoPainel,
      /* Devolve o cliente do banco, ou null se o painel ainda não foi
         conectado (e nesse caso já explicou isso na tela). */
      conectar: function () { return exigirConfiguracao() ? db : null; }
    }
  };
})();
