-- =====================================================================
-- 14 · Trava a listagem do storage e as colunas fixas de `textos`
-- 28/09/2026, auditoria de segurança do painel
-- =====================================================================
-- Rodar uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- 1. STORAGE: qualquer pessoa com a chave pública conseguia LISTAR os
--    arquivos dos 4 buckets, inclusive o PDF de um artigo ainda em
--    rascunho (o PDF sobe já no primeiro "Salvar rascunho"). Bucket
--    público não precisa de regra de leitura pra servir a URL pública:
--    as fotos e PDFs do site continuam abrindo normalmente. A regra de
--    leitura fica só pra editor, porque o painel precisa dela pra apagar
--    arquivo antigo.
--
-- 2. TEXTOS: o `revoke update (chave, arquivo, valor_original)` do
--    arquivo 05 não valia, porque o Supabase dá UPDATE na tabela inteira
--    pro papel `authenticated`, e revogar coluna não tira privilégio de
--    tabela. Um editor, pela API, conseguia mudar `arquivo` e travar o
--    build do site inteiro. Agora só a coluna `valor` pode ser alterada.
-- =====================================================================

-- 1. Storage: leitura (listagem) só pra editor ------------------------
drop policy if exists "imagem de noticia e publica" on storage.objects;
drop policy if exists "imagem de formacao e publica" on storage.objects;
drop policy if exists "foto de pessoa e publica"     on storage.objects;
drop policy if exists "arquivo de artigo e publico"  on storage.objects;

drop policy if exists "editor le arquivos do site" on storage.objects;
create policy "editor le arquivos do site"
  on storage.objects
  for select
  to authenticated
  using (bucket_id in ('noticias', 'formacoes', 'pessoas', 'artigos') and public.e_editor());

-- 2. Textos: só `valor` pode mudar ------------------------------------
revoke update on public.textos from authenticated, anon;
grant update (valor) on public.textos to authenticated;

-- Conferência: tem que sair tudo "ok" ----------------------------------
select
  case when has_column_privilege('authenticated', 'public.textos', 'valor',   'UPDATE') then 'ok' else 'ERRO' end as textos_valor_editavel,
  case when has_column_privilege('authenticated', 'public.textos', 'arquivo', 'UPDATE') then 'ERRO' else 'ok' end as textos_arquivo_travado,
  case when has_column_privilege('authenticated', 'public.textos', 'chave',   'UPDATE') then 'ERRO' else 'ok' end as textos_chave_travada,
  case when (select count(*) from pg_policies
              where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
                and 'anon' = any(roles)) = 0 then 'ok' else 'ERRO' end as storage_sem_listagem_anonima;
