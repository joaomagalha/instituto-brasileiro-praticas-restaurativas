-- =====================================================================
-- IBPR · 20 · Correções da revisão de segurança (19/10/2026)
-- =====================================================================
-- Rodar inteiro no SQL Editor (projeto ibpr-site). Pode rodar de novo
-- sem estragar. O bloco "DESFAZER" no fim volta tudo ao estado anterior.
--
--   1. Inscrição pela função inscrever(): responde sempre igual, com o
--      e-mail novo ou já inscrito. Antes, a resposta (409, ou o contador
--      Content-Range) deixava qualquer um testar quem está na lista.
--      O visitante para de gravar direto na tabela no arquivo 21.
--   2. Limite por internet: no máximo 10 tentativas por hora vindas do mesmo
--      IP (10, não 3: turma de formação no mesmo Wi-Fi ou operadora de celular
--      dividem o IP), e 60 no site todo a cada 10 min. Os limites são conferidos
--      ANTES de olhar se o e-mail existe (senão o limite viraria outro
--      jeito de testar). O IP vira um código HMAC com chave secreta do
--      Vault (não dá pra voltar ao IP sem a chave) e é apagado em 24 h.
--      Coberto pela política de privacidade ("registros técnicos ...
--      endereço de IP ... para segurança").
--   3. O aviso ao GitHub (publicar o site) só sai quando quem mexeu é
--      editor. Conta logada que não é editora não dispara mais build.
--      O SQL Editor (sem papel de API) continua publicando, como antes.
--   4. Permissões que o site não usa saem:
--      visitante (anon) não tem mais criar/editar/apagar nas tabelas de
--      conteúdo; conta logada não escreve em editores nem cria/apaga
--      textos (o painel só edita a coluna valor); e_editor() só pode ser
--      chamada por conta logada.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Chave secreta do código do IP (criada uma vez, fica só no Vault)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'inscricao_chave_ip') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
                                'inscricao_chave_ip',
                                'Chave do HMAC do IP no limite de inscrições (20-seguranca).');
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Tentativas de inscrição (só a função escreve; ninguém lê pela API)
-- ---------------------------------------------------------------------
create table if not exists public.inscricao_tentativas (
  ip_hash   text,
  criado_em timestamptz not null default now()
);
create index if not exists inscricao_tentativas_ip_quando
  on public.inscricao_tentativas (ip_hash, criado_em);
create index if not exists inscricao_tentativas_quando
  on public.inscricao_tentativas (criado_em);
alter table public.inscricao_tentativas enable row level security;
revoke all on public.inscricao_tentativas from anon, authenticated;

comment on table public.inscricao_tentativas is
  'Trava anti-robô do formulário de inscrição. Guarda só HMAC do IP (chave no Vault), apagado em 24 h.';

-- ---------------------------------------------------------------------
-- 1 e 2. Função de inscrição (o formulário chama /rest/v1/rpc/inscrever)
-- ---------------------------------------------------------------------
create or replace function public.inscrever(
  p_email          text,
  p_nome           text default null,
  p_origem         text default null,
  p_consentimento  boolean default false
)
returns void
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  cab   json;
  ip    text;
  chave text;
  hash  text;
begin
  -- dado fora da regra: recusa igual pra todos, antes de qualquer consulta
  if p_consentimento is not true
     or p_email is null
     or char_length(p_email) not between 5 and 254
     or p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
     or char_length(coalesce(p_nome, '')) > 120
     or char_length(coalesce(p_origem, '')) > 200 then
    raise exception 'Dados de inscrição inválidos.' using errcode = '22023';
  end if;

  -- IP real: o Cloudflare na frente do Supabase grava em cf-connecting-ip
  -- e sobrescreve o que o cliente mandar. Sem ele, só vale o limite geral.
  begin
    cab := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    cab := null;
  end;
  ip := nullif(trim(cab ->> 'cf-connecting-ip'), '');

  -- IPv6: cada casa recebe um bloco /64 inteiro e pode trocar de endereço
  -- à vontade, então o bloco conta como uma pessoa só
  if ip is not null and position(':' in ip) > 0 then
    begin
      ip := network(set_masklen(ip::inet, 64))::text;
    exception when others then
      null;
    end;
  end if;

  select decrypted_secret into chave from vault.decrypted_secrets where name = 'inscricao_chave_ip';
  if ip is not null and coalesce(chave, '') <> '' then
    hash := encode(hmac(ip, chave, 'sha256'), 'hex');
  end if;

  -- um pedido por vez aqui dentro: pedidos simultâneos não furam o limite
  perform pg_advisory_xact_lock(hashtext('ibpr_inscrever'));

  delete from public.inscricao_tentativas where criado_em < now() - interval '24 hours';

  -- limites ANTES de saber se o e-mail existe
  if hash is not null and (select count(*) from public.inscricao_tentativas
       where ip_hash = hash and criado_em > now() - interval '1 hour') >= 10 then
    raise exception 'Muitas inscrições em pouco tempo. Tente de novo em alguns minutos.'
      using errcode = 'P0001';
  end if;
  if (select count(*) from public.inscricao_tentativas
       where criado_em > now() - interval '10 minutes') >= 60 then
    raise exception 'Muitas inscrições em pouco tempo. Tente de novo em alguns minutos.'
      using errcode = 'P0001';
  end if;

  insert into public.inscricao_tentativas (ip_hash) values (hash);

  -- e-mail já inscrito: não faz nada, e a resposta é a mesma
  insert into public.inscritos (nome, email, origem, consentimento)
  values (nullif(trim(p_nome), ''), trim(p_email), nullif(p_origem, ''), true)
  on conflict ((lower(email))) do nothing;
