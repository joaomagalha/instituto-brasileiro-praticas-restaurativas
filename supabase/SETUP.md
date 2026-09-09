# Supabase do IBPR — passo a passo (só precisa fazer uma vez)

Este guia é pro João. São 15-20 minutos. Não precisa saber nada de banco de dados:
é criar conta, colar um arquivo e clicar em algumas coisas.

**Por que o Supabase:** o site do IBPR é estático (HTML puro no GitHub Pages), não tem
servidor. O Supabase entrega, prontos e de graça, as três coisas que faltavam pro painel
funcionar: um banco de dados, um sistema de login e um lugar pra guardar imagem. O site
conversa direto com ele pelo navegador, sem back-end nosso no meio.

**Custo:** R$ 0. O plano gratuito dá 500 MB de banco e 1 GB de arquivos, muito acima do que
este site vai usar.

---

## 1. Criar a conta

1. Abrir <https://supabase.com> e clicar em **Start your project**.
2. Entrar com o **GitHub** (é a opção mais rápida, e você já tem conta).
3. Autorizar o acesso.

## 2. Criar o projeto

1. Clicar em **New project**.
2. Preencher:
   - **Name:** `ibpr`
   - **Database Password:** clicar em *Generate a password* e **guardar essa senha** no seu
     gerenciador de senhas. Ela não é usada no dia a dia, mas se perder não dá pra recuperar.
   - **Region:** `South America (São Paulo)` — é o servidor mais perto, deixa o site mais rápido.
   - **Plan:** Free
3. **Create new project** e esperar 1-2 minutos até ficar verde.

## 3. Criar as tabelas e as regras de segurança

1. No menu da esquerda, abrir **SQL Editor**.
2. Clicar em **New query**.
3. Abrir o arquivo `01-noticias.sql` (está nesta mesma pasta), copiar **tudo** e colar lá.
4. Clicar em **Run** (ou `Cmd + Enter`).
5. Tem que aparecer *Success. No rows returned*. Se der erro, me manda o texto do erro.

Para conferir: menu **Table Editor** → tem que existir a tabela `noticias`, vazia, com um
cadeado escrito **RLS enabled**. Esse cadeado é o que protege o banco.

## 4. Desligar o cadastro público

Sem isto, qualquer pessoa da internet consegue criar uma conta no projeto usando a chave que
fica visível no site. Ela não conseguiria publicar nada (para isso precisa estar na lista de
editores do passo 6), mas não há motivo nenhum pra deixar estranhos criando conta.

É a primeira das duas camadas de segurança: **esta fecha a porta da rua, a do passo 6 fecha
a porta do escritório.**

1. Menu **Authentication** → **Sign In / Providers** (em algumas versões: **Providers**).
2. Em **Email**, deixar **Enable Email provider** ligado (é como a equipe entra),
   mas **desligar "Allow new users to sign up"**.
3. Salvar.

A partir daí, ninguém se cadastra sozinho. Só existem os usuários que você criar na mão.

## 5. Criar os usuários do IBPR

1. Menu **Authentication** → **Users** → **Add user** → **Create new user**.
2. Criar um por pessoa que vai publicar. Comece pelo **seu**, pra poder testar.
   Depois: Fernanda (Diretora-Geral), Decildo (Coordenador Acadêmico),
   Rauny (Coordenador de Desenvolvimento).
3. Marcar **Auto Confirm User** (senão o Supabase manda e-mail de confirmação e trava).
4. Definir uma senha provisória pra cada um e anotar. Eles trocam depois.

> Enquanto o IBPR não passar os e-mails institucionais, dá pra criar só o seu.
> Os outros três a gente cria quando os e-mails existirem.

## 6. ⚠️ Autorizar cada usuário a publicar (passo obrigatório)

Criar o usuário no passo 5 dá **só o direito de entrar**. Publicar exige estar na lista de
editores. São duas travas de propósito: se um dia o cadastro público for religado por engano,
o estranho até cria conta, mas não escreve nada.

