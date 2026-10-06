-- =====================================================================
-- IBPR · 17 · Inscritos para receber publicações (06/10/2026)
-- =====================================================================
-- Pedido do Dr. Decildo (04/10): botão "Receber publicações" nos artigos,
-- nas notícias e no IBPR em Movimento. A pessoa deixa nome e e-mail e
-- aceita receber os e-mails do Instituto.
--
-- O QUE ESTA TABELA FAZ E O QUE NÃO FAZ
--   Faz: guarda quem pediu pra receber, com a data do aceite (LGPD).
--        O painel mostra a lista (aba Inscritos), copia os e-mails e
--        baixa a planilha; o Instituto manda as novidades por fora.
--   Não faz: enviar e-mail sozinho. Envio automático a cada publicação
--        é um projeto à parte, orçado separadamente (decisão do João, 06/10).
--
-- QUEM PODE O QUÊ (RLS)
--   Visitante (anon): só INSERIR. Não lê ninguém, nem a si mesmo, então
--   ninguém de fora consegue baixar a lista.
--   Editor (e_editor()): lê e apaga (pedido de descadastro, LGPD).
--   Ninguém edita: inscrição errada se apaga e a pessoa se inscreve de novo.
--
-- Rodar inteiro no SQL Editor do Supabase. Pode rodar de novo sem estragar.
-- =====================================================================

create table if not exists public.inscritos (
  id            uuid primary key default gen_random_uuid(),
  nome          text check (nome is null or char_length(nome) <= 120),
  email         text not null
                check (char_length(email) between 5 and 254
                       and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  origem        text check (origem is null or char_length(origem) <= 200),
  consentimento boolean not null check (consentimento = true),
  criado_em     timestamptz not null default now()
);

comment on table public.inscritos is
  'Quem pediu pra receber as publicações do IBPR (botão "Receber publicações"). Visitante só insere; editor lê e apaga.';

-- Um e-mail só uma vez, sem diferenciar maiúscula. Inscrição repetida
-- volta 409 pro site, que responde "você já está na lista".
create unique index if not exists inscritos_email_unico
  on public.inscritos (lower(email));

alter table public.inscritos enable row level security;

drop policy if exists "visitante se inscreve" on public.inscritos;
create policy "visitante se inscreve"
  on public.inscritos
  for insert
  to anon, authenticated
  with check (consentimento = true);

drop policy if exists "editor le inscritos" on public.inscritos;
create policy "editor le inscritos"
  on public.inscritos
  for select
  to authenticated
  using (public.e_editor());

drop policy if exists "editor apaga inscrito" on public.inscritos;
create policy "editor apaga inscrito"
  on public.inscritos
  for delete
  to authenticated
  using (public.e_editor());

-- Privilégios: o anon só precisa de INSERT (sem SELECT a lista fica fechada).
revoke all on public.inscritos from anon;
grant insert on public.inscritos to anon;
grant select, insert, delete on public.inscritos to authenticated;

-- Conferência (deve mostrar as 3 regras):
select policyname, cmd, roles from pg_policies where tablename = 'inscritos' order by policyname;
