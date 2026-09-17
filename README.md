# Instituto Brasileiro de Práticas Restaurativas (IBPR)

Site institucional do IBPR. HTML, CSS e JavaScript puros, sem framework. As páginas fixas são editadas à mão; o conteúdo do painel (notícias, artigos, formações, pessoas, textos) vive no Supabase e entra no HTML por `build/gerar.mjs`, que roda na GitHub Actions (`.github/workflows/publicar.yml`) a cada publicação no painel e a cada 6 h. Estado e histórico completos: `ESTADO-ATUAL.md` no vault (ver `CLAUDE.md`).

## Páginas

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Home: propósito, formações, como atuamos, as pessoas e notícias |
| `o-instituto.html` | Missão, visão, valores, abordagem e as pessoas por trás do propósito |
| `praticas-restaurativas.html` | JR e práticas restaurativas, educação, justiça/sistema prisional, empresas |
| `como-atuamos.html` | Fortalecer relações, construir respostas, transformar instituições |
| `formacoes.html` | As 4 formações com competências, público-alvo e certificação |
| `ibpr-em-movimento.html` | Hub de Notícias (`#noticias`) e artigos recentes; lista de notícias gerada pelo build |
| `artigos.html` | Lista de artigos (gerada pelo build); cada artigo vira `artigo-<slug>.html` a partir de `build/templates/artigo.html` |
| `noticia-<slug>.html` | Páginas de notícia geradas a partir de `build/templates/noticia.html` |
| `formacao-<slug>.html` | Páginas de curso geradas a partir de `build/templates/formacao.html` |
| `politica-de-privacidade.html` | Política de privacidade (LGPD) |
| `area-do-aluno.html` | Acesso ao ambiente virtual de aprendizagem |

## Estrutura

```
assets/
  css/    tokens.css (identidade da marca) + components.css
  js/     site-interactions.js, supabase-config.js, supabase-client.js
  images/ logos, retratos, fotos das seções, posters
  videos/ vídeo do hero da Home, clipes da seção "A prática acontecendo"
  docs/   PDFs de artigos versionados no repo (os subidos pelo painel vão pro storage)
build/
  gerar.mjs        o build: lê o Supabase e regenera as regiões <!-- CMS:... --> e as páginas geradas
  templates/       formacao.html, noticia.html, artigo.html
  dev/             servidor falso do Supabase, lqip.py, docx-para-artigo.py, seed dos artigos
painel/            o CMS (login, notícias, artigos, formações, pessoas, textos, ajuda)
supabase/          SQL numerado (01 a 11b) + SETUP.md; rodar em ordem, cada um é idempotente
```

**Marcação leve dos artigos** (campo `corpo`, explicada na aba Ajuda do painel): linha em branco separa parágrafos; `## ` seção; `### ` subseção; `> ` citação; `- ` e `1. ` listas; `*itálico*`, `**negrito**`; `[1]` nota + seção `## Notas` com `1. texto`; links como URL solta ou `[texto](url)`.

`tokens.css` concentra cores, tipografia e espaçamentos. Qualquer ajuste de identidade começa por lá.

## Cache

Os links de CSS e JS carregam um sufixo de versão (`?v=...`). **Ao alterar CSS ou JavaScript, incremente esse sufixo em todos os HTML da raiz e nos 3 templates de `build/templates/`** (um `sed` resolve), senão os navegadores continuam servindo a versão antiga e a mudança não aparece.

## Em aberto

Itens que dependem de informação do Instituto e estão sinalizados no código com `TODO`:

- Perfis de redes sociais (hoje aparecem como "a confirmar")
- Endereço da plataforma de aulas (Hotmart), usado na Área do Aluno e nos botões dos cursos
- Vídeo institucional de apresentação (seção "Conheça o Instituto" da Home)
- Vídeos em melhor resolução pra seção "A prática acontecendo" (hoje arquivo do WhatsApp numa moldura de celular) e pro hero de Práticas (vídeo pronto em `assets/videos/praticas-hero-loop.mp4`, fora do ar até vir o original)
- Confirmação do número de profissionais formados exibido na Home
