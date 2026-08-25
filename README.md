# Instituto Brasileiro de Práticas Restaurativas (IBPR)

Site institucional do IBPR. HTML, CSS e JavaScript puros, sem framework e sem etapa de build: os arquivos são servidos como estão.

## Páginas

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Home: propósito, formações, soluções, fundadores e notícias |
| `o-instituto.html` | Missão, visão, valores, abordagem e trajetória dos fundadores |
| `justica-restaurativa.html` | O que é, na educação, e na justiça/segurança/sistema prisional |
| `solucoes.html` | Fortalecer relações, construir respostas, transformar instituições |
| `formacoes.html` | As 4 formações com competências, público-alvo e certificação |
| `noticias.html` | Listagem de notícias |
| `area-do-aluno.html` | Acesso ao ambiente virtual de aprendizagem |

## Estrutura

```
assets/
  css/    tokens.css (identidade da marca) + components.css
  js/     site-interactions.js
  images/ logos, retratos dos fundadores, imagens das soluções
  videos/ vídeo do hero
```

`tokens.css` concentra cores, tipografia e espaçamentos. Qualquer ajuste de identidade começa por lá.

## Cache

Os links de CSS e JS carregam um sufixo de versão (`?v=...`). **Ao alterar CSS ou JavaScript, incremente esse sufixo nos 7 arquivos HTML**, senão os navegadores continuam servindo a versão antiga e a mudança não aparece.

## Em aberto

Itens que dependem de informação do Instituto e estão sinalizados no código com `TODO`:

- E-mail institucional e perfis de redes sociais (hoje aparecem como "a confirmar")
- Endereço da plataforma de aulas (Hotmart), usado na Área do Aluno e nas formações
- Vídeo institucional de apresentação
- Domínio definitivo, necessário para `canonical` e `og:url`
- Confirmação do número de profissionais formados exibido na Home
