/* =====================================================================
   IBPR — configuração do Supabase
   =====================================================================
   As duas chaves do projeto. Ficam aqui, em arquivo separado, pra ser o
   único lugar que muda se o projeto do Supabase for trocado um dia.

   POR QUE ISTO PODE SER COMMITADO E FICAR VISÍVEL:
   a `anon key` é uma chave PÚBLICA por definição — ela vai no navegador
   de todo visitante, não tem como esconder num site estático, e o
   Supabase foi desenhado assim. Quem protege o banco são as regras de
   RLS (ver supabase/01-noticias.sql): com a anon key só dá pra LER
   notícias já publicadas.

   O QUE NUNCA ENTRA AQUI: a chave `service_role`. Ela ignora todas as
   regras de segurança e só serve pra servidor. Este projeto não usa.
   ===================================================================== */

window.IBPR = window.IBPR || {};

window.IBPR.supabaseConfig = {
  // Projeto "ibpr-site" (organização IBPR), região São Paulo.
  // Project Settings → API Keys
  url: 'https://dlqisnyhuexcjjbglzxp.supabase.co',
  // "Publishable key" — o nome novo da antiga "anon key". Pública por
  // definição: vai no navegador de todo visitante. Quem protege o banco
  // é o RLS (ver supabase/01-noticias.sql), não o sigilo desta chave.
  anonKey: 'sb_publishable_dZAIQEljhZHf5o06arOlVw__HgsGM3T'
};