Para cada pessoa, abrir **SQL Editor** → **New query**, trocar o e-mail e o nome, e rodar:

```sql
insert into public.editores (user_id, nome)
select id, 'João Victor' from auth.users where email = 'seu-email@exemplo.com'
on conflict (user_id) do nothing;
```

Para conferir quem está autorizado:

```sql
select e.nome, u.email from public.editores e join auth.users u on u.id = e.user_id;
```

> Se alguém entrar no painel e não conseguir salvar nada, quase sempre é isto:
> a pessoa existe em Authentication mas não foi inserida em `editores`.

## 7. Pegar as duas chaves e me mandar

1. Menu **Project Settings** (engrenagem) → **API Keys**.
2. Copiar:
   - **Project URL** (fica na página inicial do projeto) — algo como `https://abcdefgh.supabase.co`
   - **Publishable key** — começa com `sb_publishable_`
3. Me mandar as duas aqui no chat.

**Pode mandar sem medo.** A publishable é uma chave pública por definição: ela vai ficar
visível no código do site, no navegador de qualquer visitante. Quem protege o banco não é o
segredo da chave, são as regras (RLS) criadas no passo 3.

> Em projetos antigos essa chave se chamava **anon** e começava com `eyJ`. É a mesma coisa,
> só mudou o nome e o formato.

**O que NUNCA pode sair daí:** a **Secret key** (`sb_secret_...`, logo abaixo na mesma tela,
escondida atrás do olhinho). Essa ignora todas as regras de segurança. Não é usada neste
projeto: não revele, não me mande, não coloque em lugar nenhum.

---

## Depois que você me mandar as chaves

Eu ligo o site e o painel no seu projeto, e a gente testa junto:
criar notícia → publicar → ver aparecendo no site.

## Detalhe do plano gratuito (não é problema hoje)

Projeto gratuito **pausa depois de ~7 dias sem nenhum acesso**. Como o site consulta o
Supabase a cada visita, o tráfego normal mantém ele acordado. E mesmo se pausar, o site não
quebra: ele volta a mostrar o estado "Primeiras publicações em breve" que já está no ar hoje.
Se um dia virar incômodo, a gente resolve com um ping automático gratuito.

---

## Estado atual (preenchido em 08/09/2026)

| | |
|---|---|
| Organização | **IBPR** (plano Free) |
| Projeto | **ibpr-site**, região São Paulo (`sa-east-1`) |
| Referência do projeto | `dlqisnyhuexcjjbglzxp` |
| Project URL | `https://dlqisnyhuexcjjbglzxp.supabase.co` |
| Chave usada no site | **Publishable key** (`sb_publishable_...`), o nome novo da antiga anon key |
| Cadastro público | **desligado** |
| Sign-in anônimo | desligado |
| RLS automático em tabelas novas | ligado |
| Editores cadastrados | João Victor (`magalhaesjoaovictor81@gmail.com`) |
| Site URL | `https://joaomagalha.github.io/instituto-brasileiro-praticas-restaurativas` |
| Redirect URLs | Pages, localhost:8765, ibpr.com.br (com e sem www) |

> A biblioteca `supabase-js` teve que subir de 2.45.4 para **2.116.0**: a versão
> antiga não reconhece o formato novo de chave (`sb_publishable_`).

## ⚠️ Pendência antes de entregar o painel ao IBPR: SMTP próprio

O e-mail embutido do Supabase tem **limite de 2 e-mails por hora** (Authentication →
Rate Limits, campo travado no plano gratuito) e a própria Supabase diz que ele serve só
para testes.

Isso afeta direto o "Esqueci minha senha": com três pessoas usando o painel, se duas
pedirem recuperação na mesma hora, a terceira não recebe.

**Solução:** configurar SMTP próprio em Authentication → Emails → SMTP Settings. O plano
gratuito do Resend (3.000 e-mails/mês) ou do Brevo resolve, e aí o e-mail também sai com
remetente do Instituto em vez do domínio da Supabase.

