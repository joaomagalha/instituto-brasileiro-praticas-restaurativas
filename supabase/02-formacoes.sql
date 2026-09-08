-- =====================================================================
-- IBPR — Painel administrativo (CMS), Etapa 2b: FORMAÇÕES
-- =====================================================================
-- Rode este arquivo INTEIRO uma única vez, no SQL Editor do Supabase,
-- DEPOIS de já ter rodado o 01-noticias.sql.
-- Pode rodar de novo sem medo: nada duplica e nada é sobrescrito.
--
-- O que ele cria:
--   1. a tabela `formacoes`
--   2. o gatilho de "última edição"
--   3. as regras de segurança (RLS), no mesmo padrão das notícias
--   4. o "balde" de imagens das formações (storage)
--   5. o gatilho que avisa o GitHub pra republicar o site
--
-- O SEED dos 4 cursos que já estão no ar fica no arquivo seguinte,
-- `02b-seed-formacoes.sql`. Rode ele logo depois deste.
--
-- ⚠️ ORDEM IMPORTA: se o build rodar com a tabela `formacoes` vazia, ele
-- apagaria os 4 cursos do menu, do rodapé, da Home e do catálogo. Por isso
-- o seed vem antes de qualquer build. O `gerar.mjs` também se recusa a
-- publicar uma lista vazia de formações, como segunda trava.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABELA DE FORMAÇÕES
-- ---------------------------------------------------------------------
-- Uma linha = uma formação = uma página de curso no site + o card que
-- aparece na Home, no catálogo, no menu e no rodapé.
--
-- POR QUE AS LISTAS SÃO JSONB, E NÃO TABELAS SEPARADAS
-- Módulos, eixos e tópicos poderiam virar tabelas-filhas (`modulos`,
-- `topicos`...). Seria o "certo" num sistema grande. Aqui seria pior: o
-- painel teria que salvar 4 tabelas em sequência, e uma falha no meio
-- deixaria o curso pela metade. Com JSONB, salvar um curso é UMA operação:
-- ou grava tudo, ou não grava nada.
create table if not exists public.formacoes (
  id             uuid primary key default gen_random_uuid(),

  -- --- identidade ---
  titulo         text not null check (length(trim(titulo)) > 0),
  -- Versão curta, pro card e pro menu. Ex: o título completo é
  -- "Implementação da Justiça Restaurativa no Plano Pena Justa" e o curto é
  -- "Implementação da JR no Plano Pena Justa". Se ficar vazio, usa o título.
  titulo_curto   text,
  -- Versão bem curta, só pro rodapé, onde a coluna é estreita.
  -- Ex: "Plano Pena Justa". Vazio = usa `titulo_curto`, e depois `titulo`.
  titulo_rodape  text,
  -- Endereço da página: formacao-<slug>.html. Único, e congelado depois de
  -- publicado (quem garante isso é o painel), pra não quebrar link já
  -- compartilhado.
  slug           text not null unique check (slug ~ '^[a-z0-9-]+$'),

  -- --- textos de apresentação ---
  subtitulo      text,   -- a frase embaixo do título, no topo da página
  resumo         text,   -- a prévia de 2 linhas do card
  publico_curto  text,   -- "Para diretores, professores e equipes"
  area           text,   -- "Educação", aparece como 3ª etiqueta no topo
  area_icone     text not null default 'fa-shapes',  -- ícone dessa etiqueta

  fundamento        text,  -- prosa; parágrafos separados por linha em branco
  resultados_intro  text,  -- a frase que abre a lista de resultados

  -- --- links e imagens ---
  link_curso       text,   -- endereço do curso na Hotmart
  imagem_hero_url  text,   -- foto de fundo do topo da página
  imagem_card_url  text,   -- foto do card (proporção 3:2)
  imagem_card_alt  text,   -- descrição da foto, pra leitor de tela e pro Google

  -- --- listas ---
  -- eixos:              [{ "chave": "...", "frase": "...", "desc": "..." }]
  -- modulos:            [{ "titulo": "...", "topicos": ["...", "..."] }]
  -- desenvolver:        ["...", "..."]
  -- para_quem:          ["...", "..."]
  -- resultados:         ["...", "..."]
  -- temas_relacionados: [{ "texto": "...", "href": "..." }]
  eixos              jsonb not null default '[]'::jsonb check (jsonb_typeof(eixos) = 'array'),
  modulos            jsonb not null default '[]'::jsonb check (jsonb_typeof(modulos) = 'array'),
  desenvolver        jsonb not null default '[]'::jsonb check (jsonb_typeof(desenvolver) = 'array'),
  para_quem          jsonb not null default '[]'::jsonb check (jsonb_typeof(para_quem) = 'array'),
  resultados         jsonb not null default '[]'::jsonb check (jsonb_typeof(resultados) = 'array'),
  temas_relacionados jsonb not null default '[]'::jsonb check (jsonb_typeof(temas_relacionados) = 'array'),

  -- --- campos que só o Google e o WhatsApp leem ---
  -- Todos opcionais. Vazios, o site cai nos textos visíveis acima. Existem
  -- porque as 4 páginas atuais já tinham esses textos escritos à mão, e
  -- jogá-los fora seria perder trabalho feito.
  meta_descricao text,  -- resumo que aparece no Google; vazio = usa `resumo`
  seo_descricao  text,  -- descrição nos dados estruturados
  seo_publico    text,  -- público-alvo nos dados estruturados

  -- --- controle ---
  status        text not null default 'rascunho'
                check (status in ('rascunho', 'publicado')),
  -- Posição no menu, na Home e no catálogo. Menor primeiro.
  ordem         integer not null default 100,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.formacoes is
  'Formações do IBPR. Uma linha vira a página do curso, o card da Home, o item do menu e o do rodapé.';

create index if not exists formacoes_publicadas_idx
  on public.formacoes (status, ordem);


-- ---------------------------------------------------------------------
-- 2. GATILHO DE "ÚLTIMA EDIÇÃO"
-- ---------------------------------------------------------------------
-- A função set_atualizado_em() já foi criada no 01-noticias.sql.
drop trigger if exists formacoes_set_atualizado_em on public.formacoes;
create trigger formacoes_set_atualizado_em
  before update on public.formacoes
  for each row
  execute function public.set_atualizado_em();


-- ---------------------------------------------------------------------
-- 3. SEGURANÇA (RLS)
-- ---------------------------------------------------------------------
-- Idêntico ao das notícias:
--   • visitante (anon)       → só LÊ formações publicadas
--   • editor (na tabela)     → lê tudo e pode criar/editar/apagar
--   • logado sem ser editor  → não consegue nada
alter table public.formacoes enable row level security;

drop policy if exists "visitante le formacoes publicadas" on public.formacoes;
create policy "visitante le formacoes publicadas"
  on public.formacoes
  for select
  to anon
  using (status = 'publicado');

drop policy if exists "editor le formacoes" on public.formacoes;
create policy "editor le formacoes"
  on public.formacoes
  for select
  to authenticated
  using (public.e_editor());

drop policy if exists "editor cria formacao" on public.formacoes;
create policy "editor cria formacao"
  on public.formacoes
  for insert
  to authenticated
  with check (public.e_editor());

drop policy if exists "editor edita formacao" on public.formacoes;
create policy "editor edita formacao"
  on public.formacoes
  for update
  to authenticated
  using (public.e_editor())
  with check (public.e_editor());

drop policy if exists "editor apaga formacao" on public.formacoes;
create policy "editor apaga formacao"
  on public.formacoes
  for delete
  to authenticated
  using (public.e_editor());


-- ---------------------------------------------------------------------
-- 4. STORAGE — o "balde" das imagens das formações
-- ---------------------------------------------------------------------
-- Mesmos limites de servidor das notícias: 5 MB e só imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('formacoes', 'formacoes', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagem de formacao e publica" on storage.objects;
create policy "imagem de formacao e publica"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'formacoes');

drop policy if exists "editor envia imagem de formacao" on storage.objects;
create policy "editor envia imagem de formacao"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'formacoes' and public.e_editor());

