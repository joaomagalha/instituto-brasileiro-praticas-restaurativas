-- =====================================================================
-- IBPR — Painel administrativo (CMS), Etapa 1: NOTÍCIAS
-- =====================================================================
-- Rode este arquivo INTEIRO uma única vez, no SQL Editor do Supabase.
-- Pode rodar de novo sem medo: nada duplica.
--
-- O que ele cria:
--   1. a tabela `editores` — quem tem permissão de publicar
--   2. a tabela `noticias`
--   3. um gatilho que atualiza sozinho a data de última edição
--   4. as regras de segurança (RLS) — quem pode ler e quem pode escrever
--   5. o "balde" de imagens (storage), com limite de tamanho e tipo
--
-- Passo a passo de como chegar aqui: ver SETUP.md nesta mesma pasta.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. QUEM PODE PUBLICAR
-- ---------------------------------------------------------------------
-- Esta tabela existe por segurança em camadas.
--
-- O caminho mais simples seria dizer "qualquer usuário logado pode
-- escrever". O problema: o Supabase permite criar conta usando a chave
-- pública, que fica visível no site. A única coisa que impediria um
-- estranho de criar uma conta e ganhar permissão de apagar as notícias
-- do IBPR seria um interruptor no painel do Supabase ("desligar cadastro
-- público") — um clique que ninguém nunca mais vai conferir.
--
-- Com esta tabela, ser "logado" não basta: o usuário precisa estar
-- listado aqui. Se alguém religar o cadastro público por engano, o
-- estranho até cria conta, mas não escreve nada.
create table if not exists public.editores (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  nome      text,
  criado_em timestamptz not null default now()
);

comment on table public.editores is
  'Usuários autorizados a publicar. Estar logado não basta: precisa estar aqui.';

-- Função que responde "quem está pedindo isso é editor?".
-- SECURITY DEFINER: roda com os privilégios de quem criou, pra conseguir
-- consultar a tabela sem cair na própria checagem de permissão (o que
-- daria recursão infinita).
create or replace function public.e_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.editores where user_id = auth.uid());
$$;

alter table public.editores enable row level security;

drop policy if exists "editor ve a propria linha" on public.editores;
create policy "editor ve a propria linha"
  on public.editores
  for select
  to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 2. TABELA DE NOTÍCIAS
