/** parseRedisJson: Upstash may return objects or strings.  npx tsx --test tests/redis-json.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRedisJson } from "../lib/redis-json";

test("objects pass through, strings parse, junk is null", () => {
  const arr = [{ id: "t1" }];
  assert.equal(parseRedisJson(arr), arr);
  assert.deepEqual(parseRedisJson('[{"id":"t1"}]'), arr);
  assert.equal(parseRedisJson("[object Object]"), null);
  assert.equal(parseRedisJson(null), null);
  assert.equal(parseRedisJson(""), null);
  assert.equal(parseRedisJson(42), null);
});

test("Lex Redis reads use parseRedisJson, not a bare JSON.parse", () => {
  for (const f of ["app/api/lex-threads/route.ts", "lib/lex-audit.ts", "app/api/lex-help/route.ts"]) {
    const s = readFileSync(f, "utf8");
    assert.ok(s.includes("parseRedisJson"), f);
  }
  assert.doesNotMatch(readFileSync("app/api/lex-threads/route.ts", "utf8"), /JSON\.parse\(raw\)/);
});
