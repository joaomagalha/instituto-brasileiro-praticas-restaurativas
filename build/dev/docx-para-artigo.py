#!/usr/bin/env python3
"""
Converte um artigo em .docx pra marcação leve do CMS de artigos do IBPR.

Uso:
    python3 build/dev/docx-para-artigo.py caminho/artigo.docx > corpo.md

Regras (as mesmas que o painel explica):
  - parágrafo curto (≤ 110 caracteres) todo em negrito, ou que começa com
    "N." / "N.N" seguido de texto, vira seção: "## " (N.) ou "### " (N.N)
  - itálico vira *itálico*, negrito dentro de parágrafo vira **negrito**
  - referência de nota de rodapé vira [n]; as notas viram a seção "## Notas"
    no fim, uma por linha, "n. texto"
  - linhas que começam com travessão/hífen de diálogo ficam como estão
  - "Resumo:" e "Palavras-chave:" NÃO entram no corpo: saem em stderr pra
    você copiar pros campos próprios (idem título e autores do cabeçalho)

Zero dependências além da biblioteca padrão. Confira o resultado a olho:
o Word não marca "isto é um título", a heurística é por negrito e número.
"""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{%s}' % NS['w']


def runs_de(par, notas_idx):
    """Devolve lista de (texto, negrito, italico) por run, com [n] nas notas."""
    saida = []
    for run in par.iter(W + 'r'):
        rpr = run.find(W + 'rPr')
        neg = ita = False
        if rpr is not None:
            b = rpr.find(W + 'b'); i = rpr.find(W + 'i')
            neg = b is not None and b.get(W + 'val') not in ('0', 'false')
            ita = i is not None and i.get(W + 'val') not in ('0', 'false')
        for filho in run:
            tag = filho.tag
            if tag == W + 't':
                saida.append((filho.text or '', neg, ita))
            elif tag == W + 'tab':
                saida.append((' ', neg, ita))
            elif tag == W + 'br':
                saida.append(('\n', neg, ita))
            elif tag == W + 'footnoteReference':
                fid = filho.get(W + 'id')
                if fid not in notas_idx:
                    notas_idx[fid] = len(notas_idx) + 1
                saida.append(('[%d]' % notas_idx[fid], False, False))
    return saida


def montar(runs):
    """Junta runs em texto com *itálico* e **negrito**, fundindo runs iguais."""
    partes = []
    for texto, neg, ita in runs:
        if not texto:
            continue
        if partes and partes[-1][1] == neg and partes[-1][2] == ita:
            partes[-1] = (partes[-1][0] + texto, neg, ita)
        else:
            partes.append((texto, neg, ita))
    out = ''
    for texto, neg, ita in partes:
        if not texto.strip():
            out += texto
            continue
        # espaço fora da marca, senão *texto *seguinte quebra
        ini = len(texto) - len(texto.lstrip()); fim = len(texto) - len(texto.rstrip())
        miolo = texto.strip()
        if ita and neg:
            miolo = '***%s***' % miolo
        elif ita:
            miolo = '*%s*' % miolo
        elif neg:
            miolo = '**%s**' % miolo
        out += texto[:ini] + miolo + (texto[len(texto) - fim:] if fim else '')
    return out.strip()


def todo_negrito(runs):
    com_texto = [(t, n) for t, n, _ in runs if t.strip()]
    return bool(com_texto) and all(n for _, n in com_texto)


def texto_puro(runs):
    return ''.join(t for t, _, _ in runs).strip()


def converter(caminho):
    z = zipfile.ZipFile(caminho)
    doc = ET.fromstring(z.read('word/document.xml'))
    notas_idx = {}
    blocos = []
    meta = {'cabecalho': [], 'resumo': None, 'palavras': None}
    corpo_comecou = False

    for par in doc.iter(W + 'p'):
        runs = runs_de(par, notas_idx)
        puro = texto_puro(runs)
        if not puro:
            continue

        # Resumo / palavras-chave saem do corpo e vão pros campos.
        m = re.match(r'^(resumo|abstract)\s*:\s*(.+)$', puro, flags=re.I | re.S)
        if m and meta['resumo'] is None:
            meta['resumo'] = m.group(2).strip(); continue
        m = re.match(r'^(palavras[- ]chave|keywords)\s*:\s*(.+)$', puro, flags=re.I | re.S)
        if m and meta['palavras'] is None:
            sep = ';' if ';' in m.group(2) else '.'
            meta['palavras'] = [p.strip(' .;') for p in m.group(2).split(sep) if p.strip(' .;')]
            continue

        # Cabeçalho (título, autores, credenciais): tudo antes do 1º parágrafo
        # longo (> 200 caracteres) que não é título.
        if not corpo_comecou:
            if len(puro) > 200 and not re.search(r'Mestre|Doutor|Universidade|Juiz|Defensor|Especialista|Coautor|Pesquisador|Researcher', puro):
                corpo_comecou = True
            else:
                meta['cabecalho'].append(puro); continue

        m_num = re.match(r'^\s*(\d+(?:\.\d+)*)\.?\s+(.+)$', puro)
        curto = len(puro) <= 110
        if curto and m_num and (todo_negrito(runs) or len(m_num.group(1).split('.')) <= 2):
            nivel = '###' if '.' in m_num.group(1) else '##'
            num = m_num.group(1) + ('.' if '.' not in m_num.group(1) else '')
            blocos.append('%s %s %s' % (nivel, num, m_num.group(2).strip()))
            continue
        if curto and todo_negrito(runs):
            blocos.append('## ' + puro)
            continue

        blocos.append(montar(runs))

    # Notas de rodapé
    if notas_idx and 'word/footnotes.xml' in z.namelist():
        fn = ET.fromstring(z.read('word/footnotes.xml'))
        textos = {}
        for nota in fn.iter(W + 'footnote'):
            fid = nota.get(W + 'id')
            if fid not in notas_idx:
                continue
            partes = []
            for par in nota.iter(W + 'p'):
                t = montar(runs_de(par, {}))
                if t:
                    partes.append(t)
            textos[notas_idx[fid]] = ' '.join(partes).strip()
        if textos:
            blocos.append('## Notas')
            blocos.append('\n'.join('%d. %s' % (n, textos[n]) for n in sorted(textos)))

    return meta, '\n\n'.join(blocos)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    meta, corpo = converter(sys.argv[1])
    print(corpo)
    sys.stderr.write('\n--- CABEÇALHO (título, autores, credenciais) ---\n' + '\n'.join(meta['cabecalho']) + '\n')
    sys.stderr.write('\n--- RESUMO ---\n%s\n' % (meta['resumo'] or '(não achei "Resumo:")'))
    sys.stderr.write('\n--- PALAVRAS-CHAVE ---\n%s\n' % (meta['palavras'] or '(não achei "Palavras-chave:")'))
