-- =====================================================================
-- 15 · Diagnóstico do banco (SOMENTE LEITURA, não altera nada)
-- 29/09/2026. Pode rodar quantas vezes quiser.
-- Resultado: uma tabela com cada verificação, "ok" ou "ATENÇÃO", e o detalhe.
-- =====================================================================
with
tabelas as (select unnest(array['noticias','artigos','formacoes','pessoas','textos','editores']) as t),
refs as (
  select imagem_url as u from public.noticias
  union all select imagem_url from public.artigos
  union all select pdf_url from public.artigos
  union all select imagem_hero_url from public.formacoes
  union all select imagem_card_url from public.formacoes
  union all select foto_url from public.pessoas
  union all select foto_url from public.editores
),
objetos as (
  select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0) as tamanho,
         exists (select 1 from refs where refs.u like '%/' || o.bucket_id || '/' || o.name) as usado
  from storage.objects o
  where o.bucket_id in ('noticias','artigos','formacoes','pessoas')
),
links as (
  select 'formacoes.link_curso' as campo, titulo as item, link_curso as u from public.formacoes where coalesce(link_curso,'') <> ''
  union all select 'artigos.publicacao_url', titulo, publicacao_url from public.artigos where coalesce(publicacao_url,'') <> ''
  union all select 'noticias.fonte_url', titulo, fonte_url from public.noticias where coalesce(fonte_url,'') <> ''
  union all select 'formacoes.temas', f.titulo, x->>'href' from public.formacoes f,
               jsonb_array_elements(case when jsonb_typeof(f.temas_relacionados) = 'array' then f.temas_relacionados else '[]'::jsonb end) x
             where coalesce(x->>'href','') <> ''
),
checagens as (
  -- 1. RLS ligado nas 6 tabelas
  select 1 as n, 'RLS ligado nas 6 tabelas' as verificacao,
    case when count(*) filter (where not c.relrowsecurity) = 0 then 'ok' else 'ATENÇÃO' end as resultado,
    coalesce(string_agg(c.relname, ', ') filter (where not c.relrowsecurity), '') as detalhe
  from tabelas join pg_class c on c.relname = tabelas.t and c.relnamespace = 'public'::regnamespace

  -- 2. Nenhuma regra deixa anônimo escrever
  union all select 2, 'Nenhuma regra de escrita pra anônimo',
    case when count(*) = 0 then 'ok' else 'ATENÇÃO' end,
    coalesce(string_agg(tablename || ': ' || policyname, '; '), '')
  from pg_policies
  where schemaname in ('public','storage') and cmd in ('INSERT','UPDATE','DELETE','ALL')
    and ('anon' = any(roles) or 'public' = any(roles))

  -- 3. Storage sem listagem anônima
  union all select 3, 'Storage sem listagem anônima',
    case when count(*) = 0 then 'ok' else 'ATENÇÃO' end, coalesce(string_agg(policyname, '; '), '')
  from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT' and 'anon' = any(roles)

  -- 4. Textos: só "valor" editável
  union all select 4, 'Textos: só a coluna valor é editável',
    case when has_column_privilege('authenticated','public.textos','valor','UPDATE')
          and not has_column_privilege('authenticated','public.textos','arquivo','UPDATE')
          and not has_column_privilege('authenticated','public.textos','chave','UPDATE')
          and not has_column_privilege('authenticated','public.textos','valor_original','UPDATE')
         then 'ok' else 'ATENÇÃO' end, ''

  -- 5. Gatilho que avisa o GitHub nas 5 tabelas de conteúdo
  union all select 5, 'Gatilho do GitHub nas 5 tabelas',
    case when count(distinct event_object_table) = 5 then 'ok' else 'ATENÇÃO' end,
    string_agg(distinct event_object_table, ', ')
  from information_schema.triggers where trigger_name like '%avisa_github'

  -- 6. Token do GitHub guardado no cofre
  union all select 6, 'Token do GitHub no cofre (Vault)',
    case when exists (select 1 from vault.secrets where name = 'github_token_cms') then 'ok' else 'ATENÇÃO' end, ''

  -- 7. Chamadas ao GitHub nos últimos 7 dias
  union all select 7, 'Avisos ao GitHub com erro (7 dias)',
    case when count(*) filter (where coalesce(status_code,0) not between 200 and 299) = 0 then 'ok' else 'ATENÇÃO' end,
    count(*) || ' chamadas, ' || count(*) filter (where coalesce(status_code,0) not between 200 and 299) || ' com erro; última: ' ||
    coalesce(to_char(max(created) at time zone 'America/Cuiaba', 'DD/MM HH24:MI'), 'nenhuma')
  from net._http_response where created > now() - interval '7 days'

  -- 8. Editores e contas batem
  union all select 8, 'Editores x contas de login',
    case when (select count(*) from public.editores e left join auth.users u on u.id = e.user_id where u.id is null) = 0
          and (select count(*) from auth.users u left join public.editores e on e.user_id = u.id where e.user_id is null) = 0
         then 'ok' else 'ATENÇÃO' end,
    (select count(*) from public.editores) || ' editores; ' ||
    (select coalesce(string_agg(coalesce(e.nome, u.email) || ' (último login ' ||
       coalesce(to_char(u.last_sign_in_at at time zone 'America/Cuiaba','DD/MM'), 'nunca') || ')', '; '), '')
       from auth.users u left join public.editores e on e.user_id = u.id)

  -- 9. Espaço usado no storage (plano gratuito: 1 GB)
  union all select 9, 'Espaço usado no storage',
    case when sum(tamanho) < 700 * 1024 * 1024 then 'ok' else 'ATENÇÃO' end,
    round(sum(tamanho) / 1024.0 / 1024.0, 1) || ' MB em ' || count(*) || ' arquivos de 1024 MB'
  from objetos

  -- 10. Arquivos órfãos (no storage, sem nenhum item usando)
  union all select 10, 'Arquivos órfãos no storage',
    case when count(*) filter (where not usado) = 0 then 'ok' else 'ATENÇÃO' end,
    count(*) filter (where not usado) || ' arquivo(s), ' ||
    round(coalesce(sum(tamanho) filter (where not usado),0) / 1024.0 / 1024.0, 1) || ' MB: ' ||
    coalesce(string_agg(bucket_id || '/' || name, ', ') filter (where not usado), '')
  from objetos

  -- 11. Links suspeitos digitados no painel
  union all select 11, 'Links do painel sem https ou perigosos',
    case when count(*) = 0 then 'ok' else 'ATENÇÃO' end,
    coalesce(string_agg(campo || ' em "' || left(item, 40) || '": ' || u, '; '), '')
  from links where u !~* '^(https?://|mailto:)' and u !~ '^[a-z0-9-]+\.html'

  -- 12. Item publicado com campo essencial vazio
  union all select 12, 'Publicado com campo essencial vazio',
    case when count(*) = 0 then 'ok' else 'ATENÇÃO' end, coalesce(string_agg(x, '; '), '')
  from (
    select 'notícia "' || left(titulo,40) || '": ' || concat_ws(', ',
             case when coalesce(resumo,'') = '' then 'sem resumo' end,
             case when publicado_em is null then 'sem data' end,
             case when imagem_url is not null and coalesce(imagem_alt,'') = '' then 'foto sem descrição' end) as x
      from public.noticias where status = 'publicado'
    union all select 'artigo "' || left(titulo,40) || '": ' || concat_ws(', ',
             case when coalesce(resumo,'') = '' then 'sem resumo' end,
             case when publicado_em is null then 'sem data' end,
             case when coalesce(corpo,'') = '' and coalesce(pdf_url,'') = '' then 'sem texto e sem PDF' end)
      from public.artigos where status = 'publicado'
    union all select 'pessoa "' || nome || '": ' || concat_ws(', ',
             case when coalesce(cargo,'') = '' then 'sem cargo' end,
             case when foto_url is not null and coalesce(foto_alt,'') = '' then 'foto sem descrição' end)
      from public.pessoas where status = 'publicado'
  ) z where x !~ ': $'

  -- 13. Rascunhos guardados (não aparecem no site)
  union all select 13, 'Rascunhos guardados no painel', 'info',
    (select count(*) from public.noticias where status <> 'publicado') || ' notícia(s), ' ||
    (select count(*) from public.artigos  where status <> 'publicado') || ' artigo(s), ' ||
    (select count(*) from public.formacoes where status <> 'publicado') || ' formação(ões), ' ||
    (select count(*) from public.pessoas  where status <> 'publicado') || ' pessoa(s)'

  -- 14. O que foi mexido nos últimos 3 dias
  union all select 14, 'Mexido nos últimos 3 dias', 'info', coalesce(string_agg(y, '; '), 'nada')
  from (
    select 'notícia "' || left(titulo,35) || '" (' || status || ', ' || to_char(atualizado_em at time zone 'America/Cuiaba','DD/MM HH24:MI') || ')' as y from public.noticias where atualizado_em > now() - interval '3 days'
    union all select 'artigo "' || left(titulo,35) || '" (' || status || ', ' || to_char(atualizado_em at time zone 'America/Cuiaba','DD/MM HH24:MI') || ')' from public.artigos where atualizado_em > now() - interval '3 days'
    union all select 'formação "' || left(titulo,35) || '" (' || status || ', ' || to_char(atualizado_em at time zone 'America/Cuiaba','DD/MM HH24:MI') || ')' from public.formacoes where atualizado_em > now() - interval '3 days'
    union all select 'pessoa "' || nome || '" (' || status || ', ' || to_char(atualizado_em at time zone 'America/Cuiaba','DD/MM HH24:MI') || ')' from public.pessoas where atualizado_em > now() - interval '3 days'
    union all select 'texto "' || chave || '" (' || to_char(atualizado_em at time zone 'America/Cuiaba','DD/MM HH24:MI') || ')' from public.textos where atualizado_em > now() - interval '3 days'
  ) m
)
select n as "#", verificacao, resultado, detalhe from checagens order by n;
