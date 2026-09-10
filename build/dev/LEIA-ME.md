# Como conferir uma etapa do CMS antes de subir

Rotina usada na Etapa 2b (Formações) e que vale repetir nas próximas
(Pessoas, textos institucionais). Está aqui pra não ter que redescobrir.

A pergunta que todas as conferências respondem é a mesma: **o build mexeu
só no que devia?** O risco do desenho por marcadores é justamente esse, e
ele não aparece lendo código, só medindo.

## 1. Texto visível idêntico, caractere por caractere

Com o banco carregado só com o conteúdo que **já está no ar**, o site tem
que ficar exatamente igual. Compare contra o commit anterior tirando tags,
scripts, estilos e comentários:

```bash
limpa() { python3 -c "
import sys,re,html
s=sys.stdin.read()
s=re.sub(r'<script.*?</script>','',s,flags=re.S); s=re.sub(r'<style.*?</style>','',s,flags=re.S)
s=re.sub(r'<!--.*?-->','',s,flags=re.S)
print(' '.join(html.unescape(re.sub(r'<[^>]+>',' ',s)).split()))"; }

for f in *.html; do
  git show HEAD:$f | limpa > /tmp/a.txt; limpa < $f > /tmp/b.txt
  cmp -s /tmp/a.txt /tmp/b.txt && echo "✓ $f" || echo "✖ $f"
done
```

## 2. Geometria renderizada idêntica

Texto igual não garante layout igual. Carregue a versão antiga e a nova em
dois iframes da mesma largura e compare `getBoundingClientRect` dos blocos
principais. **Em 1440px e em 375px.** Foi assim que apareceu que a foto do
topo tinha parado de carregar: o texto estava perfeito.

**Duas armadilhas dessa medição** (as duas custaram tempo na Etapa 3):

- Os dois iframes precisam vir do **mesmo servidor**. Portas diferentes são origens
  diferentes, e `contentDocument` volta `null` sem erro nenhum: o resultado parece "tudo
  mudou". Sirva uma pasta só, com `antes/` e um link simbólico `depois/` pro repositório.
- Não confie no `onload` do iframe. As páginas puxam fonte e ícone de CDN, e se a rede
  estiver ruim o evento pode nunca chegar. Meça por `setTimeout` de uns 3 segundos.

## 2b. Contraste do texto sobre foto (`medir-hero.html`)

Abra `build/dev/medir-hero.html` pelo servidor local e rode `window.medir()`
no console. Ele percorre as páginas com hero de foto em 7 larguras e devolve,
em `window.RESULTADO`, as **linhas reais** de texto (`Range.getClientRects`,
não a caixa do elemento) mais o `background-image` já resolvido pelo Chrome.
Quem calcula é um script Python que compõe a foto com os gradientes e tira o
p99 mais claro do fundo sob cada linha.

Três armadilhas, todas já custaram tempo:

- **Aba escondida trava a medição.** Depois de 5 minutos em segundo plano o
  Chrome joga o `setTimeout` pra 1x por minuto e a varredura para no meio sem
  erro nenhum. Por isso a espera é curta e existe `window.PROGRESSO`.
- **`background-position` e `background-size` vêm com um valor por camada**
  ("cover, cover, cover"). A foto é a última, então é a última vírgula que vale.
- **Medir a caixa da linha inteira reprova de mentira**, porque a entrelinha
  entra na conta. Só o miolo (60% central) é onde o glifo encosta.

## 3. Build idempotente

Rodar duas vezes seguidas: a segunda tem que escrever **0 arquivos**. Se
escrever, tem algo não determinístico (data, ordem instável) e o robô vai
ficar commitando sozinho pra sempre.

## 4. Os quatro cenários, com o `servidor-falso.mjs`

| Cenário | Como | Resultado esperado |
|---|---|---|
| Conteúdo atual | normal | site idêntico ao que está no ar |
| Item novo | acrescentar uma linha no JSON | aparece em **todos** os lugares |
| Item despublicado | mudar `status` no JSON | some de todos, e a página órfã é apagada |
| Tabela vazia | `VAZIO=formacoes` | build **não mexe em nada**, avisa no log |
| Tabela inexistente | `AUSENTE=formacoes` | build **não mexe em nada**, avisa no log |

Os dois últimos são os que mais importam: são o que impede o site de perder
menu, rodapé e catálogo de uma vez.

## 4b. O painel mora numa subpasta

Foto cadastrada pelo seed tem caminho relativo à raiz do site
(`assets/images/fundadores/fulano.jpg`), porque é de lá que as páginas a enxergam. O painel
está em `/painel/`, então o mesmo caminho aponta pra `painel/assets/...` e a foto some **só no
painel**. É invisível no build e no site: só aparece abrindo a lista do painel. Existe o
`interno.fotoNoPainel()` pra isso; use ele em toda foto desenhada dentro do painel.

## 5. Ida e volta do formulário

Se o painel converte lista em texto e de volta, teste com os **dados reais**
que `de(para(x)) === x`. Abrir um item e salvar sem mexer em nada não pode
alterar o conteúdo. Na 2b foram 59 casos, incluindo entradas malformadas.

## 6. Injeção

Cadastre um item com `<script>alert(1)</script>`, aspas e `$'` no título e
no resumo. Confira que sai escapado no HTML, escapado no JSON-LD (que tem
que continuar sendo JSON válido) e que nenhum marcador `{{...}}` vaza.

O `$'` não é paranoia: o escape de HTML transforma `'` em `&#39;`, e
`replaceAll` com string trata `$&` como especial.
