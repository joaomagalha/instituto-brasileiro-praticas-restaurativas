-- =====================================================================
-- IBPR · 21 · Fim da gravação direta em inscritos (19/10/2026)
-- =====================================================================
-- Rodar SÓ DEPOIS de o site com o inscricao.js novo (?v=20261019a) estar
-- no ar: ele chama a função inscrever() do arquivo 20. A partir daqui o
-- visitante não grava mais direto na tabela, e a resposta da API não
-- tem mais como revelar quem está na lista.
-- Pode rodar de novo sem estragar. DESFAZER no fim.
-- =====================================================================

-- O gatilho da tabela só carimba data e id (os limites ficam na função,
-- num lugar só; um limite aqui voltaria a responder diferente pra e-mail novo)
create or replace function public.inscritos_trava()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  new.criado_em := now();
  new.id := gen_random_uuid();
  return new;
end;
$$;

-- ninguém grava direto na tabela; só pela função
revoke insert on public.inscritos from anon, authenticated;
revoke insert (nome, email, origem, consentimento) on public.inscritos from anon, authenticated;

-- a regra de inscrição direta não serve mais pra nada
drop policy if exists "visitante se inscreve" on public.inscritos;

-- Conferência: tem que sair "ok"
select case when not has_column_privilege('anon', 'public.inscritos', 'email', 'INSERT')
             and not has_column_privilege('authenticated', 'public.inscritos', 'email', 'INSERT')
             and has_function_privilege('anon', 'public.inscrever(text,text,text,boolean)', 'execute')
             and pg_get_functiondef('public.inscritos_trava()'::regprocedure) not like '%P0001%'
            then 'ok' else 'ERRO' end as so_pela_funcao;

-- =====================================================================
-- DESFAZER: descomentar e rodar.
-- =====================================================================
-- grant insert (nome, email, origem, consentimento) on public.inscritos to anon, authenticated;
-- create policy "visitante se inscreve" on public.inscritos for insert
--   to anon, authenticated with check (consentimento = true);
-- create or replace function public.inscritos_trava()
-- returns trigger language plpgsql volatile security definer set search_path = public
-- as $$
-- begin
--   new.criado_em := now();
--   new.id := gen_random_uuid();
--   if (select count(*) from public.inscritos
--        where criado_em > now() - interval '10 minutes') >= 30 then
--     raise exception 'Muitas inscrições em pouco tempo. Tente de novo em alguns minutos.'
--       using errcode = 'P0001';
--   end if;
--   return new;
-- end;
-- $$;
