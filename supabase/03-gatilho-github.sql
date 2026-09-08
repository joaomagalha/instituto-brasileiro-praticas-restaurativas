-- =====================================================================
-- IBPR — gatilho que avisa o GitHub quando alguém publica
-- =====================================================================
-- Sem isto o site já se atualiza sozinho, mas só de 6 em 6 horas (o
-- agendamento do workflow). Com isto, cai para cerca de 2 minutos.
--
-- ⚠️ ANTES de rodar este arquivo, guarde o token do GitHub no Vault.
--    O comando está no SETUP.md, passo "Gatilho de publicação". Ele NÃO
--    entra aqui de propósito: este arquivo é versionado no GitHub, e
--    token em repositório é vazamento.
--
-- Rode depois de 01-noticias.sql. Pode rodar de novo sem medo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Extensão que permite ao banco fazer chamadas HTTP
-- ---------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;


-- ---------------------------------------------------------------------
-- 2. A função que avisa o GitHub
-- ---------------------------------------------------------------------
-- SECURITY DEFINER porque ela precisa ler o cofre (Vault), e quem publica
-- pelo painel não tem (nem deve ter) esse acesso.
--
-- Se o segredo não estiver lá, ela avisa no log e segue em frente sem
-- erro: publicar uma notícia não pode falhar por causa do robô. O pior
-- caso vira "o site atualiza em 6h em vez de 2min", não "não consigo
-- publicar".
create or replace function public.avisar_github()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
begin
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

comment on function public.avisar_github() is
  'Dispara o workflow "Publicar site" no GitHub quando o conteúdo muda.';


-- ---------------------------------------------------------------------
-- 3. O gatilho na tabela de notícias
-- ---------------------------------------------------------------------
-- FOR EACH STATEMENT, não FOR EACH ROW: um aviso por operação. Se um dia
-- alguém apagar 10 notícias de uma vez, é 1 aviso, não 10 builds.
drop trigger if exists noticias_avisa_github on public.noticias;
create trigger noticias_avisa_github
  after insert or update or delete on public.noticias
  for each statement
  execute function public.avisar_github();


-- =====================================================================
-- Conferência: rode isto depois e veja se aparecem as 3 linhas.
--
--   select 'extensão pg_net' as item,
--          coalesce((select installed_version from pg_extension e
--                    join pg_available_extensions a on a.name='pg_net'
--                    where e.extname='pg_net'), 'NÃO INSTALADA') as valor
--   union all
--   select 'segredo no Vault',
--          coalesce((select 'sim' from vault.secrets where name='github_token_cms'), 'FALTANDO')
--   union all
--   select 'gatilho', coalesce((select tgname from pg_trigger
--          where tgname='noticias_avisa_github'), 'FALTANDO');
--
-- NOTA PRAS PRÓXIMAS ETAPAS
-- Quando existirem as tabelas `formacoes`, `pessoas` e `textos`, repetir
-- o bloco 3 para cada uma, apontando pra mesma função avisar_github().
-- =====================================================================