---

## Gatilho de publicação (deixa o site atualizar em ~2 min em vez de 6h)

Sem isto o site já funciona: o robô roda de 6 em 6 horas e publica o que achar. Isto só
encurta a espera, avisando o GitHub na hora em que alguém publica.

São dois passos no **SQL Editor**, nesta ordem.

### Passo 1 — guardar o token no cofre

O Supabase tem um cofre criptografado (Vault). O token vai pra lá, não pro código.

```sql
select vault.create_secret(
  'COLE_AQUI_O_TOKEN',            -- o github_pat_... que você gerou
  'github_token_cms',             -- o nome tem que ser exatamente este
  'Token do GitHub usado pelo gatilho de publicação do CMS'
);
```

> ⚠️ **Depois de rodar, apague essa consulta do histórico** (menu de três pontinhos ao lado
> do nome dela, na coluna da esquerda → Delete). O SQL Editor guarda o que você digitou, e
> o token ficaria salvo ali em texto puro.

### Passo 2 — criar o gatilho

Abrir `03-gatilho-github.sql` (nesta pasta), copiar tudo, colar e rodar. Esse arquivo não
tem segredo nenhum, por isso pode ficar versionado no GitHub.

### Conferir se funcionou

Publique qualquer coisa pelo painel e abra a aba **Actions** do repositório. Deve aparecer
uma execução de "Publicar site" em poucos segundos.

Se não aparecer, rode isto pra ver onde parou:

```sql
select 'extensão pg_net' as item,
       coalesce((select extversion from pg_extension where extname='pg_net'), 'NÃO INSTALADA') as valor
union all
select 'segredo no Vault',
       coalesce((select 'sim' from vault.secrets where name='github_token_cms'), 'FALTANDO')
union all
select 'gatilho',
       coalesce((select tgname from pg_trigger where tgname='noticias_avisa_github'), 'FALTANDO');
```

E para ver as últimas chamadas que o banco fez ao GitHub (status 204 = deu certo):

```sql
select created, status_code, content
  from net._http_response
 order by created desc limit 5;
```

---

## Etapa 2b — ligar as Formações (fazer uma vez)

Enquanto estes dois arquivos não forem rodados, **nada quebra**: o build percebe que a tabela
não existe, não mexe em nada e o site segue como está. As notícias continuam publicando
normalmente. Então dá pra fazer com calma.

### Passo 1 — criar a tabela

SQL Editor → New query → colar `02-formacoes.sql` inteiro → **Run**.

Confira no **Table Editor**: tem que existir a tabela `formacoes`, vazia, com o cadeado
**RLS enabled**.

### Passo 2 — carregar as 4 formações que já estão no ar ⚠️

SQL Editor → New query → colar `02b-seed-formacoes.sql` inteiro → **Run**.

No fim ele mostra uma tabelinha de conferência: têm que aparecer **4 linhas**, todas com
status `publicado`, e as contagens de módulos e tópicos preenchidas.

> **Não pule este passo e não inverta a ordem.** Enquanto a tabela estiver vazia, o build se
> recusa a gerar as listas (senão o menu, o menu do celular, o rodapé, o carrossel da Home e o
> catálogo ficariam vazios de uma vez). O log do Actions avisa isso em português.

Este arquivo usa `on conflict (slug) do nothing`: rodar de novo por engano **não sobrescreve**
nada que o Instituto já tenha editado pelo painel.

### Passo 3 — conferir

1. Abrir `/painel/formacoes.html`. Devem aparecer as 4 formações, todas como *Publicado*.
2. Na aba **Actions** do repositório, uma execução de "Publicar site" deve ter começado
   sozinha (o gatilho da tabela `formacoes` já vem no `02-formacoes.sql`).
3. Quando ela terminar, o site tem que estar **exatamente igual** ao que estava antes. Se
   alguma coisa mudou de aparência, é bug: me avise antes de continuar.

