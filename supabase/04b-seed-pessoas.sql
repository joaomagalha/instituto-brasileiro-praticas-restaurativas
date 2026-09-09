-- =====================================================================
-- IBPR — Etapa 3: SEED das 5 pessoas que já estão no ar
-- =====================================================================
-- Rode DEPOIS de `04-pessoas.sql` e ANTES de rodar o build pela primeira
-- vez.
--
-- POR QUE ESTE ARQUIVO EXISTE
-- A partir de agora quem manda na seção "As pessoas por trás do propósito"
-- é o banco. Se o build rodasse com a tabela vazia, a seção ficaria sem
-- ninguém. Este arquivo coloca no banco exatamente o que já está no ar
-- hoje: mesmo texto, mesmas fotos, mesma ordem.
--
-- O conteúdo abaixo não foi redigitado: foi extraído automaticamente de
-- `o-instituto.html` e `index.html` de 09/09/2026.
--
-- DUAS CONVENÇÕES QUE VALEM AQUI
-- 1. Itálico se escreve com asterisco: `*Justiça Restaurativa na Execução
--    Penal*` vira <em>...</em> no site. É o único código aceito nos textos,
--    e existe pros títulos de livro que já estavam na página. Todo o resto
--    é escapado, então ninguém consegue injetar HTML pelo painel.
-- 2. `foto_alt` em branco = o site usa o nome da pessoa, que é exatamente
--    o que as 5 fotos já faziam.
--
-- `on conflict (slug) do nothing`: rodar de novo NÃO sobrescreve nada. Se
-- o Instituto já tiver editado alguém pelo painel, a edição fica.
--
-- ⚠️ RAUNY VIANA está fora de propósito. O grupo pediu a remoção dele do
-- site em 31/08 até definirem como descrever a função. A foto continua no
-- repositório (`assets/images/fundadores/rauny-viana.jpg`). Quando
-- definirem, é só cadastrar pelo painel: não precisa de SQL nem de mim.
-- =====================================================================

