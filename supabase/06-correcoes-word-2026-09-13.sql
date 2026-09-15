-- =====================================================================
-- IBPR — Correções do Word da Fernanda (13/09/2026) nos textos do CMS
-- =====================================================================
-- Rode UMA vez no SQL Editor do Supabase (projeto ibpr-site).
--
-- Por quê: estes dois blocos são editáveis pelo painel. O build
-- (build/gerar.mjs) reescreve o HTML com o que está no banco toda vez
-- que alguém publica algo. Sem este UPDATE, a próxima publicação
-- devolveria o texto antigo, mesmo com o HTML já corrigido no repo.
-- O seed (05b) não resolve: é `on conflict do nothing`.
--
-- `valor` é o que o build usa; `valor_original` é o que o botão
-- "restaurar o texto original" devolve. Os dois têm que mudar.
-- =====================================================================

update public.textos
set valor          = 'No IBPR, esses três caminhos andam juntos.',
    valor_original = 'No IBPR, esses três caminhos andam juntos.'
where chave = 'home-proposito-sub';

update public.textos
set valor          = 'A forma como lidamos com conflitos e danos pode mudar relações e instituições.',
    valor_original = 'A forma como lidamos com conflitos e danos pode mudar relações e instituições.'
where chave = 'instituto-hero-sub';

-- Conferência: as duas linhas têm que voltar com o texto novo.
select chave, valor from public.textos
where chave in ('home-proposito-sub', 'instituto-hero-sub');
