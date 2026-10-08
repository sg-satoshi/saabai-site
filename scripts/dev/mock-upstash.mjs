#!/usr/bin/env node
/**
 * DEV/TEST ONLY: a tiny in-memory stand-in for the Upstash Redis REST API, so
 * the app and tests can run locally without real credentials.
 *
 *   node scripts/dev/mock-upstash.mjs [port]      (default 8079)
 *   UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079 UPSTASH_REDIS_REST_TOKEN=dev
 *
 * Supports the commands the client portal uses plus common ones (strings,
 * hashes, incr/expire, sets, lists, keys/scan). Unknown commands return null.
 * Optional seed: MOCK_UPSTASH_SEED=/path/seed.json  ({ hashes: {key: {field: value}}, strings: {key: value} })
 */
import http from "node:http";
import fs from "node:fs";

export function createMockUpstash() {
  const strings = new Map();
  const hashes = new Map();
  const sets = new Map();
  const lists = new Map();
  const expiry = new Map();

  const alive = (k) => {
    const e = expiry.get(k);
    if (e && e <= Date.now()) {
      strings.delete(k); hashes.delete(k); sets.delete(k); lists.delete(k); expiry.delete(k);
    }
  };
  const del = (k) => {
    let n = 0;
    for (const m of [strings, hashes, sets, lists]) if (m.delete(k)) n = 1;
    expiry.delete(k);
    return n;
  };
  const hash = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
  const globRe = (p) => new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
  const allKeys = () => [...new Set([...strings.keys(), ...hashes.keys(), ...sets.keys(), ...lists.keys()])].filter((k) => (alive(k), strings.has(k) || hashes.has(k) || sets.has(k) || lists.has(k)));

  function exec(cmd) {
    const [rawName, ...a] = cmd;
    const name = String(rawName).toUpperCase();
    const args = a.map((x) => (typeof x === "string" ? x : String(x)));
    const k = args[0];
    if (k !== undefined) alive(k);
    switch (name) {
      case "PING": return "PONG";
      case "GET": return strings.get(k) ?? null;
      case "SET": {
        let nx = false, xx = false, ex = null;
        for (let i = 2; i < args.length; i++) {
          const o = args[i].toUpperCase();
          if (o === "NX") nx = true;
          else if (o === "XX") xx = true;
          else if (o === "EX") ex = Number(args[++i]) * 1000;
          else if (o === "PX") ex = Number(args[++i]);
        }
        if (nx && strings.has(k)) return null;
        if (xx && !strings.has(k)) return null;
        del(k);
        strings.set(k, args[1]);
        if (ex) expiry.set(k, Date.now() + ex);
        return "OK";
      }
      case "GETDEL": { const v = strings.get(k) ?? null; if (v !== null) del(k); return v; }
      case "DEL": return args.reduce((n, key) => (alive(key), n + del(key)), 0);
      case "EXISTS": return args.filter((key) => (alive(key), allKeys().includes(key))).length;
      case "INCR": case "INCRBY": {
        const v = Number(strings.get(k) ?? 0) + (name === "INCRBY" ? Number(args[1]) : 1);
        strings.set(k, String(v)); return v;
      }
      case "EXPIRE": if (!allKeys().includes(k)) return 0; expiry.set(k, Date.now() + Number(args[1]) * 1000); return 1;
      case "TTL": { if (!allKeys().includes(k)) return -2; const e = expiry.get(k); return e ? Math.ceil((e - Date.now()) / 1000) : -1; }
      case "HSET": { const h = hash(k); let n = 0; for (let i = 1; i < args.length; i += 2) { if (!h.has(args[i])) n++; h.set(args[i], args[i + 1]); } return n; }
      case "HGET": return hashes.get(k)?.get(args[1]) ?? null;
      case "HDEL": { const h = hashes.get(k); if (!h) return 0; let n = 0; for (const f of args.slice(1)) if (h.delete(f)) n++; return n; }
      case "HGETALL": { const h = hashes.get(k); if (!h) return []; return [...h.entries()].flat(); }
      case "HKEYS": return [...(hashes.get(k)?.keys() ?? [])];
      case "HVALS": return [...(hashes.get(k)?.values() ?? [])];
      case "HLEN": return hashes.get(k)?.size ?? 0;
      case "HEXISTS": return hashes.get(k)?.has(args[1]) ? 1 : 0;
      case "SADD": { if (!sets.has(k)) sets.set(k, new Set()); const s = sets.get(k); let n = 0; for (const m of args.slice(1)) if (!s.has(m)) { s.add(m); n++; } return n; }
      case "SMEMBERS": return [...(sets.get(k) ?? [])];
      case "SREM": { const s = sets.get(k); if (!s) return 0; let n = 0; for (const m of args.slice(1)) if (s.delete(m)) n++; return n; }
      case "LPUSH": case "RPUSH": { if (!lists.has(k)) lists.set(k, []); const l = lists.get(k); const v = args.slice(1); if (name === "LPUSH") l.unshift(...v.reverse()); else l.push(...v); return l.length; }
      case "LRANGE": { const l = lists.get(k) ?? []; const s = Number(args[1]); let e = Number(args[2]); if (e < 0) e = l.length + e; return l.slice(s, e + 1); }
      case "LLEN": return lists.get(k)?.length ?? 0;
      case "KEYS": return allKeys().filter((x) => globRe(k).test(x));
      case "SCAN": {
        let match = "*";
        for (let i = 1; i < args.length; i++) if (args[i].toUpperCase() === "MATCH") match = args[++i];
        return ["0", allKeys().filter((x) => globRe(match).test(x))];
      }
      default:
        if (process.env.MOCK_UPSTASH_VERBOSE) console.warn("[mock-upstash] unsupported command", name);
        return null;
    }
  }

  function seed(data) {
    for (const [key, fields] of Object.entries(data.hashes ?? {})) {
      const h = hash(key);
      for (const [f, v] of Object.entries(fields)) h.set(f, typeof v === "string" ? v : JSON.stringify(v));
    }
    for (const [key, v] of Object.entries(data.strings ?? {})) strings.set(key, typeof v === "string" ? v : JSON.stringify(v));
  }

  const enc = (v, b64) => {
    if (!b64) return v;
    if (typeof v === "string") return v === "OK" ? v : Buffer.from(v, "utf8").toString("base64");
    if (Array.isArray(v)) return v.map((x) => enc(x, b64));
    return v;
  };

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const b64 = String(req.headers["upstash-encoding"] || "").toLowerCase() === "base64";
      res.setHeader("content-type", "application/json");
      try {
        const parsed = body ? JSON.parse(body) : [];
        const path = (req.url || "/").split("?")[0];
        if (path.endsWith("/pipeline") || path.endsWith("/multi-exec")) {
          res.end(JSON.stringify(parsed.map((c) => ({ result: enc(exec(c), b64) }))));
        } else {
          res.end(JSON.stringify({ result: enc(exec(parsed), b64) }));
        }
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: String(e?.message || e) }));
      }
    });
  });

  return { server, exec, seed, reset: () => { strings.clear(); hashes.clear(); sets.clear(); lists.clear(); expiry.clear(); } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || 8079);
  const mock = createMockUpstash();
  if (process.env.MOCK_UPSTASH_SEED) mock.seed(JSON.parse(fs.readFileSync(process.env.MOCK_UPSTASH_SEED, "utf8")));
  mock.server.listen(port, "127.0.0.1", () => console.log(`[mock-upstash] listening on http://127.0.0.1:${port}`));
}
