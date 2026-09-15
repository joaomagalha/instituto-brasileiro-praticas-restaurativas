-- =====================================================================
-- IBPR — Legenda da foto e fonte da notícia (15/09/2026)
-- =====================================================================
-- Já rodado em 15/09/2026 no projeto ibpr-site. Fica aqui pra reinstalação.
--
-- Por quê: notícia republicada de outro portal (TJMT, CNJ...) precisa de
-- crédito na foto e de "com informações de X" com link. Sem isso fica
-- feio e frágil. É o que todo portal editorial faz.
-- =====================================================================

alter table public.noticias
  add column if not exists imagem_legenda text,
  add column if not exists fonte_nome text,
  add column if not exists fonte_url text;

comment on column public.noticias.imagem_legenda is 'Legenda e crédito da foto, mostrados abaixo da imagem. Ex.: "Equipe do NUGJUR. Foto: TJMT".';
comment on column public.noticias.fonte_nome  is 'De onde veio a notícia, quando não é do IBPR. Ex.: "Portal do TJMT".';
comment on column public.noticias.fonte_url   is 'Link da matéria original.';
