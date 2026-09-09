-- =====================================================================
-- IBPR — Painel administrativo (CMS), Etapa 3: PESSOAS
-- =====================================================================
-- Rode este arquivo INTEIRO uma única vez, no SQL Editor do Supabase,
-- DEPOIS de já ter rodado o 01-noticias.sql e o 03-gatilho-github.sql.
-- Pode rodar de novo sem medo: nada duplica e nada é sobrescrito.
--
-- (O número 03 já era do gatilho do GitHub. Por isso Pessoas é a 04,
--  mesmo sendo a Etapa 3 do CMS.)
--
-- O que ele cria:
--   1. a tabela `pessoas`
--   2. o gatilho de "última edição"
--   3. as regras de segurança (RLS), no mesmo padrão das notícias
--   4. o "balde" das fotos (storage)
--   5. o gatilho que avisa o GitHub pra republicar o site
--
-- O SEED das 5 pessoas que já estão no ar fica no arquivo seguinte,
-- `04b-seed-pessoas.sql`. Rode ele logo depois deste.
--
-- ⚠️ ORDEM IMPORTA: se o build rodar com a tabela `pessoas` vazia, ele
-- deixaria a seção "As pessoas por trás do propósito" sem ninguém. Por
-- isso o seed vem antes de qualquer build. O `gerar.mjs` também se recusa
-- a publicar uma lista vazia de pessoas, como segunda trava.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABELA DE PESSOAS
-- ---------------------------------------------------------------------
-- Uma linha = uma pessoa. Ela aparece em, no máximo, dois lugares:
--   • a seção "As pessoas por trás do propósito", em o-instituto.html
--     (grupo 'direcao') ou "Quem já se juntou a este propósito"
--     (grupo 'rede');
--   • a prévia da Home, se `destaque_home` estiver marcado.
--
-- Não tem página própria, não entra no menu e não entra no rodapé. É de
-- propósito a etapa mais simples do CMS.
create table if not exists public.pessoas (
  id        uuid primary key default gen_random_uuid(),

  nome      text not null check (length(trim(nome)) > 0),

  -- Serve só pra nomear a foto no storage e pra ter um identificador
  -- estável. Não vira endereço de página nenhuma (pessoa não tem página).
  slug      text not null unique check (slug ~ '^[a-z0-9-]+$'),

  -- Em qual dos dois blocos da página a pessoa aparece:
  --   'direcao' → "As pessoas por trás do propósito" (com cargo e trajetória)
  --   'rede'    → "Quem já se juntou a este propósito" (só nome e bio)
  grupo     text not null default 'rede'
            check (grupo in ('direcao', 'rede')),

  -- A linha logo abaixo do nome. Ex: "Diretora-Geral".
  --
  -- ⚠️ NUNCA usar "Fundador"/"Fundadora" aqui: o Instituto pediu que o
  -- rótulo saísse do site por questão jurídica (31/08). Cargo, sempre.
  cargo     text,

  -- O parágrafo curto de apresentação, que todo mundo tem.
  bio       text not null check (length(trim(bio)) > 0),

  -- Os parágrafos do "Conheça a trajetória", que abre em sanfona.
  -- Lista de textos: ["parágrafo 1", "parágrafo 2"]. Vazia = a pessoa
  -- não ganha a sanfona (é o caso de todo mundo do grupo 'rede' hoje).
  trajetoria jsonb not null default '[]'::jsonb
             check (jsonb_typeof(trajetoria) = 'array'),

  -- --- foto ---
  -- Largura e altura ficam gravadas porque o navegador precisa delas pra
  -- reservar o espaço antes da imagem chegar. Sem isso a página "pula"
  -- enquanto carrega. O painel lê as duas sozinho, ao escolher o arquivo.
  foto_url     text,
  foto_alt     text,      -- vazio = o site usa o nome da pessoa
  foto_largura integer,
  foto_altura  integer,

  -- --- controle ---
  -- Quem aparece também na prévia da página inicial. Hoje: os dois da
  -- direção. Se ninguém estiver marcado, a Home mostra a direção inteira.
  destaque_home boolean not null default false,

  -- Posição dentro do bloco. Menor primeiro.
  ordem         integer not null default 100,

  status        text not null default 'rascunho'
                check (status in ('rascunho', 'publicado')),

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.pessoas is
  'Pessoas do IBPR. Aparecem em o-instituto.html (direção e rede) e, se destacadas, na prévia da Home.';

create index if not exists pessoas_publicadas_idx
  on public.pessoas (status, grupo, ordem);


-- ---------------------------------------------------------------------
-- 2. GATILHO DE "ÚLTIMA EDIÇÃO"
-- ---------------------------------------------------------------------
-- A função set_atualizado_em() já foi criada no 01-noticias.sql.
drop trigger if exists pessoas_set_atualizado_em on public.pessoas;
create trigger pessoas_set_atualizado_em
  before update on public.pessoas
  for each row
  execute function public.set_atualizado_em();


-- ---------------------------------------------------------------------
-- 3. SEGURANÇA (RLS)
-- ---------------------------------------------------------------------
-- Idêntico ao das notícias e das formações:
--   • visitante (anon)       → só LÊ pessoas publicadas
--   • editor (na tabela)     → lê tudo e pode criar/editar/apagar
--   • logado sem ser editor  → não consegue nada
alter table public.pessoas enable row level security;

drop policy if exists "visitante le pessoas publicadas" on public.pessoas;
create policy "visitante le pessoas publicadas"
  on public.pessoas
  for select
  to anon
  using (status = 'publicado');

drop policy if exists "editor le pessoas" on public.pessoas;
create policy "editor le pessoas"
  on public.pessoas
  for select
  to authenticated
  using (public.e_editor());

drop policy if exists "editor cria pessoa" on public.pessoas;
create policy "editor cria pessoa"
  on public.pessoas
  for insert
  to authenticated
  with check (public.e_editor());

drop policy if exists "editor edita pessoa" on public.pessoas;
create policy "editor edita pessoa"
  on public.pessoas
  for update
  to authenticated
  using (public.e_editor())
  with check (public.e_editor());

drop policy if exists "editor apaga pessoa" on public.pessoas;
create policy "editor apaga pessoa"
  on public.pessoas
  for delete
  to authenticated
  using (public.e_editor());


-- ---------------------------------------------------------------------
-- 4. STORAGE — o "balde" das fotos das pessoas
-- ---------------------------------------------------------------------
-- Mesmos limites de servidor das outras etapas: 5 MB e só imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pessoas', 'pessoas', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "foto de pessoa e publica" on storage.objects;
create policy "foto de pessoa e publica"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'pessoas');

