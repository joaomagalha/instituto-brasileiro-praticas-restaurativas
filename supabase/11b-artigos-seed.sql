-- =====================================================================
-- IBPR — Etapa 5b: SEED dos 3 primeiros artigos (17/09/2026)
-- =====================================================================
-- Rode DEPOIS de `11-artigos.sql`. Gerado por build/dev/seed-artigos-2026-09-17.py.
--
-- Os 3 artigos que o Dr. Decildo mandou no grupo em 16/09/2026:
--   1. O Acendedor de Lampiões e o Legislador Penal (Word, inédito, texto completo)
--   2. Caminhos práticos para aplicação da Justiça Restaurativa (Word, inédito, texto completo)
--   3. Justiça Restaurativa como instrumento... espaço prisional (ReJuB 2021,
--      publicado em revista: entra com resumo + DOI + PDF, sem texto completo)
--
-- Mudanças editoriais feitas na conversão, pra conferir com o autor:
--   - Acendedor: o diálogo do Pequeno Príncipe virou citação em bloco e a
--     1ª seção (sem número no Word) ganhou o "1." pra acompanhar as 2. e 3.
--   - Caminhos: o título estava em caixa alta no Word; virou caixa normal.
--     O Word não tem resumo nem palavras-chave: o resumo do card é o
--     1º parágrafo do texto (metáfora do hospital). Pedir os dois ao autor.
--
-- `on conflict (slug) do nothing`: rodar de novo NÃO sobrescreve o que o
-- Instituto já tiver editado pelo painel.
-- =====================================================================

