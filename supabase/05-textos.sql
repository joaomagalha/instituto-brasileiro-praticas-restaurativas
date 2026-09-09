-- =====================================================================
-- IBPR — Painel administrativo (CMS), Etapa 4: TEXTOS INSTITUCIONAIS
-- =====================================================================
-- Rode este arquivo INTEIRO uma única vez, no SQL Editor do Supabase,
-- DEPOIS do 01-noticias.sql e do 03-gatilho-github.sql.
-- Pode rodar de novo sem medo: nada duplica e nada é sobrescrito.
--
-- (É a 05 porque o 03 já era o gatilho do GitHub e a 04 é Pessoas.)
--
-- O QUE ESTA ETAPA TEM DE DIFERENTE DAS OUTRAS TRÊS
-- Notícias, Formações e Pessoas CRIAM coisas no site: uma linha nova vira
-- um card, uma página, um item de menu. Aqui não. Cada linha desta tabela
-- é um pedaço de texto que JÁ EXISTE numa página, e o painel só troca as
-- palavras dele.
--
-- Por isso o editor **não pode criar nem apagar** linha aqui (está escrito
-- nas regras de segurança, mais abaixo). Um bloco de texto só existe se
-- houver um marcador correspondente no HTML, e quem escreve marcador sou
-- eu. Sem essa trava, seria fácil apagar um bloco pelo painel e deixar um
-- buraco numa página, sem entender por quê.
--
-- Foram escolhidos 33 blocos entre os 165 parágrafos do site: os que
-- mudam com o tempo. O critério e a lista do que ficou de fora estão no
-- SETUP.md, seção "Etapa 4".
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABELA DE TEXTOS
-- ---------------------------------------------------------------------
create table if not exists public.textos (
  id       uuid primary key default gen_random_uuid(),

  -- O endereço do bloco. É o que casa com o marcador
  -- <!-- CMS:texto:home-hero-sub --> escrito no HTML.
  chave    text not null unique check (chave ~ '^[a-z0-9-]+$'),

  -- Em qual arquivo o marcador mora. O build usa isto pra abrir a página
  -- certa; o painel, pra agrupar a lista.
  arquivo  text not null,

  -- --- só pra pessoa se achar no painel ---
  pagina   text not null,   -- "Página inicial", "O Instituto"...
  secao    text not null,   -- "Missão", "Princípios", "Topo da página"...
  rotulo   text not null,   -- "Texto de apoio", "Princípio 02"...
  ajuda    text,            -- a linha de dica embaixo do campo

  -- 'texto' = uma frase ou parágrafo, entra dentro de um título ou <p>
  --           que já existe;
  -- 'prosa' = vários parágrafos, separados por linha em branco.
  tipo     text not null default 'texto' check (tipo in ('texto', 'prosa')),

  valor    text not null,

  -- O texto como estava no site no dia em que o CMS foi ligado. Nunca é
  -- alterado pelo painel: é o "desfazer" de última instância, o botão
  -- "restaurar o texto original". Sem isso, uma edição infeliz num
  -- domingo só voltaria com o João abrindo o histórico do Git.
  valor_original text not null,

  ordem    integer not null default 100,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.textos is
  'Textos institucionais editáveis. Cada linha corresponde a um marcador <!-- CMS:texto:chave --> no HTML.';

create index if not exists textos_ordem_idx on public.textos (ordem);


-- ---------------------------------------------------------------------
-- 2. GATILHO DE "ÚLTIMA EDIÇÃO"
-- ---------------------------------------------------------------------
drop trigger if exists textos_set_atualizado_em on public.textos;
create trigger textos_set_atualizado_em
  before update on public.textos
  for each row
  execute function public.set_atualizado_em();


-- ---------------------------------------------------------------------
-- 3. SEGURANÇA (RLS)
-- ---------------------------------------------------------------------
-- Diferente das outras etapas: o editor **só atualiza**. Não cria linha,
-- não apaga linha. Criar um texto sem marcador no HTML não faria nada;
-- apagar um faria um pedaço da página parar de ser editável, sem aviso.
--
-- Não existe rascunho aqui: mudar um texto é como corrigir uma frase num
-- documento. Quem errar tem o botão "restaurar o texto original".
alter table public.textos enable row level security;

drop policy if exists "visitante le textos" on public.textos;
create policy "visitante le textos"
  on public.textos
  for select
  to anon
  using (true);

drop policy if exists "editor le textos" on public.textos;
create policy "editor le textos"
  on public.textos
  for select
  to authenticated
  using (public.e_editor());

drop policy if exists "editor edita texto" on public.textos;
create policy "editor edita texto"
  on public.textos
  for update
  to authenticated
  using (public.e_editor())
  with check (public.e_editor());

-- Sem policy de insert e de delete, de propósito: sem policy, a operação
-- é negada. Quem precisar de um bloco novo pede pro João, que escreve o
-- marcador no HTML e acrescenta a linha aqui.

-- Trava dupla: mesmo que uma policy de update larga apareça um dia, estas
-- duas colunas não mudam pelo painel.
revoke update (chave, arquivo, valor_original) on public.textos from authenticated;


-- ---------------------------------------------------------------------
-- 4. GATILHO QUE AVISA O GITHUB
-- ---------------------------------------------------------------------
drop trigger if exists textos_avisa_github on public.textos;
create trigger textos_avisa_github
  after insert or update or delete on public.textos
  for each statement
  execute function public.avisar_github();


-- =====================================================================
-- FIM DO ESQUEMA.
--
-- PRÓXIMO PASSO OBRIGATÓRIO: rodar `05b-seed-textos.sql`, que carrega os
-- 33 blocos com o texto que está no ar hoje.
--
-- Diferente das Formações e das Pessoas, aqui a tabela vazia não estraga
-- nada: sem linha nenhuma, o build não encosta em texto nenhum e o site
-- fica como está. O seed é o que faz o painel ter o que mostrar.
-- =====================================================================
