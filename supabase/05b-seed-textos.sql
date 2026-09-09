-- =====================================================================
-- IBPR — Etapa 4: SEED dos 33 blocos de texto institucional
-- =====================================================================
-- Rode DEPOIS de `05-textos.sql`.
--
-- O conteúdo abaixo não foi redigitado: foi extraído automaticamente das
-- 7 páginas do site em 09/09/2026, pelo mesmo script que escreveu os
-- marcadores <!-- CMS:texto:chave --> nelas. É por isso que ligar o banco
-- não muda uma vírgula do site.
--
-- `valor` e `valor_original` entram iguais. O primeiro é o que o
-- Instituto edita; o segundo nunca muda, e é o que o botão "restaurar o
-- texto original" devolve.
--
-- Itálico se escreve com asterisco: `*assim*` vira <em>assim</em> no
-- site. É o único código aceito; todo o resto é escapado.
--
-- `on conflict (chave) do nothing`: rodar de novo NÃO sobrescreve o que o
-- Instituto já tiver editado pelo painel.
-- =====================================================================

insert into public.textos (
  chave, arquivo, pagina, secao, rotulo, ajuda, tipo, ordem, valor, valor_original
) values
  (
    'home-hero-sub', 'index.html',
    'Página inicial', 'Abertura', 'Frase de abertura do site', 'A frase logo abaixo do título grande da página inicial.',
    'texto', 1,
    'Problemas, conflitos e danos são inevitáveis em qualquer sociedade. A forma como respondemos a eles é uma escolha.',
    'Problemas, conflitos e danos são inevitáveis em qualquer sociedade. A forma como respondemos a eles é uma escolha.'
  ),
  (
    'home-proposito-titulo', 'index.html',
    'Página inicial', 'Nosso propósito', 'Título da seção', null,
    'texto', 2,
    'Pesquisa, formação e inovação, juntas.',
    'Pesquisa, formação e inovação, juntas.'
  ),
  (
    'home-proposito-sub', 'index.html',
    'Página inicial', 'Nosso propósito', 'Texto de apoio', null,
    'texto', 3,
    'No IBPR, esses três caminhos andam juntos: a pesquisa embasa a formação, e a formação abre espaço para novas soluções.',
    'No IBPR, esses três caminhos andam juntos: a pesquisa embasa a formação, e a formação abre espaço para novas soluções.'
  ),
  (
    'home-citacao', 'index.html',
    'Página inicial', 'Citação', 'A citação', 'Cabe em no máximo 2 linhas no computador. Se ficar maior, o design quebra.',
    'texto', 4,
    'Quando cuidamos das relações, transformamos histórias e construímos um futuro com mais humanidade.',
    'Quando cuidamos das relações, transformamos histórias e construímos um futuro com mais humanidade.'
  ),
  (
    'home-atuamos-titulo', 'index.html',
    'Página inicial', 'Como Atuamos (prévia)', 'Título da seção', null,
    'texto', 5,
    'O olhar restaurativo aplicado a situações concretas.',
    'O olhar restaurativo aplicado a situações concretas.'
  ),
  (
    'home-atuamos-sub', 'index.html',
    'Página inicial', 'Como Atuamos (prévia)', 'Texto de apoio', null,
    'texto', 6,
    'Partimos do que aconteceu e de como as pessoas são afetadas, para reduzir danos, reparar o possível e seguir em frente.',
    'Partimos do que aconteceu e de como as pessoas são afetadas, para reduzir danos, reparar o possível e seguir em frente.'
  ),
  (
    'instituto-hero-titulo', 'o-instituto.html',
    'O Instituto', 'Topo da página', 'Título', 'No máximo 2 linhas no computador.',
    'texto', 7,
    'Pesquisa, formação e inovação em Justiça Restaurativa.',
    'Pesquisa, formação e inovação em Justiça Restaurativa.'
  ),
  (
    'instituto-hero-sub', 'o-instituto.html',
    'O Instituto', 'Topo da página', 'Texto de apoio', null,
    'texto', 8,
    'Conflitos e danos fazem parte da vida. A forma como respondemos a eles pode fortalecer pessoas e instituições.',
    'Conflitos e danos fazem parte da vida. A forma como respondemos a eles pode fortalecer pessoas e instituições.'
  ),
  (
    'instituto-missao-titulo', 'o-instituto.html',
    'O Instituto', 'Missão', 'Missão, em uma frase', null,
    'texto', 9,
    'Contribuir para respostas mais qualificadas.',
    'Contribuir para respostas mais qualificadas.'
  ),
  (
    'instituto-missao-texto', 'o-instituto.html',
    'O Instituto', 'Missão', 'Missão, explicada', null,
    'texto', 10,
    'Contribuir para que pessoas e instituições construam respostas mais qualificadas aos problemas, conflitos e danos da sociedade.',
    'Contribuir para que pessoas e instituições construam respostas mais qualificadas aos problemas, conflitos e danos da sociedade.'
  ),
  (
    'instituto-visao-titulo', 'o-instituto.html',
    'O Instituto', 'Visão', 'Visão, em uma frase', null,
    'texto', 11,
    'Ser referência nacional em Práticas Restaurativas.',
    'Ser referência nacional em Práticas Restaurativas.'
  ),
  (
    'instituto-visao-texto', 'o-instituto.html',
    'O Instituto', 'Visão', 'Visão, explicada', null,
    'texto', 12,
    'Ser referência nacional na produção de conhecimento, na formação de profissionais e no desenvolvimento de soluções restaurativas.',
    'Ser referência nacional na produção de conhecimento, na formação de profissionais e no desenvolvimento de soluções restaurativas.'
  ),
  (
    'instituto-principio-1', 'o-instituto.html',
    'O Instituto', 'Princípios', 'Princípio 01', 'O nome curto do princípio fica no código; aqui é a explicação dele.',
    'texto', 13,
    'Reconhecer que toda experiência pode gerar conhecimento, aperfeiçoar práticas e fortalecer pessoas, equipes e organizações em um processo contínuo de evolução.',
    'Reconhecer que toda experiência pode gerar conhecimento, aperfeiçoar práticas e fortalecer pessoas, equipes e organizações em um processo contínuo de evolução.'
  ),
  (
    'instituto-principio-2', 'o-instituto.html',
    'O Instituto', 'Princípios', 'Princípio 02', 'O nome curto do princípio fica no código; aqui é a explicação dele.',
    'texto', 14,
    'Desenvolver soluções fundamentadas na pesquisa científica, integrando conhecimento, experiência prática e avaliação contínua para enfrentar problemas complexos.',
    'Desenvolver soluções fundamentadas na pesquisa científica, integrando conhecimento, experiência prática e avaliação contínua para enfrentar problemas complexos.'
  ),
  (
    'instituto-principio-3', 'o-instituto.html',
    'O Instituto', 'Princípios', 'Princípio 03', 'O nome curto do princípio fica no código; aqui é a explicação dele.',
    'texto', 15,
    'A transformação não vem só do método. São as relações humanas que constroem novas formas de responder aos problemas, conflitos e danos.',
    'A transformação não vem só do método. São as relações humanas que constroem novas formas de responder aos problemas, conflitos e danos.'
  ),
  (
    'instituto-principio-4', 'o-instituto.html',
    'O Instituto', 'Princípios', 'Princípio 04', 'O nome curto do princípio fica no código; aqui é a explicação dele.',
    'texto', 16,
    'Trabalhamos para que pessoas e instituições desenvolvam formas cada vez mais qualificadas de responder aos problemas, conflitos e danos da sociedade.',
    'Trabalhamos para que pessoas e instituições desenvolvam formas cada vez mais qualificadas de responder aos problemas, conflitos e danos da sociedade.'
  ),
  (
    'instituto-abordagem-titulo', 'o-instituto.html',
    'O Instituto', 'Nossa abordagem', 'Título da seção', null,
    'texto', 17,
    'Da produção do conhecimento à transformação institucional.',
    'Da produção do conhecimento à transformação institucional.'
  ),
  (
    'instituto-abordagem-texto', 'o-instituto.html',
    'O Instituto', 'Nossa abordagem', 'Os parágrafos', 'Deixe uma linha em branco entre um parágrafo e outro.',
    'prosa', 18,
    'O IBPR atua a partir da integração entre pesquisa, formação e inovação. Acreditamos que respostas mais qualificadas aos problemas, conflitos e danos não surgem de ações isoladas, mas da combinação entre conhecimento científico, desenvolvimento de capacidades e implementação de soluções adaptadas à realidade de cada organização.

Essa forma de atuação permite aproximar a produção acadêmica dos desafios concretos enfrentados por escolas, empresas, órgãos públicos e instituições de justiça e segurança pública.',
    'O IBPR atua a partir da integração entre pesquisa, formação e inovação. Acreditamos que respostas mais qualificadas aos problemas, conflitos e danos não surgem de ações isoladas, mas da combinação entre conhecimento científico, desenvolvimento de capacidades e implementação de soluções adaptadas à realidade de cada organização.

Essa forma de atuação permite aproximar a produção acadêmica dos desafios concretos enfrentados por escolas, empresas, órgãos públicos e instituições de justiça e segurança pública.'
  ),
  (
    'atuamos-hero-titulo', 'como-atuamos.html',
    'Como Atuamos', 'Topo da página', 'Título', 'No máximo 2 linhas no computador.',
    'texto', 19,
    'O olhar restaurativo aplicado a situações concretas.',
    'O olhar restaurativo aplicado a situações concretas.'
  ),
  (
    'atuamos-hero-sub', 'como-atuamos.html',
    'Como Atuamos', 'Topo da página', 'Texto de apoio', null,
    'texto', 20,
    'Partimos do que aconteceu, de como as pessoas são afetadas e do que precisa mudar para reduzir danos, reparar o possível e seguir em frente.',
    'Partimos do que aconteceu, de como as pessoas são afetadas e do que precisa mudar para reduzir danos, reparar o possível e seguir em frente.'
  ),
  (
    'atuamos-bloco-relacoes', 'como-atuamos.html',
    'Como Atuamos', 'Fortalecendo relações', 'Frase do bloco', 'A frase sobre a foto. O título do bloco fica no código, porque a página inicial repete ele.',
    'texto', 21,
    'Construir vínculos mais saudáveis entre pessoas, famílias e comunidades.',
    'Construir vínculos mais saudáveis entre pessoas, famílias e comunidades.'
  ),
  (
    'atuamos-bloco-respostas', 'como-atuamos.html',
    'Como Atuamos', 'Compreendendo necessidades', 'Frase do bloco', 'A frase sobre a foto. O título do bloco fica no código, porque a página inicial repete ele.',
    'texto', 22,
    'Olhamos para as situações pelo modo como afetam as pessoas, revelando danos, perspectivas e necessidades.',
    'Olhamos para as situações pelo modo como afetam as pessoas, revelando danos, perspectivas e necessidades.'
  ),
  (
    'atuamos-bloco-instituicoes', 'como-atuamos.html',
    'Como Atuamos', 'Mobilizando para a ação', 'Frase do bloco', 'A frase sobre a foto. O título do bloco fica no código, porque a página inicial repete ele.',
    'texto', 23,
    'Quem pode contribuir para atender às necessidades geradas pelos danos e o que precisa mudar nas relações?',
    'Quem pode contribuir para atender às necessidades geradas pelos danos e o que precisa mudar nas relações?'
  ),
  (
    'atuamos-bloco-incorporar', 'como-atuamos.html',
    'Como Atuamos', 'Incorporando novas práticas', 'Frase do bloco', 'A frase sobre a foto. O título do bloco fica no código, porque a página inicial repete ele.',
    'texto', 24,
    'Mudanças duradouras dependem de incorporar ao cotidiano o que foi construído ao longo do processo.',
    'Mudanças duradouras dependem de incorporar ao cotidiano o que foi construído ao longo do processo.'
  ),
  (
    'praticas-hero-titulo', 'praticas-restaurativas.html',
    'Práticas Restaurativas', 'Topo da página', 'Título', 'No máximo 2 linhas no computador.',
    'texto', 25,
    'Uma nova forma de responder aos problemas, conflitos e danos.',
    'Uma nova forma de responder aos problemas, conflitos e danos.'
  ),
  (
    'praticas-hero-sub', 'praticas-restaurativas.html',
    'Práticas Restaurativas', 'Topo da página', 'Texto de apoio', null,
    'texto', 26,
    'Sem ignorar a responsabilidade, a abordagem restaurativa desloca o foco para os danos e as necessidades que deles decorrem.',
    'Sem ignorar a responsabilidade, a abordagem restaurativa desloca o foco para os danos e as necessidades que deles decorrem.'
  ),
  (
    'praticas-citacao', 'praticas-restaurativas.html',
    'Práticas Restaurativas', 'Citação', 'A citação', 'O crédito embaixo (Moore e Vernon) fica no código.',
    'texto', 27,
    '"Gastamos mais tempo explicando a Justiça Restaurativa do que desenvolvendo o saber-fazer para praticá-la."',
    '"Gastamos mais tempo explicando a Justiça Restaurativa do que desenvolvendo o saber-fazer para praticá-la."'
  ),
  (
    'formacoes-hero-titulo', 'formacoes.html',
    'Formações', 'Topo da página', 'Título', 'No máximo 2 linhas no computador.',
    'texto', 28,
    'Conhecimento que transforma a prática.',
    'Conhecimento que transforma a prática.'
  ),
  (
    'formacoes-hero-sub', 'formacoes.html',
    'Formações', 'Topo da página', 'Texto de apoio', null,
    'texto', 29,
    'Uma boa formação não se mede em horas-aula, mas na capacidade de preparar profissionais para desafios reais.',
    'Uma boa formação não se mede em horas-aula, mas na capacidade de preparar profissionais para desafios reais.'
  ),
  (
    'movimento-hero-titulo', 'ibpr-em-movimento.html',
    'IBPR em Movimento', 'Topo da página', 'Título', 'No máximo 2 linhas no computador.',
    'texto', 30,
    'A atuação do IBPR e da sua rede, dentro e fora do Instituto.',
    'A atuação do IBPR e da sua rede, dentro e fora do Instituto.'
  ),
  (
    'movimento-hero-sub', 'ibpr-em-movimento.html',
    'IBPR em Movimento', 'Topo da página', 'Texto de apoio', null,
    'texto', 31,
    'Um espaço para acompanhar o que o IBPR e os profissionais da sua rede realizam.',
    'Um espaço para acompanhar o que o IBPR e os profissionais da sua rede realizam.'
  ),
  (
    'aluno-hero-titulo', 'area-do-aluno.html',
    'Área do Aluno', 'Topo da página', 'Título', 'No máximo 2 linhas no computador.',
    'texto', 32,
    'Continue sua formação de onde parou.',
    'Continue sua formação de onde parou.'
  ),
  (
    'aluno-hero-sub', 'area-do-aluno.html',
    'Área do Aluno', 'Topo da página', 'Texto de apoio', null,
    'texto', 33,
    'As formações do IBPR ficam no ambiente virtual de aprendizagem. O acesso é liberado para quem já está matriculado.',
    'As formações do IBPR ficam no ambiente virtual de aprendizagem. O acesso é liberado para quem já está matriculado.'
  )
on conflict (chave) do nothing;


-- Confira: deve devolver 33 linhas, e a coluna `igual_ao_original`
-- toda em `true` (ninguém editou nada ainda).
select ordem, pagina, secao, rotulo, tipo,
       (valor = valor_original) as igual_ao_original,
       length(valor) as tamanho
from public.textos
order by ordem;
