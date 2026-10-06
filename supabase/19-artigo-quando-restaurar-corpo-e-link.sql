-- =====================================================================
-- IBPR · 19 · Artigo "Quando restaurar é também saber terminar" (06/10/2026)
-- =====================================================================
-- Achados da auditoria final da rodada de 04-05/10:
--   1. O texto começava repetindo o título inteiro em maiúscula e negrito
--      (vinha do Word); o título já está no topo da página.
--   2. O link da publicação apontava pra própria página de Artigos do site,
--      e o botão "Ver no DOI" levava pra lá. Sem DOI nem revista, fica vazio
--      e o botão some.
-- Rodar no SQL Editor. Rodar de novo não estraga (a 1ª linha já terá saído).
-- =====================================================================
update public.artigos
   set corpo = regexp_replace(corpo, '^\*\*QUANDO RESTAURAR[^\n]*\n+', ''),
       publicacao_url = null
 where slug = 'quando-restaurar-e-tambem-saber-terminar'
returning slug, left(corpo, 70) as comeco_do_texto, publicacao_url;
