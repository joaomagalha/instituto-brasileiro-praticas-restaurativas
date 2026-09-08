-- =====================================================================
-- IBPR — Etapa 2b: SEED das 4 formações que já estão no ar
-- =====================================================================
-- Rode DEPOIS de `02-formacoes.sql` e ANTES de rodar o build pela
-- primeira vez.
--
-- POR QUE ESTE ARQUIVO EXISTE
-- A partir de agora quem manda no menu, no rodapé, na Home e no catálogo
-- é o banco. Se o build rodasse com a tabela vazia, os 4 cursos sumiriam
-- do site. Este arquivo coloca no banco exatamente o que já está no ar
-- hoje: mesmo texto, mesmas fotos, mesmos endereços.
--
-- O conteúdo abaixo não foi redigitado: foi extraído automaticamente das
-- páginas `formacao-*.html` de 08/09/2026.
--
-- `on conflict (slug) do nothing`: rodar de novo NÃO sobrescreve nada. Se
-- o Instituto já tiver editado um curso pelo painel, a edição fica.
-- =====================================================================

insert into public.formacoes (
  slug, titulo, titulo_curto, titulo_rodape, subtitulo, resumo, publico_curto,
  area, area_icone, fundamento, resultados_intro,
  link_curso, imagem_hero_url, imagem_card_url, imagem_card_alt,
  eixos, modulos, desenvolver, para_quem, resultados, temas_relacionados,
  meta_descricao, seo_descricao, seo_publico,
  status, ordem
) values
  (
    'formacao-execucao-penal',
    'Justiça Restaurativa aplicada à Execução Penal',
    null,
    'Execução Penal',
    'Desenvolver competências para implementar práticas restaurativas no sistema prisional.',
    'Prepara equipes para planejar, implementar e acompanhar programas restaurativos em unidades prisionais, do caso individual ao desenvolvimento institucional.',
    'Para policiais penais, gestores e magistrados',
    'Justiça e sistema prisional',
    'fa-scale-balanced',
    'A incorporação da Justiça Restaurativa à execução penal exige profissionais preparados para compreender seus fundamentos, identificar oportunidades de aplicação e conduzir programas compatíveis com a realidade das unidades prisionais.

A formação capacita policiais penais e demais profissionais do sistema prisional a planejar, implementar e acompanhar práticas restaurativas, do caso individual ao desenvolvimento institucional, com conteúdo desenvolvido para a realidade do sistema prisional brasileiro e alinhado ao Plano Pena Justa.',
    'Ao final da formação, a instituição estará mais preparada para:',
    null,
    'assets/images/formacoes/execucao-penal.jpg?v=2',
    'assets/images/formacoes/execucao-penal-card.jpg?v=2',
    'Servidores caminham em direção à entrada de uma unidade prisional ao fim da tarde',
    '[{"chave":"Compreender","frase":"Fundamentos na execução penal","desc":"Reconhecer os princípios da Justiça Restaurativa e onde eles se aplicam na realidade das unidades prisionais."},{"chave":"Intervir","frase":"Casos individuais e equipes","desc":"Conduzir práticas restaurativas tanto na resolução de casos quanto no fortalecimento das equipes da Polícia Penal."},{"chave":"Transformar","frase":"Programas institucionais","desc":"Planejar, implantar e sustentar programas restaurativos alinhados às diretrizes do Plano Pena Justa."}]'::jsonb,
    '[{"titulo":"Fundamentos da Justiça Restaurativa na execução penal","topicos":["Princípios da Justiça Restaurativa e sua base em evidências científicas.","O que diferencia uma resposta restaurativa das respostas tradicionais.","Onde a abordagem restaurativa se aplica no sistema prisional."]},{"titulo":"Práticas restaurativas em casos individuais","topicos":["Identificação de situações com potencial restaurativo.","Condução de processos com pessoas privadas de liberdade.","Procedimentos e cuidados na aplicação caso a caso."]},{"titulo":"Equipes e cultura institucional","topicos":["Práticas restaurativas no fortalecimento das equipes da Polícia Penal.","Relações institucionais e clima organizacional na unidade.","Formação de equipes internas para conduzir os processos."]},{"titulo":"Implementação e Plano Pena Justa","topicos":["Planejamento de programas restaurativos na unidade prisional.","Protocolos institucionais para aplicação da Justiça Restaurativa.","Alinhamento às diretrizes do Plano Pena Justa."]}]'::jsonb,
    '["Compreender os fundamentos da Justiça Restaurativa e sua aplicação na execução penal.","Identificar situações em que práticas restaurativas podem qualificar a atuação institucional.","Planejar e implementar programas restaurativos em unidades prisionais.","Conduzir ou integrar equipes responsáveis pela aplicação de práticas restaurativas.","Desenvolver estratégias de fortalecimento das relações institucionais e da cultura organizacional.","Apoiar a implementação das diretrizes do Plano Pena Justa ligadas à Justiça Restaurativa."]'::jsonb,
    '["Policiais penais e servidores","Gestores do sistema prisional","Equipes multidisciplinares","Magistrados, Ministério Público e Defensoria","Advogados e demais profissionais da execução penal"]'::jsonb,
    '["Implantar programas restaurativos voltados às pessoas privadas de liberdade.","Desenvolver práticas restaurativas para fortalecer as equipes da Polícia Penal.","Estruturar procedimentos para uso de práticas restaurativas em casos individuais.","Elaborar protocolos institucionais alinhados às diretrizes do Plano Pena Justa.","Formar uma base técnica capaz de ampliar e consolidar os programas ao longo do tempo."]'::jsonb,
    '[{"texto":"Práticas Restaurativas na Justiça e Sistema Prisional","href":"praticas-restaurativas.html#justica-prisional"},{"texto":"Justiça Restaurativa e Práticas Restaurativas","href":"praticas-restaurativas.html#jr-praticas"},{"texto":"Implementação da JR no Plano Pena Justa","href":"formacao-pena-justa.html"},{"texto":"Como o IBPR atua","href":"como-atuamos.html"}]'::jsonb,
    'Formação do IBPR para policiais penais, gestores e equipes do sistema prisional planejarem, implementarem e acompanharem programas restaurativos em unidades prisionais.',
    'Formação para capacitar policiais penais e demais profissionais do sistema prisional a planejar, implementar e acompanhar práticas restaurativas, do caso individual ao desenvolvimento institucional e ao cumprimento das diretrizes do Plano Pena Justa.',
    'Policiais penais, gestores do sistema prisional, equipes multidisciplinares, magistrados, Ministério Público, Defensoria Pública e advogados',
    'publicado',
    1
  ),
  (
    'formacao-pena-justa',
    'Implementação da Justiça Restaurativa no Plano Pena Justa',
    'Implementação da JR no Plano Pena Justa',
    'Plano Pena Justa',
    'Preparar instituições para transformar diretrizes em programas concretos.',
    'Transforma as diretrizes do Plano Pena Justa em programas concretos: o participante sai do curso com um plano de implementação aplicável à própria instituição.',
    'Para gestores e comitês de políticas penais',
    'Políticas penais',
    'fa-building-shield',
    'O Plano Pena Justa incorporou a Justiça Restaurativa como uma das estratégias para o fortalecimento da política penal brasileira. Transformar essa diretriz em ações concretas exige mais do que conhecer o conteúdo do plano: exige planejamento, conhecimento técnico e capacidade de implementação.

A formação prepara gestores e equipes responsáveis pela execução do plano, com instrumentos para estruturar programas restaurativos, elaborar projetos institucionais e integrar a Justiça Restaurativa às políticas da instituição. Ao longo do curso, o participante desenvolve um plano de implementação aplicável à própria realidade.',
    'Ao final da formação, a instituição estará mais preparada para:',
    null,
    'assets/images/formacoes/pena-justa.jpg?v=2',
    'assets/images/formacoes/pena-justa-card.jpg?v=2',
    'Corredor de uma unidade prisional com uma sala de aula ao fundo e uma abertura para o jardim externo',
    '[{"chave":"Compreender","frase":"O Plano Pena Justa","desc":"Conhecer a estrutura, os objetivos e os espaços de aplicação da Justiça Restaurativa previstos na política nacional."},{"chave":"Estruturar","frase":"Programas por espaço de aplicação","desc":"Montar programas para audiências de custódia, justiça penal negociada, execução penal e alternativas penais."},{"chave":"Sustentar","frase":"Governança e resultados","desc":"Definir metas, indicadores e monitoramento que consolidem a Justiça Restaurativa como política institucional."}]'::jsonb,
    '[{"titulo":"O Plano Pena Justa e a Justiça Restaurativa","topicos":["O Plano Pena Justa: fundamentos, objetivos e diretrizes.","Justiça Restaurativa como política pública.","Estudos de caso nacionais e internacionais."]},{"titulo":"Espaços de aplicação previstos no plano","topicos":["Justiça Restaurativa nas audiências de custódia.","Justiça Restaurativa na justiça penal negociada.","Justiça Restaurativa na execução penal.","Justiça Restaurativa nas alternativas penais."]},{"titulo":"Planejamento e estruturação institucional","topicos":["Planejamento estratégico para implementação institucional.","Estruturação de programas restaurativos."]},{"titulo":"Governança e plano de implementação","topicos":["Governança, monitoramento e avaliação.","Articulação entre magistratura, Polícia Penal, Ministério Público e Defensoria.","Estruturação de projetos para parcerias institucionais e captação de recursos.","Oficina para elaboração do plano institucional de implementação."]}]'::jsonb,
    '["Compreender a estrutura, os objetivos e as diretrizes do Plano Pena Justa.","Identificar os espaços de aplicação da Justiça Restaurativa previstos no plano.","Planejar e implementar práticas restaurativas nas audiências de custódia.","Estruturar programas restaurativos na execução penal e nas alternativas penais.","Elaborar planos institucionais compatíveis com a realidade local.","Desenvolver indicadores para acompanhamento e avaliação dos programas."]'::jsonb,
    '["Gestores da Polícia Penal","Diretores de unidades prisionais","Magistrados, Ministério Público e Defensoria","Gestores estaduais e municipais","Comitês de Políticas Penais e equipes técnicas"]'::jsonb,
    '["Elaborar um plano institucional de implementação alinhado ao Plano Pena Justa.","Estruturar programas restaurativos para os diferentes espaços de aplicação da política nacional.","Desenvolver protocolos e fluxos institucionais para uso da Justiça Restaurativa.","Definir metas, indicadores e mecanismos de monitoramento dos programas.","Capacitar equipes para conduzir e expandir as iniciativas ao longo do tempo."]'::jsonb,
    '[{"texto":"Práticas Restaurativas na Justiça e Sistema Prisional","href":"praticas-restaurativas.html#justica-prisional"},{"texto":"Justiça Restaurativa e Práticas Restaurativas","href":"praticas-restaurativas.html#jr-praticas"},{"texto":"JR aplicada à Execução Penal","href":"formacao-execucao-penal.html"},{"texto":"Como o IBPR atua","href":"como-atuamos.html"}]'::jsonb,
    'Formação do IBPR para gestores e equipes responsáveis pelo Plano Pena Justa estruturarem programas restaurativos e elaborarem um plano institucional de implementação.',
    'Formação para preparar gestores e equipes responsáveis pela execução do Plano Pena Justa, com instrumentos para implementar as ações previstas, estruturar programas restaurativos, elaborar projetos institucionais e integrar a Justiça Restaurativa às políticas da instituição.',
    'Gestores da Polícia Penal, diretores de unidades prisionais, magistrados, Ministério Público, Defensoria Pública, gestores estaduais e municipais e comitês de políticas penais',
    'publicado',
    2
  ),
  (
    'formacao-ambiente-escolar',
    'Implementação de Práticas Restaurativas no Ambiente Escolar',
    'Práticas Restaurativas no Ambiente Escolar',
    'Ambiente Escolar',
    'Desenvolver uma cultura de convivência capaz de prevenir, enfrentar e aprender com os conflitos e danos presentes na escola.',
    'Leva práticas restaurativas para o cotidiano da escola: prevenção de bullying, gestão de conflitos e fortalecimento da cultura de convivência.',
    'Para diretores, professores e equipes',
    'Educação',
    'fa-graduation-cap',
    'Escolas convivem diariamente com desafios que vão além do processo de ensino-aprendizagem. Bullying, violência, conflitos interpessoais, dificuldades de comunicação, danos ao patrimônio e afastamento das famílias fazem parte da realidade de muitas instituições.

A formação prepara gestores, professores e equipes para incorporar práticas restaurativas ao cotidiano da escola, fortalecendo a convivência, qualificando a gestão dos conflitos e transformando problemas em oportunidades de aprendizagem coletiva.',
    'Ao final da formação, a escola ou rede de ensino estará mais preparada para:',
    null,
    'assets/images/formacoes/ambiente-escolar.jpg?v=2',
    'assets/images/formacoes/ambiente-escolar-card.jpg?v=2',
    'Roda de conversa com estudantes no pátio de uma escola pública ao fim da tarde',
    '[{"chave":"Compreender","frase":"Convivência e clima escolar","desc":"Reconhecer como as relações do dia a dia produzem convivência ou conflito, e o que diferencia a resposta restaurativa da disciplinar."},{"chave":"Intervir","frase":"Conflitos, bullying e danos","desc":"Conduzir processos restaurativos nas situações concretas da escola, entre estudantes e na relação com as famílias."},{"chave":"Transformar","frase":"Práticas no projeto da escola","desc":"Incorporar protocolos e estratégias permanentes ao projeto político-pedagógico e à rotina da instituição."}]'::jsonb,
    '[{"titulo":"Fundamentos e cultura de convivência","topicos":["Fundamentos da Justiça Restaurativa.","Cultura de convivência e clima escolar."]},{"titulo":"Práticas restaurativas na escola","topicos":["Práticas restaurativas aplicadas ao ambiente escolar.","Prevenção e enfrentamento do bullying."]},{"titulo":"Conflitos e relação com as famílias","topicos":["Gestão restaurativa de conflitos entre estudantes.","Relação escola-família."]},{"titulo":"Implementação e continuidade","topicos":["Desenvolvimento de protocolos institucionais.","Planejamento da implementação.","Avaliação de resultados e acompanhamento das ações implementadas.","Estudos de caso e atividades práticas."]}]'::jsonb,
    '["Compreender os fundamentos da Justiça Restaurativa e sua aplicação no contexto escolar.","Diferenciar práticas restaurativas de abordagens disciplinares tradicionais.","Identificar situações em que as práticas ajudam a prevenir ou responder a conflitos.","Conduzir processos restaurativos nas diferentes situações vividas pela escola.","Estruturar protocolos institucionais para uso de práticas restaurativas.","Integrar as práticas ao projeto político-pedagógico da instituição."]'::jsonb,
    '["Diretores e coordenadores pedagógicos","Professores e orientadores educacionais","Psicólogos escolares e assistentes sociais","Equipes técnicas","Secretarias de Educação"]'::jsonb,
    '["Desenvolver um programa institucional de práticas restaurativas.","Incorporar estratégias restaurativas ao cotidiano escolar.","Estruturar protocolos para prevenção e enfrentamento de conflitos.","Fortalecer a participação de estudantes, professores e famílias nas soluções.","Capacitar equipes para dar continuidade às práticas de forma autônoma."]'::jsonb,
    '[{"texto":"Práticas Restaurativas na Educação","href":"praticas-restaurativas.html#educacao"},{"texto":"Justiça Restaurativa e Práticas Restaurativas","href":"praticas-restaurativas.html#jr-praticas"},{"texto":"Práticas Restaurativas nas Relações de Trabalho","href":"formacao-relacoes-trabalho.html"},{"texto":"Como o IBPR atua","href":"como-atuamos.html"}]'::jsonb,
    'Formação do IBPR para gestores, professores e equipes escolares incorporarem práticas restaurativas ao cotidiano da escola e fortalecerem a cultura de convivência.',
    'Formação para preparar gestores, professores e equipes escolares para incorporar práticas restaurativas ao cotidiano da escola, fortalecendo a convivência, qualificando a gestão dos conflitos e transformando problemas em oportunidades de aprendizagem coletiva.',
    'Diretores escolares, coordenadores pedagógicos, professores, orientadores educacionais, psicólogos escolares, assistentes sociais, equipes técnicas e secretarias de educação',
    'publicado',
    3
  ),
  (
    'formacao-relacoes-trabalho',
    'Práticas Restaurativas nas Relações de Trabalho',
    null,
    'Relações de Trabalho',
    'Desenvolver capacidades para prevenir conflitos, enfrentar situações de desgaste nas relações e construir ambientes de trabalho mais seguros e saudáveis.',
    'Prepara lideranças e equipes para prevenir conflitos, conduzir conversas difíceis e reconstruir relações desgastadas no dia a dia da organização.',
    'Para lideranças, gestores e equipes de RH',
    'Relações de Trabalho',
    'fa-briefcase',
    'Ambientes de trabalho raramente se deterioram de uma vez. As relações se desgastam no dia a dia: na forma como lideranças respondem a erros, como divergências são tratadas e como as pessoas reagem quando se sentem desrespeitadas ou injustiçadas. Quando esses padrões se repetem, geram afastamento, desconfiança, silenciamento e conflitos recorrentes.

A formação traz princípios e práticas restaurativas para atuar sobre essas dinâmicas, combinando prevenção, manejo de conflitos, responsabilização e reconstrução das relações.',
    'Ao final da formação, a instituição estará mais preparada para:',
    null,
    'assets/images/formacoes/relacoes-trabalho.jpg?v=2',
    'assets/images/formacoes/relacoes-trabalho-card.jpg?v=2',
    'Salão preparado para uma formação corporativa, com mesas redondas e flip charts',
    '[{"chave":"Compreender","frase":"Relações e ambiente de trabalho","desc":"Reconhecer como interações cotidianas, liderança, comunicação e práticas organizacionais produzem proteção ou desgaste nas relações."},{"chave":"Intervir","frase":"Conflitos, tensões e danos","desc":"Abordar conversas difíceis e situações de dano de maneira estruturada, sem omissão e sem respostas que agravem o problema."},{"chave":"Transformar","frase":"Práticas restaurativas no cotidiano","desc":"Incorporar escuta, diálogo, responsabilização e construção de acordos às práticas da organização."}]'::jsonb,
    '[{"titulo":"Relações de trabalho e a origem dos conflitos","topicos":["Como interações cotidianas, liderança e comunicação protegem ou desgastam as relações.","Padrões que produzem afastamento, desconfiança, silenciamento e hostilidade.","Riscos psicossociais e sinais de deterioração das relações."]},{"titulo":"Fundamentos das práticas restaurativas no trabalho","topicos":["Princípios da Justiça Restaurativa aplicados ao contexto organizacional.","O que diferencia uma resposta restaurativa de outras formas de encaminhamento.","Quando a abordagem restaurativa é indicada e quando não é."]},{"titulo":"Conduzir conversas e processos","topicos":["Conversas difíceis com escuta, clareza e responsabilização.","Manejo estruturado de conflitos, tensões e situações de dano.","Construção de acordos, reparação e acompanhamento."]},{"titulo":"Sustentar a mudança na organização","topicos":["Prevenção da recorrência de padrões que desgastam as relações.","Integração das práticas às rotinas de gestão de pessoas.","Formação de uma equipe interna capaz de multiplicar as práticas."]}]'::jsonb,
    '["Identificar padrões de interação que favorecem conflitos, desgaste e riscos psicossociais.","Reconhecer sinais de deterioração das relações antes que se agravem.","Compreender conflitos a partir das pessoas, das relações e do contexto organizacional.","Conduzir conversas difíceis com escuta, clareza e responsabilização.","Usar práticas restaurativas para lidar com conflitos, danos e rupturas.","Construir respostas que unam responsabilização, reparação e prevenção de recorrências."]'::jsonb,
    '["Lideranças e gestores","Equipes de gestão de pessoas e RH","Comitês de ética e integridade","Áreas de saúde e segurança do trabalho","Equipes e times de projeto"]'::jsonb,
    '["Estabelecer fluxos para lidar com conflitos e situações de dano nas relações de trabalho.","Preparar lideranças para conduzir conversas difíceis de forma estruturada.","Desenvolver cuidados que reduzam a recorrência de padrões que desgastam as relações.","Integrar práticas restaurativas às rotinas de gestão de pessoas.","Formar uma equipe interna capaz de sustentar e ampliar essas práticas ao longo do tempo."]'::jsonb,
    '[{"texto":"Práticas Restaurativas nas Empresas","href":"praticas-restaurativas.html#empresas"},{"texto":"Justiça Restaurativa e Práticas Restaurativas","href":"praticas-restaurativas.html#jr-praticas"},{"texto":"Práticas Restaurativas na Educação","href":"praticas-restaurativas.html#educacao"},{"texto":"Como o IBPR atua","href":"como-atuamos.html"}]'::jsonb,
    'Formação do IBPR para prevenir conflitos, enfrentar o desgaste nas relações de trabalho e construir ambientes profissionais mais seguros e saudáveis com práticas restaurativas.',
    'Formação para prevenir conflitos, enfrentar situações de desgaste nas relações e construir ambientes de trabalho mais seguros e saudáveis, combinando prevenção, manejo de conflitos, responsabilização e reconstrução das relações com princípios e práticas restaurativas.',
    'Lideranças, gestores, equipes de gestão de pessoas e comitês de ética e integridade',
    'publicado',
    4
  )
on conflict (slug) do nothing;


-- Confira: deve devolver 4 linhas, todas 'publicado'.
select ordem, slug, status,
       jsonb_array_length(modulos)     as modulos,
       jsonb_array_length(desenvolver) as desenvolver,
       jsonb_array_length(para_quem)   as para_quem
from public.formacoes
order by ordem;