-- ---------------------------------------------------------------------
-- Uma linha = uma notícia do "IBPR em Movimento".
--
-- `slug` é o endereço da notícia no site (ex: "ibpr-firma-parceria-tjmt"),
-- gerado a partir do título. Precisa ser único porque a página de leitura
-- encontra a notícia por ele: /noticia.html?slug=...
--
-- `status` separa rascunho de publicado. Nada com status 'rascunho'
-- aparece no site — quem garante isso é a regra de segurança lá embaixo,
-- não o JavaScript. Segurança que depende só do front-end não é segurança.
create table if not exists public.noticias (
  id            uuid primary key default gen_random_uuid(),

  titulo        text not null check (length(trim(titulo)) > 0),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  resumo        text,                    -- prévia de 2 linhas que aparece no card
  conteudo      text,                    -- corpo (parágrafos separados por linha em branco)

  -- Para acrescentar uma frente nova no futuro, é preciso alterar este
  -- CHECK (ver nota no fim do arquivo).
  categoria     text not null default 'Rede'
                check (categoria in ('Pesquisa', 'Formações', 'Rede')),

  imagem_url    text,
  imagem_alt    text,

  status        text not null default 'rascunho'
                check (status in ('rascunho', 'publicado')),

  publicado_em  timestamptz,             -- data que o site mostra
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.noticias is
  'Notícias do IBPR em Movimento. Só linhas com status = publicado aparecem no site.';

-- Índice pra busca do site ficar rápida mesmo com muita notícia.
-- O site sempre pergunta a mesma coisa: "me dê as publicadas, da mais
-- nova pra mais velha" — o índice é exatamente nesses dois campos.
create index if not exists noticias_publicadas_idx
  on public.noticias (status, publicado_em desc);


-- ---------------------------------------------------------------------
-- 3. GATILHO DE "ÚLTIMA EDIÇÃO"
-- ---------------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists noticias_set_atualizado_em on public.noticias;
create trigger noticias_set_atualizado_em
  before update on public.noticias
  for each row
  execute function public.set_atualizado_em();


-- ---------------------------------------------------------------------
-- 4. SEGURANÇA (RLS — Row Level Security)
-- ---------------------------------------------------------------------
-- Esta é a parte mais importante do arquivo.
--
-- O site é estático e a chave de acesso ao Supabase (a "anon key") fica
-- visível no código, no navegador de qualquer pessoa. Isso é normal e
-- previsto — ela é uma chave PÚBLICA. O que impede alguém de apagar as
-- notícias do IBPR com ela não é esconder a chave: é o RLS.
--
-- Com RLS ligado, o Postgres recusa TUDO por padrão. Só passa o que uma
-- política liberar explicitamente:
--
--   • visitante (anon)   → só LÊ notícias publicadas
--   • editor (na tabela) → lê tudo e pode criar/editar/apagar
--   • logado sem ser editor → não consegue nada
alter table public.noticias enable row level security;

drop policy if exists "visitante le noticias publicadas" on public.noticias;
create policy "visitante le noticias publicadas"
  on public.noticias
  for select
  to anon
  using (status = 'publicado');

-- Editor enxerga tudo, inclusive rascunho (precisa, pra editar).
drop policy if exists "editor le tudo" on public.noticias;
create policy "editor le tudo"
  on public.noticias
  for select
  to authenticated
  using (public.e_editor());

drop policy if exists "editor cria" on public.noticias;
create policy "editor cria"
  on public.noticias
  for insert
  to authenticated
  with check (public.e_editor());

drop policy if exists "editor edita" on public.noticias;
create policy "editor edita"
  on public.noticias
  for update
  to authenticated
  using (public.e_editor())
  with check (public.e_editor());

drop policy if exists "editor apaga" on public.noticias;
create policy "editor apaga"
  on public.noticias
  for delete
  to authenticated
  using (public.e_editor());

-- Políticas antigas da 1ª versão deste arquivo (liberavam pra qualquer
-- logado). Removidas aqui pra quem já tinha rodado a versão anterior.
drop policy if exists "equipe le tudo" on public.noticias;
drop policy if exists "equipe cria"    on public.noticias;
drop policy if exists "equipe edita"   on public.noticias;
drop policy if exists "equipe apaga"   on public.noticias;


-- ---------------------------------------------------------------------
-- 5. STORAGE — o "balde" das imagens
-- ---------------------------------------------------------------------
-- Público para leitura (a imagem precisa abrir no navegador de qualquer
-- visitante), com envio restrito a editor.
--
-- IMPORTANTE — os dois limites abaixo são a defesa de verdade:
--   file_size_limit    → 5 MB, aplicado pelo SERVIDOR. A checagem que o
--                        painel faz em JavaScript é só cortesia; qualquer
--                        um contorna JavaScript.
--   allowed_mime_types → só imagem. Sem isso, um editor poderia subir um
--                        .html ou .js e passaria a existir uma página
--                        estranha hospedada no domínio do Instituto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('noticias', 'noticias', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagem de noticia e publica" on storage.objects;
create policy "imagem de noticia e publica"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'noticias');

drop policy if exists "editor envia imagem" on storage.objects;
create policy "editor envia imagem"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'noticias' and public.e_editor());

drop policy if exists "editor substitui imagem" on storage.objects;
create policy "editor substitui imagem"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'noticias' and public.e_editor())
  with check (bucket_id = 'noticias' and public.e_editor());

drop policy if exists "editor apaga imagem" on storage.objects;
create policy "editor apaga imagem"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'noticias' and public.e_editor());

-- Políticas antigas da 1ª versão deste arquivo.
drop policy if exists "equipe envia imagem"     on storage.objects;
drop policy if exists "equipe substitui imagem" on storage.objects;
drop policy if exists "equipe apaga imagem"     on storage.objects;


-- =====================================================================
-- FIM. Se rodou sem erro, o banco está pronto.
--
-- PRÓXIMO PASSO (obrigatório): cadastrar os editores. Sem isso ninguém
-- consegue publicar, nem você. Está no passo 5 do SETUP.md.
--
-- NOTA PRA MUDANÇAS FUTURAS
-- Para acrescentar uma frente nova além de Pesquisa/Formações/Rede:
--   alter table public.noticias drop constraint noticias_categoria_check;
--   alter table public.noticias add constraint noticias_categoria_check
--     check (categoria in ('Pesquisa', 'Formações', 'Rede', 'Nova'));
-- e acrescentar a <option> em painel/noticias.html.
-- =====================================================================
