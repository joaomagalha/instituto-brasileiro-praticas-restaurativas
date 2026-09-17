#!/usr/bin/env python3
"""Gera o placeholder (LQIP) de cada foto de hero: miniatura de 32 px de
largura, JPEG, em base64, gravada em build/lqip.json.

Por quê: a foto do hero é background-image em CSS, e o navegador só a pede
depois de baixar o CSS e montar o layout. Enquanto isso o visitante via o
gradiente azul. A miniatura (~1 KB) vai embutida no HTML e aparece no
mesmo instante que o azul apareceria, já com as cores e a forma da cena.

Rodar de novo sempre que trocar uma foto de hero:
    python3 build/dev/lqip.py
Depois, colar o data URI novo no `--hero-lqip` da página (as formações
pegam do JSON pelo build)."""
import base64, io, json, os, sys
from PIL import Image

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FOTOS = [
    'assets/images/formacoes/formacoes-hero.jpg',
    'assets/images/formacoes/ambiente-escolar.jpg',
    'assets/images/formacoes/execucao-penal.jpg',
    'assets/images/formacoes/pena-justa.jpg',
    'assets/images/formacoes/relacoes-trabalho.jpg',
    'assets/images/como-atuamos-hero.jpg',
    'assets/images/o-instituto-hero.jpg',
    'assets/images/praticas-restaurativas-hero.jpg',
    'assets/images/ibpr-movimento-hero.jpg',
]
LARGURA = 32

def lqip(caminho):
    im = Image.open(os.path.join(RAIZ, caminho)).convert('RGB')
    im.thumbnail((LARGURA, LARGURA * 4))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=55, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')

saida = {c: lqip(c) for c in FOTOS}
destino = os.path.join(RAIZ, 'build', 'lqip.json')
with open(destino, 'w', encoding='utf-8') as f:
    json.dump(saida, f, indent=2)
for c, d in saida.items():
    print(f'{len(d):5d} bytes  {c}')
print('->', os.path.relpath(destino, RAIZ))