drop policy if exists "editor envia foto de pessoa" on storage.objects;
create policy "editor envia foto de pessoa"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'pessoas' and public.e_editor());

drop policy if exists "editor substitui foto de pessoa" on storage.objects;
create policy "editor substitui foto de pessoa"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'pessoas' and public.e_editor())
  with check (bucket_id = 'pessoas' and public.e_editor());

drop policy if exists "editor apaga foto de pessoa" on storage.objects;
create policy "editor apaga foto de pessoa"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'pessoas' and public.e_editor());


-- ---------------------------------------------------------------------
-- 5. GATILHO QUE AVISA O GITHUB
-- ---------------------------------------------------------------------
-- Reaproveita a função avisar_github() criada no 03-gatilho-github.sql.
-- Se você ainda não rodou aquele arquivo, rode antes: sem ele este bloco
-- falha dizendo que a função não existe.
--
-- FOR EACH STATEMENT (e não FOR EACH ROW): mexer em 3 pessoas de uma vez
-- dispara UM aviso, não três.
drop trigger if exists pessoas_avisa_github on public.pessoas;
create trigger pessoas_avisa_github
  after insert or update or delete on public.pessoas
  for each statement
  execute function public.avisar_github();


-- =====================================================================
-- FIM DO ESQUEMA.
--
-- PRÓXIMO PASSO OBRIGATÓRIO: rodar `04b-seed-pessoas.sql`, que carrega as
-- 5 pessoas que já estão no ar. Só depois disso pode rodar o build.
-- =====================================================================