drop policy if exists "editor substitui imagem de formacao" on storage.objects;
create policy "editor substitui imagem de formacao"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'formacoes' and public.e_editor())
  with check (bucket_id = 'formacoes' and public.e_editor());

drop policy if exists "editor apaga imagem de formacao" on storage.objects;
create policy "editor apaga imagem de formacao"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'formacoes' and public.e_editor());


-- ---------------------------------------------------------------------
-- 5. GATILHO QUE AVISA O GITHUB
-- ---------------------------------------------------------------------
-- Reaproveita a função avisar_github() criada no 03-gatilho-github.sql.
-- Se você ainda não rodou aquele arquivo, rode antes: sem ele este bloco
-- falha dizendo que a função não existe.
--
-- FOR EACH STATEMENT (e não FOR EACH ROW): apagar 3 cursos de uma vez
-- dispara UM aviso, não três.
drop trigger if exists formacoes_avisa_github on public.formacoes;
create trigger formacoes_avisa_github
  after insert or update or delete on public.formacoes
  for each statement
  execute function public.avisar_github();


-- =====================================================================
-- FIM DO ESQUEMA.
--
-- PRÓXIMO PASSO OBRIGATÓRIO: rodar `02b-seed-formacoes.sql`, que carrega
-- os 4 cursos que já estão no ar. Só depois disso pode rodar o build.
-- =====================================================================