Depois disso, criar uma formação nova pelo painel já a coloca sozinha em todos os lugares:
menu, menu do celular, rodapé, Home, catálogo, dados estruturados do Google e a página
própria dela.

### O que ficou de fora, de propósito

A descrição de `formacoes.html` para o Google (as três `<meta>` no topo do arquivo) ainda cita
"as quatro formações" e lista os temas. Isso é texto técnico de SEO, não conteúdo do
Instituto, e continua sendo manutenção minha: se o número de formações mudar, eu reescrevo
essa frase. O título visível da página ("As quatro formações do Instituto") **é** automático.

---

## Etapa 3 — ligar as Pessoas (fazer uma vez)

Mesma lógica da 2b: enquanto estes dois arquivos não forem rodados, **nada quebra**. O build
percebe que a tabela `pessoas` não existe, não mexe em nada e o site segue como está.

Pode rodar junto com os da Etapa 2b, na mesma sessão do SQL Editor. A ordem entre as duas
etapas não importa; o que importa é a ordem **dentro** de cada uma.

### Passo 1 — criar a tabela

SQL Editor → New query → colar `04-pessoas.sql` inteiro → **Run**.

Confira no **Table Editor**: tem que existir a tabela `pessoas`, vazia, com o cadeado
**RLS enabled**.

(O nome começa com 04 porque o número 03 já era do gatilho do GitHub. É a Etapa 3 do CMS.)

### Passo 2 — carregar as 5 pessoas que já estão no ar ⚠️

SQL Editor → New query → colar `04b-seed-pessoas.sql` inteiro → **Run**.

No fim ele mostra uma tabelinha de conferência: têm que aparecer **5 linhas**, todas com
status `publicado`. Fernanda e Decildo com grupo `direcao` e `destaque_home` marcado; Érica,
Maxuel e Mônica com grupo `rede`.

> **Não pule este passo e não inverta a ordem.** Sem ninguém publicado na direção, o build se
> recusa a mexer na seção (senão "As pessoas por trás do propósito" ficaria com o título e
> nenhuma pessoa embaixo). O log do Actions avisa isso em português.

### Passo 3 — conferir

1. Abrir `/painel/pessoas.html`. Devem aparecer as 5 pessoas, com foto, todas como *Publicado*.
2. Na aba **Actions** do repositório, uma execução de "Publicar site" deve ter começado sozinha.
3. Quando ela terminar, a página **O Instituto** e a página inicial têm que estar
   **exatamente iguais** ao que estavam antes. Se mudou alguma coisa de aparência, é bug.

### O que dá pra fazer pelo painel depois disso

- Trocar a foto, o cargo, a apresentação e a trajetória de qualquer pessoa.
- Acrescentar alguém novo, escolhendo em qual dos dois blocos entra.
- Marcar quem aparece também na prévia da página inicial.
- **Recolocar o Rauny** quando o Instituto definir como descrever a função dele: é só cadastrar
  pelo painel, com a foto que já está no repositório. Não precisa de SQL nem de mim.

### Duas coisas que o painel faz e ninguém precisa saber

- **Itálico com asterisco.** Escrever `*Justiça Restaurativa na Execução Penal*` deixa o
  trecho em itálico no site. É o único código aceito; todo o resto do texto é escapado, então
  não dá pra quebrar o site (nem invadir) escrevendo HTML no formulário.
- **A medida da foto.** O painel lê largura e altura do arquivo escolhido e grava junto. É o
  que impede a página de "pular" enquanto o retrato carrega.

### O que ficou de fora, de propósito

