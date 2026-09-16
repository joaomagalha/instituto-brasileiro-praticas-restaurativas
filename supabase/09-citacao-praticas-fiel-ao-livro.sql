-- 16/09/2026: citação da página Práticas Restaurativas fiel ao livro
-- (pedido do Dr. Decildo). O HTML já foi atualizado no mesmo commit;
-- sem este UPDATE o build do painel devolveria a frase resumida.
update public.textos
set valor = '"Talvez um dos grandes empecilhos ao desenvolvimento da JR seja gastarmos mais tempo em explicá-la e compreendê-la do que em desenvolver o saber-fazer necessário para praticá-la."',
    valor_original = '"Talvez um dos grandes empecilhos ao desenvolvimento da JR seja gastarmos mais tempo em explicá-la e compreendê-la do que em desenvolver o saber-fazer necessário para praticá-la."'
where chave = 'praticas-citacao';

select chave, valor from public.textos where chave = 'praticas-citacao';