insert into public.artigos (
  titulo, subtitulo, slug, autores, resumo, palavras_chave, corpo,
  pdf_url, doi, publicacao_nome, publicacao_url, status, publicado_em
) values
  ('O Acendedor de Lampiões e o Legislador Penal', 'Uma Análise Crítica da Justiça Restaurativa no PL nº 3.890/2024 (Estatuto da Vítima)', 'acendedor-de-lampioes-e-o-legislador-penal', '[{"nome": "Decildo Ferreira Lopes", "credenciais": ["Mestre em Direito e Políticas Públicas pela Universidade Federal de Goiás (2019).", "Doutorando em Direito pelo Instituto Brasileiro de Ensino, Desenvolvimento e Pesquisa, IDP (2023-2026).", "Visiting Researcher na Australian National University (PDSE/CAPES 2025-2026).", "Juiz de Direito do Tribunal de Justiça do Estado de Goiás."]}, {"nome": "Maxuel Pereira Dias", "credenciais": ["Defensor Público do Estado de Mato Grosso.", "Especialista em Criminologia e Direito da Execução Penal.", "Coautor do livro Justiça Restaurativa na Execução Penal: um manual para aplicação da JR em unidades prisionais (Paulus, 2023)."]}]'::jsonb, 'Este artigo analisa criticamente a forma como o Projeto de Lei do Estatuto da Vítima (PL nº 3.890/2024) incorpora a Justiça Restaurativa, identificando reduções conceituais, inconsistências normativas e riscos de distorção institucional. A partir da metáfora do acendedor de lampiões, evidencia-se como o legislador penal, mesmo ao tentar inovar, mantém estruturas rígidas que não dialogam com os marcos nacionais e internacionais da JR. Argumenta-se que o PL, ao se deixar influenciar pela lógica retributiva, reduz a amplitude da abordagem restaurativa, limitando seu potencial transformador e sua capacidade de responder às necessidades das vítimas não atendidas pelo modelo tradicional.', '["Justiça Restaurativa", "Projeto de Lei 3.890/2024", "Estatuto da Vítima", "Política Criminal", "Descompasso Legislativo"]'::jsonb, 'De todos os personagens da célebre obra “O Pequeno Príncipe” de Antoine de Saint-Exupéry, há um que geralmente passa desapercebido, mas que provoca uma reflexão muito atual, a considerar nosso padrão de inovação (ou omissão) legislativa. Trata-se do acendedor de lampiões, único habitante do quinto planeta (o menor de todos os visitados pelo príncipe). O acendedor tinha por missão acender e apagar o lampião uma vez a cada minuto, o que lhe parecia uma tarefa terrível. Ao ser perguntado do porquê, respondeu que era “*o regulamento*”. E completou:

> - Antigamente era razoável. Apagava de manhã e acendia à noite. Tinha o resto do dia para descansar e o resto da noite para dormir...
> - E depois disso, mudou o regulamento?
> - O regulamento não mudou, disse o acendedor. Aí é que está o drama! O planeta de ano em ano gira mais depressa, e o regulamento não muda!
> - E então? disse o principezinho
> - Agora, que ele dá uma volta por minuto, não tenho mais um segundo de repouso. Acendo e apago uma vez por minuto!

Essa passagem da clássica obra ilustra, ainda que com as inevitáveis limitações das metáforas, o modo como o movimento legislativo brasileiro vem lidando com o tratamento da vítima na política criminal. No presente estudo, referimo-nos especificamente ao PL nº 3.890/2024 — que pretende instituir o Estatuto da Vítima — no tocante aos dispositivos relacionados à Justiça Restaurativa (JR).

Não se trata de um cenário de completa desconexão com a realidade contemporânea — afinal, a própria inclusão explícita da JR no Projeto de Estatuto revela sensibilidade para novas abordagens. A proposta representa também um passo significativo e bem-vindo no sentido de superar a invisibilidade histórica das vítimas.

Desde a promulgação da CF/88, o art. 245 permanece invisível no debate público e legislativo, apesar de seu potencial estruturante para uma política nacional de atenção às vítimas. De fato, passadas quase quatro décadas, a proteção por ele prevista ainda não se concretizou. Por isso, a iniciativa merece elogios, pois, pela primeira vez e de forma tão explícita, coloca a vítima no epicentro das discussões sobre política criminal. Esse deslocamento é relevante para reorientar o foco do sistema de justiça, que tradicionalmente concentra sua atenção na violação da norma e na figura do ofensor.

Entretanto, no tocante especificamente à inclusão da JR, a proposta revela equívocos e imprecisões significativas. A forma como essa intenção convive com expectativas herdadas do modelo penal tradicional faz com que, em vez de permitir que a nova política se estruture a partir de seus próprios fundamentos, ela seja reinterpretada pelas lentes antigas.

Mantido tal como está, o PL tende a repetir o movimento do acendedor de lampiões: reconhecer que o mundo mudou, mas insistir nos mesmos gestos normativos de sempre. O legislador corre o risco de permanecer preso ao “regulamento” — isto é, à lógica estritamente retributiva —, comprometendo o potencial transformador da JR.

Este artigo, portanto, busca ampliar o debate e indicar caminhos para que o Estatuto da Vítima represente um avanço efetivo, em consonância com os marcos normativos nacionais e internacionais aplicáveis ao tema.

## 2. Afinal, do que as vítimas necessitam?

A discussão a respeito das necessidades das vítimas no processo penal brasileiro tem, historicamente, sido reduzida a um ponto: o combate à impunidade do ofensor. Apregoa-se que, com a punição do agressor, o Estado – e a sociedade como um todo – estaria cumprindo seu papel de proteção à vítima.

Não se olvida que a punição do ofensor é um interesse da vítima. Afinal, é perfeitamente compreensível que a vítima espere uma censura social ao dano que sofreu. Entretanto, não se trata da única necessidade.

Há casos, inclusive, que a própria punição do agressor não é do interesse da vítima ou vai de encontro aos seus interesses. Não são raros os casos em que a vítima, por diversas razões, deseja que a ação penal não seja deflagrada ou que seja descontinuada, mas vê sua pretensão esbarrar em dogmas como a indisponibilidade da ação penal e do bem jurídico tutelado.

A realidade, todavia, nos mostra que mesmo a dimensão mais tradicionalmente reconhecida como forma de atender às necessidades da vítima — a reparação do dano — tem sido relegada a segundo plano e enfrenta uma patente crise. A execução civil *ex delicto* é de ajuizamento raro e seu potencial de constrição patrimonial é reduzidíssimo, o que demonstra a limitação estrutural do processo penal em responder não apenas a essa, mas também às demais necessidades que as vítimas apresentam.

Outra necessidade negligenciada é o direito de a vítima “dizer a sua verdade”, para usar a expressão de Howard Zehr. O modelo adversarial inerente ao processo tradicional incentiva os agentes processuais a focarem somente nos aspectos que conduzam, respectivamente, à procedência ou à improcedência da pretensão punitiva. A participação da vítima, portanto, tem se limitado aos aspectos que interessam à dinâmica adversarial, isto é, ao que pode contribuir para a procedência ou a improcedência da pretensão punitiva.

A título de exemplo, quando se pergunta à vítima sobre os danos e os traumas que sofreu, não há interesse genuíno em compreender como o crime impactou sua vida ou quais necessidades passaram a emergir a partir do fato. O objetivo, em geral, é outro: no caso da acusação, confirmar a subsunção de eventuais qualificadoras ou causas de aumento ou, ainda, reforçar a gravidade do crime para justificar uma resposta penal mais severa. No caso da defesa, quando se indaga, por exemplo, sobre eventual restituição da coisa furtada ou algum tipo de reparação, a finalidade costuma ser pleitear a redução da pena ou algum outro benefício ao acusado. Enfim, mesmo quando se pergunta sobre a vítima, o foco permanece o mesmo: a violação da norma e o ofensor.

Nesse contexto, dizer a sua verdade consiste em permitir que a vítima possa abordar outros temas que, para ela, são importantes: os sentimentos a respeito do crime e do ofensor; a significação pessoal que atribuiu ao fato; as formas pelas quais entende que o dano poderia ser reparado (em oposição a um formalismo regulatório que presume saber de antemão o que as vítimas precisam); o direito de influir diretamente na solução do caso; a proteção contra a revitimização; o acolhimento comunitário; e a proteção contra a exclusão social.

Mas o ponto central, aqui, é que tais necessidades — e outras que sequer reconhecemos plenamente — só podem ser diagnosticadas se o sistema de justiça estiver disposto a rever a forma como percebe e integra a vítima em seus procedimentos. Enquanto sua participação continuar limitada pela lógica adversarial, qualquer compreensão mais ampla de seus interesses permanecerá inacessível. É justamente nesse espaço de escuta qualificada e reconstrução de sentidos que a JR pode oferecer uma contribuição relevante.

## 3. Análise Crítica dos Dispositivos Relativos à Justiça Restaurativa

### 3.1 Artigos 3, IV e 44

A Justiça Restaurativa aparece já no art. 3º, IV do PL, que a define como um *“conjunto ordenado e sistêmico de princípios, de métodos, de técnicas e de atividades próprias, aplicável preventivamente ou após a infração penal, com o objetivo de restaurar e encorajar o infrator a responsabilizar-se pelos danos causados”*.

À primeira vista, a redação aproxima-se do enunciado da Resolução 225/16 do CNJ. No entanto, essa semelhança é apenas superficial. Embora o PL empregue a terminologia do campo restaurativo, não incorpora os elementos estruturantes que conferem sentido e coerência à JR, produzindo uma definição que já surge conceitualmente estreita.

A Resolução 225/CNJ — principal marco normativo nacional — define a Justiça Restaurativa como processo orientado para *“a satisfação das necessidades de todos os envolvidos e a responsabilização ativa daquelas que contribuíram direta ou indiretamente para o fato danoso”*, deixando claro que o foco está nas relações e nas pessoas afetadas, e não apenas no ofensor.

Essa compreensão está em perfeita harmonia com marcos internacionais amplamente reconhecidos. A Declaração de Veneza sobre Justiça Restaurativa[1], por exemplo, a descreve como *“processo que permite que as pessoas afetadas pelo crime e aquelas responsáveis por ele participem, mediante consentimento livre, da resolução das questões decorrentes da infração, com apoio de facilitador imparcial”*. Da mesma forma, a Resolução ECOSOC n. 12/2002[2] definem as práticas restaurativas como *“processos nos quais vítimas, ofensores e, quando apropriado, outras pessoas afetadas pelo crime participam ativamente, devendo atender às necessidades de todas as partes impactadas”*.

Comparada a esses documentos, a definição do PL confere centralidade indevida ao infrator. Ao estabelecer que a finalidade da JR é “restaurar e encorajar o infrator a responsabilizar-se pelos danos causados”, o texto desloca o foco para o ofensor e trata a restauração como operação dirigida a ele, reproduzindo a velha narrativa segundo a qual a causa do crime reside na pessoa do infrator e cabe ao sistema penal corrigi-lo. Em vez de compreender a JR como processo de construção compartilhada de reparação do dano e de responsabilização ativa, o PL lhe atribui um sentido reduzido, compatível apenas com a lógica penal tradicional, na qual responsabilizar equivale, em última análise, a submeter o ofensor a mecanismos estatais de controle e punição.

O resultado é uma definição que aparenta modernidade, mas que permanece presa à mesma lógica cuja ineficiência motivou, em escala global, o surgimento e a expansão dos movimentos de Justiça Restaurativa.

Essa restrição conceitual, porém, não se limita ao art. 3º.

O art. 44 confirma, com ainda mais clareza, o problema conceitual já identificado acima. Embora a Seção II anuncie tratar do direito a garantias no contexto das práticas restaurativas, sua redação parece partir de uma premissa sem qualquer respaldo na literatura nacional ou internacional: a ideia de que a vítima precisaria ser protegida no âmbito de um processo restaurativo.

Tal preocupação só faria sentido se a JR reproduzisse dinâmicas de revitimização típicas do processo penal tradicional, como silenciamento, secundarização e uso instrumental da vítima como meio de prova. Todavia, ao contrário do que sugere o art. 44, a JR não constitui ambiente de ameaça à vítima, mas o espaço no qual ela recupera protagonismo e voz. Sua própria estrutura metodológica — fundada em participação informada, voluntariedade, preparação prévia, facilitação qualificada e cuidado relacional — impede, por desenho institucional, a revitimização. Os riscos que parecem ter motivado o texto do PL pertencem ao universo do processo penal tradicional, não ao da JR.

O inciso I determina que as práticas restaurativas sejam utilizadas somente no interesse da vítima. Tal formulação não encontra respaldo nas referências qualificadas do campo: o interesse restaurativo é plural, não exclusivo; relacional, não individualizado. Reduzi-lo à perspectiva da vítima desfigura a natureza dialógica e comunitária do modelo. Os incisos II e III — dever de informação adequada e dever de confidencialidade — tampouco agregam, pois já integram os pressupostos estruturais das práticas restaurativas. Assim, o art. 44 não amplia a proteção da vítima nem aprimora o ambiente restaurativo. Ao contrário, revela compreensão equivocada do próprio instituto.

Portanto, os arts. 3º, IV e 44 carregam o mesmo problema estrutural: em vez de incorporar a Justiça Restaurativa a partir de seus fundamentos próprios, o PL a redescreve segundo categorias do modelo penal tradicional. A correção conceitual mais adequada seria alinhar o texto aos princípios já consolidados na Resolução CNJ n. 225/2016, que disciplina voluntariedade, participação informada e confidencialidade em consonância com as referências internacionais. A adoção explícita desses parâmetros evitaria reduções conceituais, eliminaria conflitos internos do PL e asseguraria coerência normativa na implementação da JR no país.

### 3.2 Artigo 47

O capítulo dedicado à JR inicia-se no art. 47 e mantém a redução conceitual já observada nos dispositivos anteriores ao apresentar a prática como estratégia preventiva à vitimização. Tal enquadramento é inadequado: a prevenção de novos danos não é finalidade da JR, mas pressuposto metodológico de qualquer prática restaurativa, destinado a assegurar que o processo não produza revitimização. A não revitimização — assim como a voluntariedade, o respeito e a inclusão — atua como princípio orientador, não como objetivo final.

O problema é aprofundado pelo parágrafo único. Os incisos I, II e III estabelecem como objetivos das práticas restaurativas: (i) a reparação dos danos sofridos pela vítima, (ii) a restauração da vítima e (iii) a reafirmação dos valores sociais da norma violada.

Mais uma vez, o PL reduz o escopo da JR à vítima direta. O inciso I restringe o objetivo à reparação dos danos por ela sofridos, em desacordo com a própria lógica do instituto, que parte de um dano vivido em rede de relações e exige que os meios de reparação e responsabilização sejam construídos a partir das necessidades de todos os afetados, e não apenas da vítima imediata.

A expressão “restauração da vítima”, presente no inciso II, é particularmente problemática. A JR não pretende restaurar a vítima a um estado anterior ao crime — pretensão impossível e conceitualmente equivocada. Os processos restaurativos oferecem reconhecimento, validação, responsabilização e reconstrução de sentidos, mas não operam como mecanismos terapêuticos de “restauração” subjetiva. Não que tal efeito não possa eventualmente ocorrer, mas não se trata da finalidade da JR. O inciso, portanto, introduz um vocabulário impreciso e desnecessário.

O problema do inciso III está no próprio objetivo que ele propõe: a reafirmação dos valores sociais da norma violada. Trata-se de finalidade típica da sanção penal, alheia à lógica da JR. Para o modelo restaurativo, o crime não é concebido como violação abstrata de norma, mas como ruptura que atinge pessoas, relações e contextos comunitários — ponto elementar que o dispositivo simplesmente desconsidera. O que a JR busca, exista ou não processo judicial, é criar condições para que os envolvidos construam, de forma compartilhada, meios significativos de abordar o dano, restaurando-o ou mitigando suas consequências por meio da responsabilização ativa de quem contribuiu para sua ocorrência.

Mais uma vez, evidencia-se a descaracterização de aspectos centrais da JR, produzindo um texto que não dialoga com os marcos normativos existentes nem com a literatura especializada.

### 3.3 Artigo 48

Mesmo não se tratando de um projeto destinado a regular a política nacional de Justiça Restaurativa, o PL avança sobre temas centrais do modelo restaurativo — e, pior que isso, o faz de modo conceitualmente equivocado.

O art. 48 enumera como princípios orientadores da JR: autorresponsabilidade, reparação dos danos, atendimento das necessidades da vítima e de seus familiares, voluntariedade, participação informada, sigilo e confidencialidade. É evidente que o rol apresentado não reflete os princípios restaurativos tal como consolidados no campo, mas uma adaptação seletiva desses elementos para ajustá-los ao recorte adotado pelo projeto — uma concepção de Justiça Restaurativa centrada exclusivamente na vítima.

Comparado ao art. 2º da Resolução 225/CNJ, o contraste é imediato: enquanto a Resolução descreve um conjunto amplo e coerente de princípios que expressam a natureza multifocal e corresponsável da JR, o PL apresenta um rol restrito, voltado apenas à vítima e seus familiares.

A tentativa de definir princípios, feita em um projeto que não foi concebido para tratar da JR, amplia o problema. Como o tema não integrou o objeto central do PL, é plausível que não tenha havido debate técnico aprofundado nem participação de especialistas — o que torna ainda mais temerária a fixação de enunciados que, na ausência de lei nacional sobre a matéria, podem acabar orientando práticas institucionais futuras. O risco é cristalizar uma compreensão reduzida do instituto justamente quando se exige maior aderência aos referenciais consolidados. Por isso, seria mais adequado — e normativamente mais coerente — reproduzir os princípios da Resolução 225/2016-CNJ, cujo enunciado expressa com precisão a lógica multifocal e corresponsável da JR.

### 3.4 Artigo 48, § 1º

O § 1º do mesmo artigo estabelece que a vítima pode revogar o consentimento a qualquer tempo. Embora a ênfase na voluntariedade seja correta, a redação cria restrição incompatível com o modelo restaurativo ao pressupor que apenas a vítima teria a faculdade de desistir.

A Resolução 225/2016-CNJ é explícita: É condição fundamental para que ocorra a prática restaurativa o prévio consentimento, livre e espontâneo, de todos os seus participantes, assegurada a retratação a qualquer tempo (art. 3º, § 2º[3]). No mesmo sentido, dispõe a Resolução 2002/12 do ECOSOC/ONU: A vítima e o ofensor devem ter o direito de se retirar do processo restaurativo a qualquer momento[4].

Reproduzindo o padrão já criticado acima, o PL reduz o alcance da voluntariedade ao restringi-la à vítima e excluir a possibilidade de retratação pelos demais participantes, em desacordo com a Resolução 225/2016-CNJ.

### 3.5 Artigo 48, § 2º

O § 2º reafirma a voluntariedade e veda qualquer forma de coação ou a emissão de qualquer espécie de intimação judicial ou extrajudicial para as sessões. A intenção — ao que parece, evitar que a JR adquira conotação compulsória — é legítima, mas a solução é inadequada.

Primeiro, o dispositivo é redundante: a voluntariedade já consta do caput e do § 1º, bem como da Resolução 225/2016, de modo que repeti-la não amplia garantias.

Segundo, a proibição absoluta de intimações ignora a realidade institucional. No sistema de justiça brasileiro, a intimação é instrumento ordinário de comunicação, não de coerção. Impedir seu uso, mesmo para atos não obrigatórios, rompe fluxos de trabalho, cria dificuldades operacionais e pode tornar a implantação da JR mais confusa

A preocupação central — evitar que participantes interpretem a comunicação como obrigatória — não se resolve proibindo intimações, mas garantindo, por exemplo: linguagem clara e acessível; informação explícita de que a participação é voluntária; materiais explicativos adequados (visual law, vídeos, textos simples); verificação da voluntariedade pelos facilitadores.

Mais adequado seria permitir o uso dos meios ordinários de comunicação, desde que acompanhados de salvaguardas metodológicas e controle rigoroso dos principios restaurativos previstos na Resolução 225/16-CNJ.

### 3.6 Artigo 49, § 3º

O § 3º do art. 49 contém uma falha pontual: prevê a homologação do acordo restaurativo após a oitiva do Ministério Público, mas omite a participação da defesa. Trata-se de lacuna que exige correção, pois qualquer resultado restaurativo com efeitos processuais pressupõe contraditório e ampla defesa. Sua exclusão viola princípios constitucionais e compromete a legalidade de eventual homologação.

### 3.7 Artigo 50

O art. 50 apresenta talvez os mais graves problemas conceituais do capítulo dedicado à Justiça Restaurativa, por desconsiderar tanto a lógica do processo penal quanto a própria natureza da JR.

O *caput* estabelece que a prática restaurativa realizada antes ou paralelamente ao processo judicial “não suspenderá a persecução penal”. A formulação parte de premissa incompatível com o modelo restaurativo: se vítima, ofensor e demais afetados manifestam interesse em construir uma resposta dialógica, significativa e reparadora ao dano, não há justificativa para que o processo penal siga automaticamente seu curso, duplicando esforços institucionais e submetendo as partes a dois procedimentos simultâneos que se orientam por racionalidades distintas.

A suspensão é plenamente compatível com o sistema jurídico brasileiro e se harmoniza com o princípio constitucional da duração razoável do processo, desde que acompanhada de prazo definido, sujeito a controle judicial e prorrogável diante da continuidade legítima das tratativas restaurativas.

Ainda mais problemática é a disposição do parágrafo único, segundo a qual “*na esfera penal, os efeitos da prática restaurativa somente poderão ser produzidos até o trânsito em julgado da sentença*”. Trata-se de limitação frontalmente incompatível com todos os marcos normativos da JR.

A Resolução CNJ n. 225/2016 admite expressamente sua utilização em qualquer fase, incluindo a execução penal; os Princípios Básicos das Nações Unidas (1985 e 2005) não estabelecem qualquer restrição temporal; e a prática nacional e internacional demonstra que, mesmo após a condenação, há amplo espaço para construção de resultados restaurativos, responsabilização ativa, reparação de danos e reconstrução de vínculos comunitários.

A exclusão da fase executória, além de carecer de fundamento teórico ou empírico, inviabiliza práticas restaurativas reconhecidamente eficazes para modulação de posturas, reconstrução de sentidos e redução de reincidência.

## Considerações finais

O Estatuto da Vítima surge em momento oportuno: a centralidade das vítimas na política criminal brasileira é um déficit histórico que o projeto, de modo geral, enfrenta com seriedade. Contudo, no que se refere à Justiça Restaurativa, o texto aprovado pela Câmara revela limitações importantes, ora por reduzi-la a uma ferramenta voltada exclusivamente à vítima, ora por reinterpretá-la segundo categorias próprias do modelo penal tradicional.

As sugestões apresentadas ao longo deste artigo buscam corrigir essas distorções, mas entendemos que o ideal seria que o Senado ampliasse o debate, a fim de incorporar uma compreensão alinhada às definições, princípios e procedimentos já estabelecidos na Resolução 225/2016 e nos documentos internacionais de referência. Só assim o Estatuto poderá cumprir sua promessa de fortalecer a atenção às vítimas sem comprometer — ainda que inadvertidamente — a integridade conceitual da Justiça Restaurativa.

## Notas

1. Refere-se à Venice Declaration on the Role of Restorative Justice in Criminal Matters, adotada pelos Ministros da Justiça dos Estados-Membros do Conselho da Europa em 13 e 14 de dezembro de 2021. https://rm.coe.int/venice-ministerial-declaration-eng-4-12-2021/1680a4df79
2. Refere-se aos Basic Principles on the Use of Restorative Justice Programmes in Criminal Matters, adotados pelo Conselho Econômico e Social das Nações Unidas (ECOSOC) em 24 de julho de 2002, por meio da Resolução 2002/12. [Basic principles on the use of restorative justice programmes in criminal matters :](https://digitallibrary.un.org/record/469889?ln=en&v=pdf)
3. BRASIL. Conselho Nacional de Justiça. Resolução n. 225, de 31 de maio de 2016. Institui a Política Nacional de Justiça Restaurativa no âmbito do Poder Judiciário. Disponível em: https://atos.cnj.jus.br/atos/detalhar/2272
4. UNITED NATIONS. Economic and Social Council. *Basic principles on the use of restorative justice programmes in criminal matters*. Resolution 2002/12, adopted 24 July 2002. Disponível em: [Basic principles on the use of restorative justice programmes in criminal matters :](https://digitallibrary.un.org/record/469889?ln=en&v=pdf)', null, null, null, null, 'publicado', '2026-09-17T12:00:00+00:00'),
  ('Caminhos práticos para aplicação da Justiça Restaurativa', 'Possibilidades reais no sistema penal brasileiro', 'caminhos-praticos-para-aplicacao-da-justica-restaurativa', '[{"nome": "Decildo Ferreira Lopes", "credenciais": ["Mestre em Direito e Políticas Públicas pela Universidade Federal de Goiás (2019).", "Doutorando em Direito pelo Instituto Brasileiro de Ensino, Desenvolvimento e Pesquisa, IDP (2023-2026).", "Visiting Researcher na Australian National University (PDSE/CAPES 2025-2026).", "Juiz de Direito do Tribunal de Justiça do Estado de Goiás."]}, {"nome": "Maxuel Pereira Dias", "credenciais": ["Defensor Público do Estado de Mato Grosso.", "Especialista em Criminologia e Direito da Execução Penal.", "Coautor do livro Justiça Restaurativa na Execução Penal: um manual para aplicação da JR em unidades prisionais (Paulus, 2023)."]}]'::jsonb, 'Imagine um hospital público em que um médico, diante da mais ampla variedade de doenças, prescrevesse sempre o mesmo medicamento. Não importasse a causa — bacteriana, viral ou acidental — a resposta seria invariavelmente a mesma. É fácil prever o resultado: indignação, ineficácia e abandono do tratamento.', '[]'::jsonb, 'Imagine um hospital público em que um médico, diante da mais ampla variedade de doenças, prescrevesse sempre o mesmo medicamento. Não importasse a causa — bacteriana, viral ou acidental — a resposta seria invariavelmente a mesma. É fácil prever o resultado: indignação, ineficácia e abandono do tratamento.

Essa metáfora traduz com precisão a forma como o Direito Penal brasileiro, especialmente a pena de prisão, vem sendo aplicado. Ignorando a complexidade humana e as diversas causas do delito, o sistema insiste no mesmo “remédio”. O resultado é previsível: não cura, não previne e muitas vezes agrava o quadro.

A superlotação carcerária e a ausência de diretrizes claras quanto aos fins da pena refletem esse modelo de intervenção estatal, que consolidou uma estrutura caótica e incapaz de produzir qualquer efeito preventivo. Reconhecendo isso, o Supremo Tribunal Federal, na ADPF 347, declarou o estado de coisas inconstitucional e, com o Plano “Pena Justa”, propôs medidas para sua superação — entre elas, a ampliação da Justiça Restaurativa (JR).

O STF, ao acolher a JR como modalidade de resolução de conflitos, reconheceu que ela pode funcionar como alternativa ao modelo tradicional. Assim, processos criminais antes restritos à lógica punitiva podem ser encaminhados aos núcleos restaurativos, onde se busca responsabilização e reparação compartilhadas.

Daí a questão central: como conciliar, na prática, a JR com o modelo penal vigente?

Primeiro, é preciso compreender a JR não como um tipo de procedimento, uma técnica de autocomposição (ex: sessão de conciliação ou mediação), mas como uma ideia diferente de justiça.

Enquanto o modelo tradicional tem como foco a violação da norma e a punição do infrator, a JR orbita em torno dos danos causados e dos meios disponíveis para a construção compartilhada de meios de reparação ou minimização desses danos.

O modelo tradicional, até mesmo por um princípio da jurisdição criminal, tende a pretender um distanciamento das partes. O conflito é capturado, a vítima é “substituída” enquanto parte, passando a atuar como uma fonte de prova. Ocorre uma verdadeira “abstratização” do conflito penal, pois a violação da norma passa a ser o grande objeto de investigação.

Violada a norma, aplica-se a pena. Sob essa abordagem, a pena é muito mais uma resposta ao ofensor pelo desrespeito à norma do que algo que vise reparar ou minimizar os danos suportados pela vítima. Portanto, o principal objeto de restauração nesse modelo é a própria eficácia da norma proibitiva.

A JR, diversamente, envolve a participação do ofensor, da vítima e de todas as pessoas de alguma forma impactada pelo ato danoso. Para ela a pacificação social e a recomposição do tecido social decorre do movimento no sentido de buscar atender as necessidades dessas pessoas, por meio da responsabilização ativa daqueles responsáveis pela causação do dano. Com isso, a construção da resposta tem como parâmetro não apenas a subsunção do fato a norma, mas os danos dele decorrentes.

Como consequência, os atores do sistema de justiça sentem-se desafiados a desenvolver novas competências, sendo a mais importante, a capacidade de identificar as reais necessidades daqueles impactados pelo crime.

Como pessoas diretamente afetadas pelo dano, as vítimas elas são convidadas a participar ativamente, tendo a oportunidade de apresentar suas necessidades, sentimentos e expectativas. E como o foco – diferente do modelo tradicional – não é uma pessoa, mas os danos causados, todos aqueles de alguma forma afetados (direta ou indiretamente) são também acolhidos no processo restaurativo, o que inclui até mesmo o ofensor.  Quanto a este, a JR promove um afastamento da caricatura da vilania do ofensor, para permitir que ele, uma vez decidido a responsabilizar-se ativamente pelo mal causado, possa encontrar o apoio necessário para que a construção de um novo caminho de redenção seja possível.

Trata-se de virada paradigmática: ir além da responsabilização passiva (mero cumprimento de uma sanção imposta), estimulando o apenado a assumir compromissos concretos de responsabilização ativa.

A efetiva realização desse propósito, entretanto, não é tarefa simples. Para além da assimilação dessa nova ideia, necessário enfrentar adequadamente as resistências naturais ao processo de substituição de modelos mentais e institucionais consolidados.

Uma primeira resistência sustenta-se na inexistência de amparo legal para a aplicação da metodologia restaurativa. Isto porque, ainda que recomendada pelo CNJ e – como dito acima – acolhida pelo STF como meio viável para resolução de casos encaminhados à justiça criminal, a JR ainda não foi regulamentada por lei.

No entanto, não se trata de inovação desgarrada do ordenamento jurídico, mas, do contrário, uma concretização de princípios constitucionais e legais já postos, como a dignidade da pessoa humana (art. 1º, III, CF), a individualização da pena (art. 5º, XLVI, CF) e a própria finalidade ressocializadora da pena.

Existe robusto arcabouço normativo (nacional e internacional) que embora não possua a força de lei em sentido estrito (caráter vinculante), fornecem diretrizes importantes para a modelagem de interpretação jurídica que permita o acolhimento do ideal restaurativo no cenário nacional.

No plano global, a Resolução ECOSOC 2002/12 da ONU já orienta a incorporação de medidas restaurativas ao processo criminal. A Resolução CNJ nº 225/2016, em perfeita consonância com as melhores práticas internacionais, autoriza que procedimentos e processos judiciais sejam encaminhados a JR em qualquer fase de sua tramitação. A Resolução CNJ nº 288/2019, por seu turno também propõe a aplicação de alternativas penais com enfoque restaurativo, em substituição à privação de liberdade.

Na execução penal, os art. 112, §1º e art. 66, III, “a” e “b” da LEP, já oferecem o alicerce para a consideração dos resultados obtidos em programas restaurativos. Com efeito, segundo orientação já consolidada nos tribunais superiores, a pena não deve se limitar à função retributiva, confirmando a tese aqui defendida e abrindo caminho para a incorporação dos resultados restaurativos eventualmente alcançados.

A Justiça Restaurativa também encontra amparo em resoluções do CNMP (Resoluções nº 243/21 e nº 118/2014) como recurso a serviço das políticas institucionais de Proteção Integral e de Promoção de Direitos e Apoio às Vítimas e de Incentivo à Autocomposição.

Mais recentemente, o Conselho Nacional de Política Criminal e Penitenciária (CNPCP), por meio da Recomendação nº 6, de 2025, orientou expressamente a implementação de práticas restaurativas na execução da pena, como forma de construção de uma cultura de paz, redução de conflitos nas unidades prisionais brasileiras e fortalecimento da reintegração social.

Esses instrumentos não apenas legitimam, mas incentivam a utilização dos resultados restaurativos no sistema de justiça.

Um segundo obstáculo diz respeito aos aspectos práticos da incorporação dos programas restaurativos nos fluxos judiciais já consolidados, especialmente, em que momento encaixar os processos restaurativo.

A esse respeito, importante destacar que essa pretensão não demanda abandono de qualquer ato judicial, princípio processual ou constitucional aplicável ao caso. Na verdade, para além da determinação de derivação à JR e posterior inclusão de seus resultados ao processo, é o programa restaurativo que se amolda a forma do processo judicial.

A inovação não reside na transformação dos institutos processuais, mas na ideia de justiça que orienta a sua utilização pelos atores processuais. O aparato processual deixa de servir ao mero propósito de punir ou absolver, para integrar novos objetivos: o tratamento adequado dos danos causados, a percepção das necessidades das pessoas afetadas e o desenvolvimento de meios de responsabilização ativa.

Imagine-se, por exemplo, um crime de roubo de celular. Não há dúvidas de que o dano patrimonial é algo compartilhado por todas as vítimas de crimes dessa natureza. Entretanto, não se pode dizer que esse seja o único dano suportado por todas elas ou que as outras consequências sejam as mesmas para todas as vítimas. Isso porque, uma infinidade de circunstâncias externas e características pessoais podem influenciar na forma como cada pessoa vai se sentir e reagir após passar pela experiência de ser assaltada e perder o celular.

Haverá quem não se importe tanto com a perda patrimonial, dada a situação financeira privilegiada, mas também aqueles que, se não tiverem o bem recuperado, dificilmente conseguirão comprar outro. Haverá quem se servia do aparelho apenas eventualmente, como também aqueles que dependiam do aparelho para seu sustento. Enquanto alguns conseguem seguir a vida normalmente após a experiência, outros podem carregar traumas e medos por toda a vida.

Ou seja, da mesma forma que as pessoas reagirão diferentemente ao fato, igualmente diversas serão as necessidades que dele decorrem. Por exemplo, enquanto para um importante será recuperar o celular e ver o assaltante punido, para outro o mais importante é não sentir mais medo. O que, entretanto, é compartilhado por todos que levam o fato ao conhecimento das autoridades, são as expectativas de terem suas necessidades, senão atendidas, ao menos levadas em consideração.

O atual modelo de justiça criminal, definitivamente, não alcança essas dimensões do dano, mas uma vez derivado o caso à JR, o próprio núcleo restaurativo se incumbirá dessa tarefa, como parte integrante dos fluxos dos programas restaurativos. Portanto, sem prejuízo da possibilidade de juízes, promotores, defensores e advogados participarem mais ativamente de programas e processos restaurativos, isso não é algo essencial para a incorporação destes à justiça criminal.

O que é essencial é a exata compreensão do ideal restaurativo e a derivação adequada de novos casos. Essa decisão, por óbvio, caberá ao dirigente processual, assegurada prévia manifestação do Ministério Público e da defesa técnica. O prazo – enquanto a questão não for regulamentada – pode perfeitamente ficar ao critério do julgador, que levará em consideração as peculiaridades de cada caso.

Ao receber o processo, o núcleo restaurativo realizará o controle quanto à observância dos princípios restaurativos e avaliação de risco (não revitimização ou produção de novos danos), assegurando às partes do processo original a informação a respeito de seu andamento, sendo certo que todos, se quiserem e se comprometerem a aderir às regras de cada processo, poderão participar das atividades.

Alcançado um resultado restaurativo – que representa o entendimento construído coletivamente pelos participantes quanto ao que lhes parece adequado como meio de responsabilização e restauração (ou minimização dos danos) – este é reduzido a termo e juntado aos autos para que, após a manifestação do MP e da defesa, o dirigente processual possa decidir quanto à forma como será aproveitado no processo.

Aqui um terceiro desafio. Talvez a maior dúvida daqueles que pretendem servir-se de processos restaurativos: como aproveitar o resultado no processo criminal.

Esta tarefa, ainda que mais aberta à criatividade e proatividade dos atores processuais para a criação de meios de aplicação, não é, definitivamente, algo que não se amolde ao cenário normativo vigente.

Um espaço processual que já contém todos os elementos para a incorporação dos resultados restaurativos são os institutos processuais de justiça criminal negocial. A adaptação, nesse caso, é de fácil implementação e decorre da simples substituição do ambiente processual tradicional pelos espaços restaurativos. Em outras palavras, em vez de se buscar o acordo no ministério público ou na sala de audiências, essa tarefa é delegada aos facilitadores do núcleo restaurativo.

O controle quanto à viabilidade do acordo permanece com aqueles a quem a lei atribuiu essa função, mas o acordo em si é construído segundo um conjunto de valores e premissas bem diferentes da prática judiciária tradicional. Como dito, o parâmetro para identificação dos meios de reparação deixa de ser a mera violação da norma ou a gravidade em abstrato da conduta e passa a ser os danos e as necessidades específicas de cada caso. Esses elementos por sua vez, deixam de ser presumidos pelos atores do processo judicial e passarão a decorrer da manifestação das próprias pessoas afetadas. Diferente do modelo tradicional, a adesão do ofensor ao programa restaurativo e a posterior celebração de acordo resultará, necessariamente, do seu desejo de responsabilizar-se ativamente, circunstância quase nunca presente no modelo tradicional.

Alcançado o acordo, este é juntado ao processo para que as partes possam dele ter conhecimento, exercerem o contraditório e ampla defesa, seguindo ao final para a decisão judicial, que será proferida nos mesmos moldes já autorizados em lei.

Nos casos não alcançados pelos institutos processuais de justiça negocial, não é raro que se verifique, ao longo da tramitação processual, sinais que apontam para a viabilidade da derivação para a Justiça Restaurativa.

Entre esses sinais, destacam-se: arrependimento genuíno do acusado; necessidades expressadas pelas vítimas, não contempladas pela sentença criminal; conflitos que se reproduzem no tempo, como na violência doméstica ou em desavenças comunitárias, em que há risco de repetição do dano; fragilidade de vínculos interpessoais, a indicar relações degradadas que estão na origem do conflito; percepção de que a vítima deseja se manifestar para além das perguntas direcionadas à prova da materialidade e autoria; ofensor que revela consciência do impacto do crime e dos danos causados; desejo de continuidade de vínculos em casos de violência doméstica; necessidade de continuidade de vínculos, quando vítima e ofensor permanecem conectados por laços inevitáveis (como coparentalidade, trabalho ou vizinhança).

Em casos assim, sinalizada a melhor adequação da JR para abordar o caso, não vemos qualquer óbice à suspensão do processo por prazo razoável de modo que seja tentada a construção de um resultado restaurativo. Se não for possível, o processo segue seu fluxo normal. Todavia, tendo as partes alcançado um acordo, deixando claro o que lhes parece adequado enquanto meio de responsabilização e reparação dos danos, defendemos não haver motivo suficiente para que este acordo não seja incorporado à sentença judicial.

Nos casos em que é possível a substituição da pena privativa de liberdade, esta deverá ser substituída pelo acordo alcançado, acrescendo-se aos fundamentos do art. 44 e seguintes do CP, os elementos que justificam a aplicação da Justiça Restaurativa, notadamente o fato de que o acordo restaurativo representa aquilo que as partes — em especial a vítima — consideram necessário e adequado como forma de responsabilização e reparação.

Haverá quem sustente que a aplicação da pena não se vincula exclusivamente ao interesse da vítima, mas também ao interesse da sociedade — preocupação legítima que informa a função retributiva e preventiva do Direito Penal. Contudo, mesmo sob essa ótica, o objetivo nuclear permanece o mesmo: responsabilizar o agente e, ao mesmo tempo, criar expectativas razoáveis de que não haverá nova prática delituosa. Não há, contudo, seja nas características inatas das penas tipificadas no rol legal ou nos resultados por elas acumulados na experiência brasileira, motivos para crer que representem meio mais apto a alcançar essa dupla finalidade, especialmente no que diz respeito à adesão do ofensor a um conjunto diverso de valores. O mesmo se diga em relação à prevenção geral: enquanto a imposição de uma pena tradicional tende a produzir indivíduos socialmente marcados pelo estigma da criminalidade, os programas restaurativos conduzem essas mesmas pessoas por trajetórias de responsabilização concreta, capazes de gerar na coletividade sentimentos de respeito, confiança e cooperação.

A mesma lógica se aplica no âmbito da execução penal. Programas restaurativos implementados em varas de execuções penais ou mesmo em unidades prisionais podem ser verdadeiros celeiros para a identificação de pessoas que se reconhecem na proposta e manifestam interesse em participar de processos restaurativos, revelando disposição genuína para reconstruir vínculos e reparar danos. Nesses contextos, os indivíduos têm a oportunidade, rara no modelo tradicional, de exercer uma responsabilização ativa — que implica reconhecer, compreender e agir sobre as consequências de seus atos — e não apenas cumprir passivamente uma sanção imposta pelo Estado. Alcançado o resultado restaurativo nesta fase, várias são as possibilidades de aproveitamento.

Dentre estes, destacam-se a progressão antecipada de regime, com a consequente redução do lapso temporal exigido, e a remição do tempo dedicado ao programa, aplicando-se lógica análoga à remição por estudo ou trabalho, conforme previsto no art. 126 da LEP. Adicionalmente, pode-se considerar a flexibilização ou dispensa de medidas restritivas, como o monitoramento eletrônico, sempre que houver segurança para isso, bem como a ampliação de direitos de visitação e contato familiar, visando reforçar vínculos pró-sociais.

Há, ainda, a possibilidade de conversão de obrigações pecuniárias em ações de interesse comunitário, conforme o plano restaurativo. Essas medidas, além de reconhecerem o mérito individual, produzem um efeito multiplicador positivo, incentivando outros reeducandos a aderirem aos programas restaurativos.

Enfim, a incorporação da Justiça Restaurativa ao sistema formal de justiça não é uma ruptura, mas uma evolução. Ela qualifica a resposta jurisdicional, tornando-a mais atenta às necessidades concretas das vítimas e às legítimas expectativas da sociedade – que anseia pela responsabilização do infrator, mas também pela sua reintegração segura.

Atender a essa exigência, mediante mecanismos que promovam responsabilização ativa e efetiva, é a concretização coerente do que decorre de uma interpretação sistemática da Constituição, da legislação penal e processual penal e das normas internacionais de direitos humanos.', null, null, null, null, 'publicado', '2026-09-16T12:00:00+00:00'),
  ('Justiça Restaurativa como instrumento para construção de uma nova cultura no espaço prisional', 'Estudo da aplicação de círculos de construção de paz em unidades prisionais', 'justica-restaurativa-nova-cultura-no-espaco-prisional', '[{"nome": "Decildo Ferreira Lopes", "credenciais": ["Mestre em Direito e Políticas Públicas pela Universidade Federal de Goiás (2019).", "Especialista em Direito Penal Contemporâneo e Sistema Prisional pela Escola Nacional da Magistratura (2022).", "Doutorando em Direito pelo Instituto Brasileiro de Ensino, Desenvolvimento e Pesquisa (IDP).", "Juiz de Direito e Coordenador do Núcleo de Justiça Restaurativa no Tribunal de Justiça do Estado de Goiás."]}]'::jsonb, 'O presente estudo avalia o programa de Justiça Restaurativa aplicado nas unidades prisionais de Uruaçu, Barro Alto e Rialma, todas localizadas no Estado de Goiás. A pesquisa parte da contextualização da política criminal brasileira, com foco nas expressões do paradigma punitivo na forma como o sistema prisional tem exercido o seu papel no sistema de justiça penal. Registra críticas ao ideal ressocializador, como forma de compreender o cenário específico em que a prática restaurativa investigada é aplicada. Por meio de pesquisa bibliográfica, revisa a expansão da Justiça Restaurativa no Brasil, suas características, em especial as tensões decorrentes de sua aproximação ao sistema de justiça criminal, suscitando preocupações quanto ao risco de cooptação pela lógica do sistema punitivo. Apresenta os resultados de pesquisa de campo realizada nas citadas unidades prisionais, com o fim de aferir, junto às pessoas que tiveram contato direto com as metodologias da Justiça Restaurativa, suas impressões a respeito, tanto no que concerne ao cumprimento dos objetivos enunciados, quanto aos efetivos efeitos que as práticas surtem no público destinatário, de modo a subsidiar uma avaliação sobre a pergunta principal orientadora da pesquisa: se os círculos de construção de paz podem servir como instrumento para a construção de uma nova cultura no sistema prisional. Por meio de entrevistas semiestruturadas, foram ouvidas 29 pessoas provadas privadas de liberdade (20 homens e 9 mulheres). Os três diretores das unidades prisionais responderam ao questionário encaminhado via e-mail. Os achados da pesquisa sugerem que a aplicação de programas restaurativos no sistema prisional pode, sim, contribuir para esse propósito, mas não unicamente por meio da aplicação de círculos de construção de paz, conforme realizado na prática examinada. Os relatos colhidos revelaram um contraste entre a descrição dos valores compreendidos como típicos da prisão e aqueles que passaram a cultivar após a participação nos círculos. A melhoria no relacionamento interno, o estímulo ao exercício da empatia e o potencial para diminuição dos conflitos se destacam como pontos positivos. Por outro lado, os achados revelam também algumas deficiências que, embora não desconstituam as conclusões anteriores, podem representar empecilho ao avanço de programas da mesma natureza no sistema prisional ou mesmo inseri-lo nas hipóteses de risco de afastamento dos princípios da Justiça Restaurativa. A partir dessas observações, propõe-se sugestões para o caso de manutenção e/ou a eventual expansão do programa: a) qualificação da apresentação do programa e dos objetivos da Justiça Restaurativa para a execução penal; b) inclusão de programas destinados aos integrantes da administração prisional; c) estabelecimento de recursos de avaliação constante dos resultados do programa; d) estabelecimento de meios que permitam, para além do ciclo de círculos de paz, oportunidades para reverberação dos valores e propósitos estabelecidos nos círculos; e) formação continuada dos facilitadores e ampliação de seu quantitativo; f) inclusão de módulo 294 ReJuB - Rev. Jud. Bras., Brasília, Ano 1, sup. esp., p. 293 - 329, jul./dez. 2021 JUSTIÇA RESTAURATIVA COMO INSTRUMENTO PARA CONSTRUÇÃO DE UMA NOVA CULTURA NO ESPAÇO PRISIONAL: ESTUDO DA APLICAÇÃO DE CÍRCULOS DE CONSTRUÇÃO DE PAZ EM UNIDADES PRISIONAIS sobre justiça restaurativa no curso de formação dos policiais penais; g) aprimoramento do material orientador do programa, de modo que os danos causados às vítimas e às comunidades, assim como aos meios de restauração, sejam mais bem trabalhados.', '["justiça restaurativa", "sistema prisional", "círculos de construção de paz", "estudo de caso"]'::jsonb, '', 'assets/docs/lopes-2021-justica-restaurativa-espaco-prisional-rejub.pdf', '10.54795/RejuBespecial.SisPri.202', 'ReJuB, Revista Judicial Brasileira, ano 1, sup. esp., p. 293-329, jul./dez. 2021', 'https://doi.org/10.54795/RejuBespecial.SisPri.202', 'publicado', '2021-12-01T12:00:00+00:00')
on conflict (slug) do nothing;

-- Conferência: deve devolver 3 linhas.
-- select slug, status, publicado_em, length(corpo) from public.artigos order by publicado_em desc;