end;
$$;

revoke execute on function public.inscrever(text, text, text, boolean) from public;
grant execute on function public.inscrever(text, text, text, boolean) to anon, authenticated;

-- (o gatilho da tabela e o fim da gravação direta ficam no arquivo 21,
--  que roda DEPOIS de o site novo estar no ar: assim o formulário nunca quebra)

-- ---------------------------------------------------------------------
-- 3. Aviso ao GitHub só por editor (ou pelo SQL Editor)
-- ---------------------------------------------------------------------
create or replace function public.avisar_github()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
begin
  -- Visitante nunca muda conteúdo, e conta logada que não é editora
  -- também não (as regras de acesso barram): nada a publicar.
  -- No SQL Editor auth.role() vem vazio e o aviso sai normalmente.
  if coalesce(auth.role(), '') = 'anon'
     or (coalesce(auth.role(), '') = 'authenticated' and not public.e_editor()) then
    return null;
  end if;

  select decrypted_secret into token
    from vault.decrypted_secrets
   where name = 'github_token_cms';

  if token is null or token = '' then
    raise warning 'Segredo github_token_cms ausente no Vault. O site vai atualizar pelo agendamento de 6h.';
    return null;
  end if;

  perform net.http_post(
    url     := 'https://api.github.com/repos/joaomagalha/instituto-brasileiro-praticas-restaurativas/dispatches',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || token,
                 'Accept',        'application/vnd.github+json',
                 'Content-Type',  'application/json',
                 'User-Agent',    'ibpr-cms'
               ),
    body    := jsonb_build_object('event_type', 'cms')
  );

  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Permissões que o site não usa
-- ---------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on public.artigos, public.formacoes, public.noticias, public.pessoas,
     public.textos, public.editores from anon;
revoke truncate, references, trigger
  on public.artigos, public.formacoes, public.noticias, public.pessoas,
     public.textos, public.editores from authenticated;
revoke insert, update, delete on public.editores from authenticated;
revoke insert, delete on public.textos from authenticated;

revoke execute on function public.e_editor() from public, anon;
grant execute on function public.e_editor() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Conferência: tem que sair tudo "ok"
-- ---------------------------------------------------------------------
select
  case when has_function_privilege('anon', 'public.inscrever(text,text,text,boolean)', 'execute')
        and not has_table_privilege('anon', 'public.inscricao_tentativas', 'SELECT')
        and not has_table_privilege('authenticated', 'public.inscricao_tentativas', 'SELECT')
        and exists (select 1 from vault.secrets where name = 'inscricao_chave_ip')
        and pg_get_functiondef('public.inscrever(text,text,text,boolean)'::regprocedure) like '%>= 10 then%'
       then 'ok' else 'ERRO' end as inscricao,
  case when pg_get_functiondef('public.avisar_github()'::regprocedure) like '%e_editor()%'
       then 'ok' else 'ERRO' end as aviso_so_editor,
  case when not has_table_privilege('anon', 'public.noticias', 'INSERT')
        and not has_table_privilege('anon', 'public.textos', 'DELETE')
        and not has_table_privilege('anon', 'public.noticias', 'TRUNCATE')
        and has_table_privilege('anon', 'public.noticias', 'SELECT')
        and has_table_privilege('authenticated', 'public.noticias', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.editores', 'INSERT')
        and not has_table_privilege('authenticated', 'public.textos', 'INSERT')
        and not has_table_privilege('authenticated', 'public.textos', 'DELETE')
        and has_column_privilege('authenticated', 'public.textos', 'valor', 'UPDATE')
       then 'ok' else 'ERRO' end as permissoes,
  case when not has_function_privilege('anon', 'public.e_editor()', 'execute')
        and has_function_privilege('authenticated', 'public.e_editor()', 'execute')
       then 'ok' else 'ERRO' end as e_editor,
  case when has_column_privilege('anon', 'public.inscritos', 'email', 'INSERT')
       then 'PENDENTE: rodar o 21 depois de publicar o site' else 'ok' end as falta_21;

-- =====================================================================
-- DESFAZER (só se algo quebrar): descomentar e rodar este bloco.
-- Volta permissões e funções ao estado de 19/10 antes deste arquivo.
-- (O site publicado com a versão nova do inscricao.js chama inscrever();
--  ao desfazer, voltar também o inscricao.js pro commit anterior.)
-- =====================================================================
-- grant insert, update, delete, truncate, references, trigger
--   on public.artigos, public.formacoes, public.noticias, public.pessoas, public.editores to anon;
-- grant insert, delete, truncate, references, trigger on public.textos to anon;
-- grant truncate, references, trigger
--   on public.artigos, public.formacoes, public.noticias, public.pessoas,
--      public.textos, public.editores to authenticated;
-- grant insert, update, delete on public.editores to authenticated;
-- grant insert, delete on public.textos to authenticated;
-- grant execute on function public.e_editor() to public, anon;
-- (se o 21 já rodou, desfazer o 21 antes)
--
-- (avisar_github: rodar de novo o arquivo 16-gatilho-ignora-anonimo.sql)
-- drop function if exists public.inscrever(text, text, text, boolean);
-- drop table if exists public.inscricao_tentativas;
-- (a chave inscricao_chave_ip no Vault pode ficar; não é usada por mais nada)
