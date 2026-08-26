import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ---- load .env.local ----
const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#') || t.startsWith('export ')) continue;
  const eq = t.indexOf('=');
  if (eq <= 0) continue;
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, eq).trim()] = v;
}
const url = env.SUPABASE_URL, secret = env.SUPABASE_SERVICE_ROLE_KEY, oai = env.OPENAI_API_KEY;
if (!url || !secret || !oai) { console.error('MISSING ENV (need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY)'); process.exit(1); }

const supabase = createClient(url, secret, { auth: { persistSession: false } }); // service_role -> bypass RLS

const TENANT = 'test-tenant';
const TEST_URL = 'https://en.wikipedia.org/wiki/Polyethylene';
const EMBED_MODEL = 'text-embedding-3-small';

function makeId(p) { return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}
function chunkText(text, chunkChars = 2000, overlap = 200) {
  const words = text.split(/\s+/); const chunks = []; let cur = [], len = 0;
  for (const w of words) {
    if (len + w.length + 1 > chunkChars && cur.length) {
      chunks.push(cur.join(' '));
      const tail = cur.slice(-Math.ceil(overlap / 6)).join(' ');
      cur = tail ? tail.split(' ') : []; len = cur.join(' ').length;
    }
    cur.push(w); len += w.length + 1;
  }
  if (cur.length) chunks.push(cur.join(' '));
  return chunks.filter((c) => c.length > 40);
}

// ---- 1) seed tenant (upsert) ----
let { error } = await supabase.from('tenants').upsert({
  id: TENANT, slug: TENANT, name: 'Test Tenant (ingest)', vertical: 'plastics', plan: 'free', status: 'active',
}, { onConflict: 'id' });
if (error) { console.error('SEED TENANT ERR:', error.message); process.exit(1); }

// ---- 2) seed knowledge_source ----
const sourceId = makeId('src');
({ error } = await supabase.from('knowledge_sources').insert({
  id: sourceId, tenant_id: TENANT, type: 'site', url: TEST_URL, title: 'Polyethylene', status: 'ready', chunk_count: 0,
}));
if (error) { console.error('SEED SOURCE ERR:', error.message); process.exit(1); }

// ---- 3) fetch + extract + chunk ----
const res = await fetch(TEST_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaabaiAgent/1.0)' } });
if (!res.ok) { console.error('FETCH ERR:', res.status); process.exit(1); }
const text = htmlToText(await res.text());
const chunks = chunkText(text);
console.log('chunks:', chunks.length, '| chars:', text.length);

// ---- 4) embed ----
const emb = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${oai}` },
  body: JSON.stringify({ model: EMBED_MODEL, dimensions: 1536, input: chunks }),
});
if (!emb.ok) { console.error('EMBED ERR:', emb.status, await emb.text()); process.exit(1); }
const { data: embData } = await emb.json();
console.log('embedded:', embData.length);

// ---- 5) insert chunks ----
const rows = chunks.map((c, i) => ({
  id: makeId('chunk'), tenant_id: TENANT, source_id: sourceId, content: c,
  embedding: embData[i].embedding, meta: { url: TEST_URL, title: 'Polyethylene' },
}));
({ error } = await supabase.from('knowledge_chunks').insert(rows));
if (error) { console.error('INSERT CHUNKS ERR:', error.message); process.exit(1); }
console.log('inserted chunks:', rows.length);

// ---- 6) verify ----
const { data: check, error: cerr } = await supabase.from('knowledge_chunks')
  .select('id, tenant_id, source_id')
  .eq('tenant_id', TENANT);
if (cerr) { console.error('VERIFY ERR:', cerr.message); process.exit(1); }
console.log('VERIFY: knowledge_chunks rows for tenant:', check.length);
console.log('RESULT:', check.length > 0 ? 'PASS' : 'FAIL');