Os títulos dos dois blocos ("As pessoas por trás do propósito" e "Quem já se juntou a este
propósito"), o kicker de cada um e o convite do fim ("O IBPR está aberto a novas conexões")
continuam no código. São a moldura da seção, não o conteúdo dela, e entram na Etapa 4, que
trata dos textos institucionais. O bloco da rede inteiro (título junto) some sozinho se não
houver ninguém publicado nele.

---

## Etapa 4 — ligar os Textos institucionais (fazer uma vez)

A última etapa do CMS, e a que funciona diferente das outras três.

**Nas outras, o painel cria coisas:** uma notícia vira um card e uma página, uma formação vira
um item de menu, uma pessoa vira um retrato na seção. **Aqui não.** Cada linha desta tabela é
um pedaço de texto que **já existe** numa página, e o painel só troca as palavras dele.

Por isso o painel de Textos **não tem "novo" nem "apagar"**, e o banco também recusa as duas
coisas. Um bloco só existe se houver um marcador correspondente no HTML, e quem escreve
marcador sou eu. Se o Instituto quiser tornar editável um texto que hoje não é, é só pedir.

### Passo 1 — criar a tabela

SQL Editor → New query → colar `05-textos.sql` inteiro → **Run**.

### Passo 2 — carregar os 33 blocos

SQL Editor → New query → colar `05b-seed-textos.sql` inteiro → **Run**.

No fim ele mostra uma tabelinha de conferência: **33 linhas**, e a coluna `igual_ao_original`
toda em `true`.

Aqui a ordem é menos crítica que nas outras etapas: com a tabela vazia, o build simplesmente
não encosta em texto nenhum e o site fica como está. O seed é o que dá conteúdo ao painel.

### Passo 3 — conferir

1. Abrir `/painel/textos.html`. Devem aparecer 33 blocos, agrupados nas 7 páginas.
2. O site tem que continuar **exatamente igual**. Se mudou alguma coisa, é bug.

### Os 33 blocos, e por que só 33

O site tem **165 parágrafos em 7 páginas**. Deixar todos editáveis criaria um formulário que
ninguém do Instituto ia usar, e quem usasse desmontaria o design sem querer. Ficaram os que
mudam com o tempo:

| Página | Blocos | O quê |
|---|---|---|
| Página inicial | 6 | frase de abertura, seção "Nosso propósito", a citação, seção "Como Atuamos" |
| O Instituto | 12 | topo, missão, visão, os 4 princípios, "Nossa abordagem" |
| Como Atuamos | 6 | topo e a frase de cada um dos 4 blocos |
| Práticas Restaurativas | 3 | topo e a citação de abertura |
| Formações | 2 | topo |
| IBPR em Movimento | 2 | topo |
| Área do Aluno | 2 | topo |

**O que ficou de fora, de propósito:**

- **O título grande da página inicial.** É a única frase do site com uma palavra destacada em
  cor por dentro ("Justiça Restaurativa"), e isso é design, não texto.
- **Os títulos dos 4 blocos de Como Atuamos.** A página inicial repete esses mesmos nomes na
  navegação lateral; editar num lugar só deixaria os dois fora de sincronia.
- **Os nomes curtos dos princípios** ("Aprendizagem permanente"). A explicação de cada um é
  editável; o nome é o rótulo da lista numerada.
- **O corpo da aba Práticas Restaurativas.** São textos longos de doutrina, que mudam pouco e
  ocupariam metade do painel.
- **Os fechos de página** ("Transforme conhecimento restaurativo em prática") e os títulos das
  seções de Pessoas e de IBPR em Movimento. São a moldura do site.
- **Os textos técnicos de SEO** (as `<meta>` no topo de cada arquivo), que continuam sendo
  manutenção minha.

Nada disso é definitivo: qualquer um desses vira editável quando o Instituto pedir. O trabalho
é escrever um marcador no HTML e acrescentar uma linha na tabela.

### Duas coisas que o painel de Textos faz

- **Selo "Editado"** em todo bloco que não está mais como foi entregue. Serve pra achar rápido
  o que mexeram.
- **"Restaurar o texto original"** devolve o texto que estava no site no dia em que o CMS foi
  ligado. É o desfazer de última instância, e não depende de ninguém ter guardado o texto
  antigo.
