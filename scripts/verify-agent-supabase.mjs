import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { readFileSync } from 'fs';

// Load env from .env.local
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
const url = env.SUPABASE_URL, anon = env.SUPABASE_ANON_KEY, secret = env.SUPABASE_JWT_SECRET;
if (!url || !anon || !secret) { console.error('MISSING ENV'); process.exit(1); }

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const h = b64({ alg: 'HS256', typ: 'JWT' });
const p = b64({ role: 'authenticated', tenant_id: 'test-tenant', iat: now, exp: now + 3600 });
const jwt = `${h}.${p}.${createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`;

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
  accessToken: async () => jwt,
});

const { data, error } = await supabase.from('tenants').select('id').limit(1);
if (error) {
  console.log('ERROR:', error.status ?? error.message, JSON.stringify(error));
  console.log('RESULT: FAIL');
  process.exit(1);
}
console.log('DATA:', JSON.stringify(data));
console.log('RESULT: PASS');  // supabase-js + minted token hit RLS (returned [] for test-tenant)
