/** Lex thread save guards (#446, QA r1 on #447).  npx tsx --test tests/lex-threads-store.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readStoredThreads, mergeThreads, cleanDeletedIds, interpretThreadsLoad, planThreadsSave } from "../lib/lex-threads-store";

const T = (id: string, title = id) => ({ id, title, messages: [] });

test("corrupt stored threads are an error, a missing key is an empty list", () => {
  assert.deepEqual(readStoredThreads(null), { ok: true, threads: [] });
  assert.deepEqual(readStoredThreads(""), { ok: true, threads: [] });
  assert.deepEqual(readStoredThreads("[object Object]"), { ok: false, error: "threads_corrupt" });
  assert.deepEqual(readStoredThreads({ id: "x" }), { ok: false, error: "threads_corrupt" });
  assert.deepEqual(readStoredThreads('[{"id":"a"}]'), { ok: true, threads: [{ id: "a" }] });
  assert.deepEqual(readStoredThreads([{ id: "a" }]), { ok: true, threads: [{ id: "a" }] });
});

test("a PUT with a shorter or empty list doesn't wipe stored threads", () => {
  const stored = [T("a"), T("b"), T("c")];
  assert.deepEqual(mergeThreads(stored, [], new Set()).map(t => t.id), ["a", "b", "c"]);
  assert.deepEqual(mergeThreads(stored, [T("b", "renamed")], new Set()).map(t => [t.id, t.title]), [["b", "renamed"], ["a", "a"], ["c", "c"]]);
  assert.deepEqual(mergeThreads(stored, [T("new")], new Set()).map(t => t.id), ["new", "a", "b", "c"]);
});

test("explicit deletions still remove threads", () => {
  const stored = [T("a"), T("b"), T("c")];
  assert.deepEqual(mergeThreads(stored, [T("a"), T("c")], cleanDeletedIds(["b"])).map(t => t.id), ["a", "c"]);
  assert.deepEqual(mergeThreads(stored, [], cleanDeletedIds(["a", "b", "c"])), []);
  assert.deepEqual([...cleanDeletedIds(["x", 3, null, ""])], ["x"]);
  assert.equal(cleanDeletedIds("a").size, 0);
});

test("saving after an empty or failed load does nothing", () => {
  const local = [T("stale")];
  for (const [ok, data] of [[false, null], [false, { error: "threads_corrupt" }], [true, null], [true, { error: "x" }], [true, { threads: "nope" }]] as const) {
    const load = interpretThreadsLoad(ok, data);
    assert.equal(load.loaded, false);
    assert.equal(planThreadsSave({ loaded: load.loaded, userEmail: "a@firm.au", threads: local, deletedIds: [] }), null);
  }
  // Slow load: nothing has loaded yet, so no save.
  assert.equal(planThreadsSave({ loaded: false, userEmail: "a@firm.au", threads: [], deletedIds: [] }), null);
  // A 200 with an empty list is a real load, and saving is then allowed (the server merges, so it can't wipe).
  const empty = interpretThreadsLoad(true, { threads: [] });
  assert.equal(empty.loaded, true);
  assert.deepEqual(JSON.parse(planThreadsSave({ loaded: true, userEmail: "a@firm.au", threads: [], deletedIds: ["d"] })!), { threads: [], deletedIds: ["d"] });
  assert.equal(planThreadsSave({ loaded: true, userEmail: null, threads: [], deletedIds: [] }), null);
});

test("route and page wire in the guards", () => {
  const route = readFileSync("app/api/lex-threads/route.ts", "utf8");
  assert.match(route, /readStoredThreads/);
  assert.match(route, /status: 500/);
  assert.match(route, /mergeThreads\(/);
  assert.doesNotMatch(route, /return Response\.json\(\{ threads: \[\] \}\);\s*\n\s*\}\s*\n\}/);
  const page = readFileSync("app/lex/page.tsx", "utf8");
  assert.match(page, /planThreadsSave\(\{ loaded: threadsLoaded/);
  assert.match(page, /setThreadsLoaded\(true\)/);
  assert.match(page, /deletedThreadIdsRef\.current\.add\(id\)/);
});
