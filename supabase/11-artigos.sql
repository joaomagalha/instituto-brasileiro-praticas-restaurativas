-- =====================================================================
-- IBPR — Painel administrativo (CMS), Etapa 5: ARTIGOS
-- =====================================================================
-- Rode este arquivo INTEIRO uma única vez, no SQL Editor do Supabase.
-- Pode rodar de novo sem medo: nada duplica.
--
-- Pedido do Dr. Decildo (16/09/2026): uma área para os artigos do
-- Instituto, dentro de "IBPR em Movimento". Artigo é diferente de
-- notícia: tem autores com credenciais, resumo, palavras-chave, texto
-- longo com seções, e às vezes um PDF ou um DOI de revista.
--
-- O que ele cria:
--   1. a tabela `artigos`
--   2. o gatilho de "última edição" (reusa a função das notícias)
--   3. as regras de segurança (RLS), iguais às das notícias
--   4. o "balde" `artigos` no storage: aceita PDF e imagem, até 20 MB
--   5. o gatilho que avisa o GitHub pra republicar o site
--   6. os 2 textos editáveis do topo da página artigos.html
--
-- Pré-requisitos: 01-noticias.sql (tabela editores + e_editor()),
-- 03-gatilho-github.sql (função avisar_github) e 05-textos.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABELA DE ARTIGOS
-- ---------------------------------------------------------------------
-- `autores` é uma lista: [{"nome": "...", "credenciais": ["...", "..."]}]
-- `palavras_chave` é uma lista de textos: ["Justiça Restaurativa", ...]
-- `corpo` aceita uma marcação leve, explicada no painel:
--   linha em branco separa parágrafos · "## Título" abre uma seção ·
--   "### Subtítulo" abre uma subseção · "> texto" é citação ·
--   *itálico* e **negrito** · "[1]" no texto vira nota, e a seção
--   "## Notas" no fim lista as notas numeradas.
create table if not exists public.artigos (
  id               uuid primary key default gen_random_uuid(),

  titulo           text not null check (length(trim(titulo)) > 0),
  subtitulo        text,                   -- a parte depois dos dois-pontos, quando houver
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),

  autores          jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(autores) = 'array'),
  resumo           text,
  palavras_chave   jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(palavras_chave) = 'array'),
  corpo            text,

  -- acesso ao original, todos opcionais
  pdf_url          text,                   -- PDF no storage (ou caminho no site)
  doi              text,                   -- só o código, ex: 10.54795/RejuBespecial.SisPri.202
  publicacao_nome  text,                   -- revista/livro onde saiu, ex: ReJuB
  publicacao_url   text,

  -- capa opcional (a maioria dos artigos não tem)
  imagem_url       text,
  imagem_alt       text,

  status           text not null default 'rascunho'
                   check (status in ('rascunho', 'publicado')),

  publicado_em     timestamptz,            -- data que o site mostra
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

comment on table public.artigos is
  'Artigos do IBPR em Movimento. Só linhas com status = publicado aparecem no site.';

create index if not exists artigos_publicados_idx
  on public.artigos (status, publicado_em desc);


-- ---------------------------------------------------------------------
-- 2. GATILHO DE "ÚLTIMA EDIÇÃO" (função criada em 01-noticias.sql)
-- ---------------------------------------------------------------------
drop trigger if exists artigos_set_atualizado_em on public.artigos;
create trigger artigos_set_atualizado_em
  before update on public.artigos
  for each row
  execute function public.set_atualizado_em();


-- ---------------------------------------------------------------------
-- 3. SEGURANÇA (RLS), igual às notícias
-- ---------------------------------------------------------------------
alter table public.artigos enable row level security;

drop policy if exists "visitante le artigos publicados" on public.artigos;
create policy "visitante le artigos publicados"
  on public.artigos
  for select
  to anon
  using (status = 'publicado');

drop policy if exists "editor le todos os artigos" on public.artigos;
create policy "editor le todos os artigos"
  on public.artigos
  for select
  to authenticated
  using (public.e_editor());

drop policy if exists "editor cria artigo" on public.artigos;
create policy "editor cria artigo"
  on public.artigos
  for insert
  to authenticated
  with check (public.e_editor());

drop policy if exists "editor edita artigo" on public.artigos;
create policy "editor edita artigo"
  on public.artigos
  for update
  to authenticated
  using (public.e_editor())
  with check (public.e_editor());

drop policy if exists "editor apaga artigo" on public.artigos;
create policy "editor apaga artigo"
  on public.artigos
  for delete
  to authenticated
  using (public.e_editor());


-- ---------------------------------------------------------------------
-- 4. STORAGE — o "balde" de PDFs e capas dos artigos
-- ---------------------------------------------------------------------
-- 20 MB porque artigo em PDF com figuras passa fácil de 5 MB.
-- PDF entra na lista de tipos; .html/.js continuam barrados.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artigos', 'artigos', true, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "arquivo de artigo e publico" on storage.objects;
create policy "arquivo de artigo e publico"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'artigos');

drop policy if exists "editor envia arquivo de artigo" on storage.objects;
create policy "editor envia arquivo de artigo"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'artigos' and public.e_editor());

drop policy if exists "editor substitui arquivo de artigo" on storage.objects;
create policy "editor substitui arquivo de artigo"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'artigos' and public.e_editor())
  with check (bucket_id = 'artigos' and public.e_editor());

drop policy if exists "editor apaga arquivo de artigo" on storage.objects;
create policy "editor apaga arquivo de artigo"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'artigos' and public.e_editor());


-- ---------------------------------------------------------------------
-- 5. AVISAR O GITHUB (função criada em 03-gatilho-github.sql)
-- ---------------------------------------------------------------------
drop trigger if exists artigos_avisa_github on public.artigos;
create trigger artigos_avisa_github
  after insert or update or delete on public.artigos
  for each statement
  execute function public.avisar_github();


-- ---------------------------------------------------------------------
-- 6. TEXTOS EDITÁVEIS do topo de artigos.html
-- ---------------------------------------------------------------------
insert into public.textos (
  chave, arquivo, pagina, secao, rotulo, ajuda, tipo, ordem, valor, valor_original
) values
  (
    'artigos-hero-titulo', 'artigos.html',
    'Artigos', 'Topo da página', 'Título', 'No máximo 2 linhas no computador.',
    'texto', 34,
    'Artigos.',
    'Artigos.'
  ),
  (
    'artigos-hero-sub', 'artigos.html',
    'Artigos', 'Topo da página', 'Texto de apoio', null,
    'texto', 35,
    'A produção acadêmica do Instituto e dos profissionais da sua rede: textos completos, com resumo, palavras-chave e referências.',
    'A produção acadêmica do Instituto e dos profissionais da sua rede: textos completos, com resumo, palavras-chave e referências.'
  )
on conflict (chave) do nothing;


-- =====================================================================
-- Conferência: as 3 consultas abaixo devem devolver, na ordem,
--   1 linha (a tabela existe e está vazia: count = 0),
--   5 linhas (as políticas de artigos),
--   1 linha (o bucket 'artigos' com 20971520 bytes).
-- =====================================================================
-- select count(*) from public.artigos;
-- select policyname from pg_policies where tablename = 'artigos';
-- select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'artigos';
