#!/usr/bin/env python3
"""
Monta o seed dos 3 primeiros artigos (17/09/2026) a partir dos arquivos que
o Dr. Decildo mandou no grupo em 16/09, guardados no vault em
projetos/instituto-brasileiro-praticas-restaurativas/recebidos/2026-09-16-artigos-decildo/.

Gera:
  - build/dev/dados/artigos.json   (pro servidor falso; fora do git)
  - supabase/11b-artigos-seed.sql  (pra rodar no Supabase)

Uso, na pasta site/:  python3 build/dev/seed-artigos-2026-09-17.py
Depende de build/dev/docx-para-artigo.py e do pdftotext (poppler).
"""
import json, re, subprocess, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from importlib import import_module
conv = import_module('docx-para-artigo')

R = '../recebidos/2026-09-16-artigos-decildo'
meta_a, acend = conv.converter(f'{R}/decildo-maxuel-acendedor-de-lampioes-pl-3890-2024.docx')
meta_c, cam = conv.converter(f'{R}/decildo-maxuel-caminhos-praticos-jr-sistema-penal.docx')

# Acendedor: diálogo do Pequeno Príncipe vira citação em bloco; a 1ª seção
# (sem número no Word) ganha "1." pra acompanhar as seções 2. e 3.
dial = re.search(r'(- Antigamente.*?uma vez por minuto!)\n', acend, flags=re.S).group(1)
linhas = [l.strip() for l in dial.split('\n') if l.strip()]
acend = acend.replace(dial, '\n'.join('> ' + l for l in linhas))
assert acend.count('## O Acendedor de Lampiões como Metáfora do Descompasso Normativo') == 1, 'título da seção 1 sumiu na conversão'
acend = acend.replace('## O Acendedor de Lampiões como Metáfora do Descompasso Normativo',
                      '## 1. O Acendedor de Lampiões como Metáfora do Descompasso Normativo')
assert acend.count('> - Antigamente') == 1

DEC = ['Mestre em Direito e Políticas Públicas pela Universidade Federal de Goiás (2019).',
       'Doutorando em Direito pelo Instituto Brasileiro de Ensino, Desenvolvimento e Pesquisa, IDP (2023-2026).',
       'Visiting Researcher na Australian National University (PDSE/CAPES 2025-2026).',
       'Juiz de Direito do Tribunal de Justiça do Estado de Goiás.']
MAX = ['Defensor Público do Estado de Mato Grosso.',
       'Especialista em Criminologia e Direito da Execução Penal.',
       'Coautor do livro Justiça Restaurativa na Execução Penal: um manual para aplicação da JR em unidades prisionais (Paulus, 2023).']
DEC2021 = ['Mestre em Direito e Políticas Públicas pela Universidade Federal de Goiás (2019).',
           'Especialista em Direito Penal Contemporâneo e Sistema Prisional pela Escola Nacional da Magistratura (2022).',
           'Doutorando em Direito pelo Instituto Brasileiro de Ensino, Desenvolvimento e Pesquisa (IDP).',
           'Juiz de Direito e Coordenador do Núcleo de Justiça Restaurativa no Tribunal de Justiça do Estado de Goiás.']

pdf = f'{R}/decildo-2021-jr-circulos-paz-unidades-prisionais-rejub.pdf'
t = subprocess.run(['pdftotext', '-f', '1', '-l', '3', pdf, '-'], capture_output=True, text=True).stdout
t = re.sub(r'\n(?=[a-záéíóúçã])', ' ', t)
i = t.find('RESUMO'); j = t.find('Palavras-chave')
resumo_rejub = re.sub(r'\s+', ' ', t[i + 6:j]).strip()
resumo_rejub = resumo_rejub.replace('ReJuB - Rev. Jud. Bras., Brasília, Ano 1, sup. esp., p. 293 - 329, jul./dez. 2021 293 DECILDO FERREIRA LOPES ', '')
assert 'DECILDO' not in resumo_rejub

artigos = [
    dict(titulo='O Acendedor de Lampiões e o Legislador Penal',
         subtitulo='Uma Análise Crítica da Justiça Restaurativa no PL nº 3.890/2024 (Estatuto da Vítima)',
         slug='acendedor-de-lampioes-e-o-legislador-penal',
         autores=[{'nome': 'Decildo Ferreira Lopes', 'credenciais': DEC}, {'nome': 'Maxuel Pereira Dias', 'credenciais': MAX}],
         resumo=meta_a['resumo'], palavras_chave=meta_a['palavras'], corpo=acend,
         pdf_url=None, doi=None, publicacao_nome=None, publicacao_url=None, imagem_url=None, imagem_alt=None,
         status='publicado', publicado_em='2026-09-17T12:00:00+00:00'),
    dict(titulo='Caminhos práticos para aplicação da Justiça Restaurativa',
         subtitulo='Possibilidades reais no sistema penal brasileiro',
         slug='caminhos-praticos-para-aplicacao-da-justica-restaurativa',
         autores=[{'nome': 'Decildo Ferreira Lopes', 'credenciais': DEC}, {'nome': 'Maxuel Pereira Dias', 'credenciais': MAX}],
         # o Word não tem resumo nem palavras-chave: o resumo do card é o 1º parágrafo (pedir os dois ao autor)
         resumo=cam.split('\n\n')[0], palavras_chave=[], corpo=cam,
         pdf_url=None, doi=None, publicacao_nome=None, publicacao_url=None, imagem_url=None, imagem_alt=None,
         status='publicado', publicado_em='2026-09-16T12:00:00+00:00'),
    dict(titulo='Justiça Restaurativa como instrumento para construção de uma nova cultura no espaço prisional',
         subtitulo='Estudo da aplicação de círculos de construção de paz em unidades prisionais',
         slug='justica-restaurativa-nova-cultura-no-espaco-prisional',
         autores=[{'nome': 'Decildo Ferreira Lopes', 'credenciais': DEC2021}],
         resumo=resumo_rejub,
         palavras_chave=['justiça restaurativa', 'sistema prisional', 'círculos de construção de paz', 'estudo de caso'],
         corpo='', pdf_url='assets/docs/lopes-2021-justica-restaurativa-espaco-prisional-rejub.pdf',
         doi='10.54795/RejuBespecial.SisPri.202',
         publicacao_nome='ReJuB, Revista Judicial Brasileira, ano 1, sup. esp., p. 293-329, jul./dez. 2021',
         publicacao_url='https://doi.org/10.54795/RejuBespecial.SisPri.202',
         imagem_url=None, imagem_alt=None, status='publicado', publicado_em='2021-12-01T12:00:00+00:00'),
]
os.makedirs('build/dev/dados', exist_ok=True)
json.dump(artigos, open('build/dev/dados/artigos.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)

def q(v):
    if v is None: return 'null'
    if isinstance(v, (list, dict)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"
cols = ['titulo', 'subtitulo', 'slug', 'autores', 'resumo', 'palavras_chave', 'corpo', 'pdf_url', 'doi', 'publicacao_nome', 'publicacao_url', 'status', 'publicado_em']
linhas = ['  (' + ', '.join(q(a[c]) for c in cols) + ')' for a in artigos]
sql = '''-- =====================================================================
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
''' + ',\n'.join(linhas) + '''
on conflict (slug) do nothing;

-- Conferência: deve devolver 3 linhas.
-- select slug, status, publicado_em, length(corpo) from public.artigos order by publicado_em desc;
'''
open('supabase/11b-artigos-seed.sql', 'w', encoding='utf8').write(sql)
print('ok:', len(artigos), 'artigos |', len(sql), 'chars de SQL')
