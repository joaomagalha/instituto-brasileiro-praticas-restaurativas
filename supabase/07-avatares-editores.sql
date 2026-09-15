-- =====================================================================
-- IBPR — Foto de perfil dos editores no painel (15/09/2026)
-- =====================================================================
-- Rode UMA vez no SQL Editor do Supabase (projeto ibpr-site).
--
-- O avatar da barra de topo mostra a foto quando `foto_url` existe e as
-- iniciais quando não. A foto do João mora no repo do site (painel/assets/avatares/)
-- e as dos três do Instituto são as
-- mesmas do site, na seção das pessoas, então apontam pro site.
-- A política "editor ve a propria linha" já cobre a leitura da coluna nova.
-- =====================================================================

alter table public.editores add column if not exists foto_url text;

comment on column public.editores.foto_url is
  'Endereço absoluto da foto de perfil mostrada na barra do painel. Nulo = iniciais.';

-- João (foto em painel/assets/avatares/, no repo do site)
update public.editores e
set foto_url = 'https://www.ibpr.com.br/painel/assets/avatares/joao-victor.jpg'
from auth.users u
where u.id = e.user_id and u.email = 'magalhaesjoaovictor81@gmail.com';

-- Os três do Instituto: só surte efeito depois que cada um aceitar o
-- convite e for cadastrado em editores (passo 6 do SETUP). Pode rodar
-- de novo depois sem problema.
update public.editores e
set foto_url = 'https://www.ibpr.com.br/assets/images/fundadores/fernanda-mariela-lopes.jpg'
from auth.users u where u.id = e.user_id and lower(u.email) = 'fernandamariela@hotmail.com';

update public.editores e
set foto_url = 'https://www.ibpr.com.br/assets/images/fundadores/decildo-lopes.jpg'
from auth.users u where u.id = e.user_id and lower(u.email) = 'decildo@hotmail.com';

update public.editores e
set foto_url = 'https://www.ibpr.com.br/assets/images/fundadores/rauny-viana.jpg'
from auth.users u where u.id = e.user_id and lower(u.email) = 'raunyviana@hotmail.com';

-- Conferir:
-- select u.email, e.nome, e.foto_url from public.editores e join auth.users u on u.id = e.user_id;
