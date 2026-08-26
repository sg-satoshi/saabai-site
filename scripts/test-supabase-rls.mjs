import { createHmac } from 'crypto';
import { readFileSync } from 'fs';

// Load env ourselves from .env.local (deterministic; --env-file flag is flaky here).
const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#') || t.startsWith('export ')) continue;
  const eq = t.indexOf('=');
  if (eq <= 0) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

const url = env.SUPABASE_URL;
const anon = env.SUPABASE_ANON_KEY;
const secret = env.SUPABASE_JWT_SECRET;

if (!url || !anon || !secret) {
  console.error('MISSING ENV: need SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET');
  process.exit(1);
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const now = Math.floor(Date.now() / 1000);

const header = b64({ alg: 'HS256', typ: 'JWT' });
const payload = b64({
  role: 'authenticated',
  tenant_id: 'test-tenant',
  iat: now,
  exp: now + 3600,
});
const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
const jwt = `${header}.${payload}.${sig}`;

const headers = {
  apikey: anon,
  Authorization: `Bearer ${jwt}`,
  'Content-Type': 'application/json',
};

try {
  const r = await fetch(`${url}/rest/v1/tenants?select=id`, { method: 'GET', headers });
  const text = await r.text();
  console.log('STATUS:', r.status);
  console.log('BODY:', text.slice(0, 400));
  if (r.status === 200) {
    console.log('RESULT: PASS');  // token verified, RLS active
  } else if (r.status === 401) {
    console.log('RESULT: FAIL_401');  // JWT not accepted -> legacy secret not trusted
  } else {
    console.log('RESULT: unexpected', r.status);
  }
} catch (e) {
  console.error('REQUEST ERROR:', e.message);
  process.exit(2);
}