insert into public.pessoas (
  slug, nome, grupo, cargo, bio, trajetoria,
  foto_url, foto_alt, foto_largura, foto_altura,
  destaque_home, ordem, status
) values
  (
    'fernanda-mariela-lopes',
    'Fernanda Mariela Lopes',
    'direcao',
    'Diretora-Geral',
    'Administradora de Empresas e Advogada, com especialização em Docência Superior, Fernanda é responsável pela gestão institucional e operacional do IBPR.',
    '["Graduada em Administração de Empresas e em Direito, com especialização em Docência do Ensino Superior. Atuou como professora da Universidade Estadual de Goiás (UEG), advogada e Subprocuradora-Geral do Município de Goianésia, acumulando experiência nas áreas de gestão, administração pública, docência e assessoria jurídica.","É facilitadora de Círculos de Construção de Paz, certificada pela Escola Judicial do Tribunal de Justiça do Estado de Goiás (EJUG), participando de iniciativas voltadas à formação e à difusão das Práticas Restaurativas.","No Instituto Brasileiro de Práticas Restaurativas (IBPR), lidera a gestão institucional e o desenvolvimento organizacional, sendo responsável pelo planejamento estratégico, pela coordenação administrativa, pela estruturação operacional e pelo suporte à implementação dos programas, cursos e projetos desenvolvidos pelo instituto. Sua atuação assegura que a produção científica, a formação e a inovação desenvolvidas pelo IBPR sejam transformadas em ações concretas, sustentáveis e capazes de gerar impacto para pessoas e instituições."]'::jsonb,
    'assets/images/fundadores/fernanda-mariela-lopes.jpg',
    null,
    700, 875,
    true, 1,
    'publicado'
  ),
  (
    'decildo-lopes',
    'Decildo Lopes',
    'direcao',
    'Coordenador Acadêmico',
    'Professor e pesquisador, Decildo é responsável pelo desenvolvimento dos conteúdos, cursos e programas de formação do IBPR, bem como por suas atividades de pesquisa e produção de conhecimento.',
    '["Juiz de Direito do Tribunal de Justiça do Estado de Goiás, atuou por mais de duas décadas na área criminal, com experiência em justiça criminal, execução penal e desenvolvimento de políticas públicas. Exerceu a coordenação do Núcleo Permanente de Justiça Restaurativa do Tribunal de Justiça do Estado de Goiás, integrou o Grupo de Monitoramento e Fiscalização do Sistema Carcerário e do Sistema Socioeducativo de Goiás (GMF-GO), o Conselho Estadual de Segurança Pública de Goiás e o Grupo de Trabalho do Ministério da Justiça responsável pela elaboração da política nacional de Justiça Restaurativa no sistema prisional brasileiro.","É mestre em Políticas Públicas voltadas à reintegração social de pessoas condenadas e doutorando em Direito, desenvolvendo pesquisa sobre Justiça Restaurativa, cultura institucional e transformação de organizações. Foi pesquisador visitante da Australian National University (ANU), na Austrália, onde aprofundou estudos sobre práticas restaurativas e transformação institucional sob a supervisão da Professora Meredith Rossner.","Em 2019, recebeu o prêmio de Melhor Prática da Justiça Criminal Brasileira, concedido pelo Fórum Nacional de Juízes Criminais (FONAJUC), em reconhecimento ao desenvolvimento de iniciativas inovadoras na área criminal. É coautor, ao lado do Defensor Público do Estado de Mato Grosso, Maxual Dias, do livro *Justiça Restaurativa na Execução Penal*, obra dedicada à aplicação da Justiça Restaurativa no contexto do sistema prisional brasileiro. Atua ainda na formação de magistrados, membros do sistema de justiça, policiais penais, servidores públicos e facilitadores em diferentes regiões do país.","Sua trajetória é marcada pela integração entre pesquisa acadêmica, formulação de políticas públicas e implementação prática de programas restaurativos, buscando aproximar a produção científica dos desafios concretos enfrentados pelas instituições."]'::jsonb,
    'assets/images/fundadores/decildo-lopes.jpg',
    null,
    700, 875,
    true, 2,
    'publicado'
  ),
  (
    'erica-santos',
    'Érica Fernanda Teixeira Santos',
    'rede',
    null,
    'Servidora pública com atuação profissional dedicada exclusivamente à Justiça Restaurativa, Érica possui experiência na aplicação de processos restaurativos em contextos de elevada complexidade, especialmente na justiça criminal, no sistema prisional e em situações de violência doméstica.',
    '[]'::jsonb,
    'assets/images/fundadores/erica-santos.jpg',
    null,
    700, 875,
    false, 3,
    'publicado'
  ),
  (
    'maxuel-dias',
    'Maxuel Pereira Dias',
    'rede',
    null,
    'Defensor Público, especialista em Criminologia e facilitador de práticas restaurativas, Maxuel é também coautor dos livros *Justiça Restaurativa na Execução Penal* e *Justiça Restaurativa: Novos Caminhos para o Sistema Penal*.',
    '[]'::jsonb,
    'assets/images/fundadores/maxuel-dias.jpg',
    null,
    700, 875,
    false, 4,
    'publicado'
  ),
  (
    'monica-borges',
    'Mônica Borges',
    'rede',
    null,
    'Servidora pública com atuação profissional dedicada exclusivamente à Justiça Restaurativa, Mônica acumula ampla experiência na implementação e no acompanhamento de práticas e programas restaurativos em diferentes contextos. É instrutora de práticas restaurativas, com destacada experiência no desenvolvimento de programas restaurativos em ambientes escolares.',
    '[]'::jsonb,
    'assets/images/fundadores/monica-borges.jpg',
    null,
    700, 875,
    false, 5,
    'publicado'
  )
on conflict (slug) do nothing;


-- Confira: deve devolver 5 linhas, todas 'publicado'.
-- Fernanda e Decildo em 'direcao' e com destaque_home = true.
select ordem, slug, grupo, cargo, destaque_home, status,
       jsonb_array_length(trajetoria) as paragrafos_trajetoria
from public.pessoas
order by ordem;
