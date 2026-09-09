/* =====================================================================
   Servidor falso do Supabase — ferramenta de teste do build
   =====================================================================
   Responde igual à API REST do Supabase, lendo de arquivos JSON locais.
   Serve pra testar o `gerar.mjs` sem depender do banco e, principalmente,
   pra simular cenários que no banco de verdade seriam perigosos ou
   trabalhosos de montar.

   COMO USAR

     1. baixar o conteúdo real do banco pros arquivos locais (uma vez):
          node build/dev/servidor-falso.mjs --baixar

     2. subir o servidor:
          node build/dev/servidor-falso.mjs 8799

     3. em OUTRO terminal, apontar o build pra ele:
          - editar `url` em assets/js/supabase-config.js pra
            http://127.0.0.1:8799
          - rodar `node build/gerar.mjs`
          - ⚠️ DESFAZER a edição do config depois (git checkout --)

   CENÁRIOS (variáveis de ambiente)

     VAZIO=formacoes      a tabela existe mas não tem nada publicado
     AUSENTE=formacoes    a tabela não existe (404), como antes de rodar o SQL

   Os dois têm que resultar em "o build não mexe em nada". Essa é a trava
   mais importante do CMS: gerar listas vazias apagaria menu, rodapé e
   catálogo de uma vez.

   Zero dependências, de propósito: uma a menos pra quebrar.
   ===================================================================== */

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const RAIZ = path.resolve(AQUI, '../..');
const DADOS = path.join(AQUI, 'dados');

/* As tabelas que o build consulta. Acrescentar aqui a cada etapa nova. */
const TABELAS = ['formacoes', 'pessoas', 'noticias'];

async function config() {
  const txt = await readFile(path.join(RAIZ, 'assets/js/supabase-config.js'), 'utf8');
  return {
    url: txt.match(/url:\s*'([^']+)'/)?.[1],
    chave: txt.match(/anonKey:\s*'([^']+)'/)?.[1]
  };
}

/* --baixar: puxa o conteúdo real do banco pros arquivos locais. */
if (process.argv.includes('--baixar')) {
  const { url, chave } = await config();
  if (url.includes('127.0.0.1')) {
    console.error('✖ O supabase-config.js está apontando pro servidor falso. Desfaça antes de baixar.');
    process.exit(1);
  }
  await mkdir(DADOS, { recursive: true });

  for (const t of TABELAS) {
    const r = await fetch(`${url}/rest/v1/${t}?select=*`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` }
    });
    if (!r.ok) { console.log(`  ${t}: ${r.status}, pulando`); continue; }
    const linhas = await r.json();
    await writeFile(path.join(DADOS, `${t}.json`), JSON.stringify(linhas, null, 2));
    console.log(`  ${t}: ${linhas.length} linha(s) salvas`);
  }
  console.log(`\nArquivos em ${DADOS} (fora do git).`);
  process.exit(0);
}

/* --- servidor ------------------------------------------------------- */
const PORTA = Number(process.argv.find(a => /^\d+$/.test(a)) || 8799);
const VAZIO = (process.env.VAZIO || '').split(',').filter(Boolean);
const AUSENTE = (process.env.AUSENTE || '').split(',').filter(Boolean);

if (!existsSync(DADOS)) {
  console.error(`✖ Não achei ${DADOS}. Rode antes: node build/dev/servidor-falso.mjs --baixar`);
  process.exit(1);
}

createServer(async (req, res) => {
  const tabela = req.url.split('?')[0].split('/').pop();

  if (AUSENTE.includes(tabela)) {           // simula tabela não criada
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ code: 'PGRST205', message: `Could not find the table 'public.${tabela}'` }));
  }

  const arq = path.join(DADOS, `${tabela}.json`);
  if (!existsSync(arq)) { res.writeHead(404); return res.end('{}'); }

  let linhas = JSON.parse(await readFile(arq, 'utf8'));
  if (VAZIO.includes(tabela)) linhas = [];

  /* O build sempre pede status=eq.publicado; respeitar isso é o que faz o
     teste de "despublicar" valer alguma coisa. */
  if (req.url.includes('status=eq.publicado')) {
    linhas = linhas.filter(l => l.status === 'publicado');
  }
  /* O build pede "order=ordem.asc,<campo>.asc" (titulo nas formações, nome
     nas pessoas). Ler o 2º campo da própria URL evita ter que lembrar
     deste arquivo a cada etapa nova. */
  const ordenar = req.url.match(/order=ordem\.asc(?:,([a-z_]+)\.asc)?/);
  if (ordenar) {
    const segundo = ordenar[1];
    linhas.sort((a, b) => (a.ordem - b.ordem) ||
      (segundo ? String(a[segundo]).localeCompare(String(b[segundo])) : 0));
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(linhas));
}).listen(PORTA, '127.0.0.1', async () => {
  const arqs = (await readdir(DADOS)).filter(f => f.endsWith('.json'));
  console.log(`Supabase falso em http://127.0.0.1:${PORTA}`);
  console.log(`  tabelas: ${arqs.map(a => a.replace('.json', '')).join(', ')}`);
  if (VAZIO.length)   console.log(`  VAZIO:   ${VAZIO.join(', ')}`);
  if (AUSENTE.length) console.log(`  AUSENTE: ${AUSENTE.join(', ')}`);
});
