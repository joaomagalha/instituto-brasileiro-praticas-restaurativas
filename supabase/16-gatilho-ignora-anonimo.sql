-- =====================================================================
-- 16 · O aviso ao GitHub ignora chamadas anônimas
-- 29/09/2026, diagnóstico do banco
-- =====================================================================
-- O gatilho é FOR EACH STATEMENT: dispara a cada UPDATE/DELETE, mesmo
-- quando a regra de acesso barrou tudo e nenhuma linha mudou. Na auditoria,
-- um PATCH anônimo de teste (0 linhas alteradas) disparou um build às
-- 20h32 de 29/09. Qualquer pessoa com a chave pública podia disparar
-- builds em série. Agora o aviso só sai quando quem mexeu é editor logado
-- (ou o próprio João, pelo SQL Editor, que não tem papel de API).
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem problema.
-- =====================================================================

create or replace function public.avisar_github()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
begin
  -- Chamada anônima pela API nunca muda conteúdo (as regras de acesso
  -- barram), então não tem o que publicar.
  if coalesce(auth.role(), '') = 'anon' then
    return null;
  end if;

  select decrypted_secret into token
    from vault.decrypted_secrets
   where name = 'github_token_cms';

  if token is null or token = '' then
    raise warning 'Segredo github_token_cms ausente no Vault. O site vai atualizar pelo agendamento de 6h.';
    return null;
  end if;

  -- net.http_post enfileira a chamada e devolve na hora: a publicação no
  -- painel não fica esperando o GitHub responder.
  perform net.http_post(
    url     := 'https://api.github.com/repos/joaomagalha/instituto-brasileiro-praticas-restaurativas/dispatches',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || token,
                 'Accept',        'application/vnd.github+json',
                 'Content-Type',  'application/json',
                 'User-Agent',    'ibpr-cms'   -- a API do GitHub exige
               ),
    body    := jsonb_build_object('event_type', 'cms')
  );

  return null;
end;
$$;

-- Conferência: tem que sair "ok"
select case when pg_get_functiondef('public.avisar_github()'::regprocedure) like '%auth.role()%'
            then 'ok' else 'ERRO' end as gatilho_ignora_anonimo;
