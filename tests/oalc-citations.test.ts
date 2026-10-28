/**
 * Lex v0 citation index. The fixture is synthetic metadata (no judgment text).
 * The database is the in-memory store loaded from the build script's CSV.
 * Nothing here connects to Postgres or fetches a court site.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkCitation,
  memoryStore,
  toPublicCitation,
  type BuildMeta,
  type CitationStore,
  type StoredCitation,
} from "../lib/oalc-citations";
import {
  CHECK_CITATION_DESCRIPTION,
  INDEX_UNAVAILABLE,
  OALC_CORPUS_VERSION,
  OALC_CUTOFF_LABEL,
  OALC_SOURCE_PANEL,
  SEARCH_FAMILY_LAW_DESCRIPTION,
  normaliseCitation,
} from "../lib/oalc-disclosure";
import { buildLexResearchTools } from "../lib/lex-research-tools";
import { getLexConfig } from "../lib/lex-config";
import { filterToolsByScope } from "../lib/lex-scope";

const FIXTURE = "tests/fixtures/oalc/corpus-sample.jsonl";
const CANARY = "TEXT_FIELD_MUST_NOT_LEAK";
const FCA_2024 = "https://www.judgments.fedcourt.gov.au/judgments/Judgments/fca/single/2024/2024fca0100";
const HCA_ALIAS = "https://eresources.hcourt.gov.au/showCase/1956/HCA/14-early";
const HCA_CANONICAL = "https://eresources.hcourt.gov.au/showCase/1956/HCA/14";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const [header, ...rest] = rows.filter((r) => r.some((c) => c.length));
  return rest.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function buildFixture(extraArgs: string[] = []): { dir: string; stdout: string } {
  const dir = mkdtempSync(join(tmpdir(), "oalc-"));
  const stdout = execFileSync("python3", [
    "scripts/oalc-build-index.py", "build",
    "--corpus", FIXTURE,
    "--out-dir", dir,
    ...extraArgs,
  ], { encoding: "utf8" });
  return { dir, stdout };
}

function loadStore(dir: string) {
  const csv = parseCsv(readFileSync(join(dir, "oalc_citations.csv"), "utf8"));
  const aliases = parseCsv(readFileSync(join(dir, "oalc_citation_aliases.csv"), "utf8"));
  const meta = JSON.parse(readFileSync(join(dir, "oalc_build_meta.json"), "utf8")) as BuildMeta;
  const rows: StoredCitation[] = csv.map((r) => ({
    citation: r.citation,
    source: r.source,
    jurisdiction: r.jurisdiction,
    date: r.date || null,
    date_precision: r.date_precision as StoredCitation["date_precision"],
    url: r.url,
    version_id: r.version_id,
    text: CANARY,
  }));
  return { rows, aliases, meta, store: memoryStore(rows, aliases.map((a) => ({ alias_url: a.alias_url, citation: a.citation })), meta) };
}

const built = buildFixture();
const loaded = loadStore(built.dir);

function found(value: unknown): asserts value is { status: "found"; citation: string; court: string; url: string; dateDisplay: string | null; dateFlagged: boolean; datePrecision: string; mayQuote: boolean; textIncluded: false; acknowledgement: string | null; licence: string; snapshotVersion: string; cutoff: string } {
  assert.equal((value as { status: string }).status, "found");
}

test("build streams the fixture: counts, hash, and no judgment text in the index", () => {
  assert.match(built.stdout, /NSW Caselaw: 16/);
  assert.match(built.stdout, /Federal Court: 11/);
  assert.match(built.stdout, /High Court: 9/);
  assert.match(built.stdout, new RegExp(`corpus_version: ${OALC_CORPUS_VERSION}`));
  assert.match(built.stdout, /corpus_sha256_source: computed/);
  const csv = readFileSync(join(built.dir, "oalc_citations.csv"), "utf8");
  assert.equal(csv.includes(CANARY), false);
  assert.equal(csv.includes("Income Tax Assessment Act"), false);
  assert.equal(csv.includes("[2024] QSC 1"), false);
  assert.equal(csv.includes("FedCFamC1A"), false);
  assert.equal(loaded.meta.corpus_version, OALC_CORPUS_VERSION);
  assert.equal(loaded.meta.cutoff_date, "2025-03-10");
  assert.equal(loaded.rows.length, 36);
});

test("a passed corpus SHA-256 is recorded and the file is not hashed", () => {
  const sentinel = "a".repeat(64);
  const { dir, stdout } = buildFixture(["--corpus-sha256", sentinel]);
  assert.match(stdout, /corpus_sha256_source: flag/);
  assert.match(stdout, new RegExp(`corpus_sha256: ${sentinel}`));
  const meta = JSON.parse(readFileSync(join(dir, "oalc_build_meta.json"), "utf8"));
  assert.equal(meta.corpus_sha256, sentinel);
  assert.notEqual(meta.corpus_sha256, loaded.meta.corpus_sha256);
});

test("load with a database url still does not connect when --confirm-write is omitted", () => {
  let stderr = "";
  let code = 0;
  try {
    execFileSync("python3", ["scripts/oalc-build-index.py", "load", "--out-dir", built.dir], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: "postgres://must-not-be-used.example/db" },
    });
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    code = e.status ?? 0;
    stderr = e.stderr ?? "";
  }
  assert.equal(code, 2);
  assert.match(stderr, /Refusing to write/);
  assert.doesNotMatch(stderr, /could not connect|connection refused|psycopg/i);
});

test("confirmed load without DATABASE_URL does not connect", () => {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  let code = 0;
  let stderr = "";
  try {
    execFileSync("python3", ["scripts/oalc-build-index.py", "load", "--confirm-write", "--out-dir", built.dir], {
      encoding: "utf8",
      env,
    });
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    code = e.status ?? 0;
    stderr = e.stderr ?? "";
  }
  assert.equal(code, 2);
  assert.match(stderr, /DATABASE_URL is not set/);
});

test("acceptance 1: a 2024 Federal Court citation resolves to the official URL", async () => {
  const hit = await checkCitation("Smith v Jones [2024] FCA 100", { store: loaded.store });
  found(hit);
  assert.equal(hit.citation, "[2024] FCA 100");
  assert.equal(hit.court, "Federal Court");
  assert.equal(hit.url, FCA_2024);
  assert.equal(hit.datePrecision, "day");
  assert.equal(hit.dateDisplay, "16 February 2024");
  assert.equal(hit.dateFlagged, false);
  assert.equal(hit.snapshotVersion, OALC_CORPUS_VERSION);
  assert.equal(hit.cutoff, OALC_CUTOFF_LABEL);
  assert.equal(hit.mayQuote, true);
  assert.match(hit.acknowledgement ?? "", /Judgment of the Federal Court of Australia/);
  assert.equal(hit.textIncluded, false);
});

test("acceptance 2: 2025 or later misses may postdate the snapshot; older misses use the other wording", async () => {
  const later = await checkCitation("[2026] HCA 1", { store: loaded.store });
  assert.equal(later.status, "missing");
  if (later.status === "missing") {
    assert.equal(later.message, "may postdate our licensed snapshot (cutoff 10 March 2025), confirm it exists");
    assert.equal(later.cutoff, OALC_CUTOFF_LABEL);
    assert.doesNotMatch(later.message, /not found|fabricat|hallucin|does not exist/i);
  }
  const inSnapshot = await checkCitation("[2025] HCA 2", { store: loaded.store });
  found(inSnapshot);
  assert.equal(inSnapshot.dateDisplay, "5 March 2025");

  const older = await checkCitation("[1999] HCA 99", { store: loaded.store });
  assert.equal(older.status, "missing");
  if (older.status === "missing") {
    assert.equal(older.message, "not in our licensed snapshot (cutoff 10 March 2025), confirm it exists");
    assert.doesNotMatch(older.message, /may postdate|not found|fabricat/i);
  }
  const gap2024 = await checkCitation("[2024] NSWSC 99999", { store: loaded.store });
  assert.equal(gap2024.status, "missing");
  if (gap2024.status === "missing") {
    assert.match(gap2024.message, /^not in our licensed snapshot/);
  }
});

test("acceptance 3: an HCA citation with no corpus date shows the year only, flagged", async () => {
  const hit = await checkCitation("[1956] hca 14", { store: loaded.store });
  found(hit);
  assert.equal(hit.datePrecision, "year");
  assert.equal(hit.dateDisplay, "1956");
  assert.equal(hit.dateFlagged, true);
  assert.match(JSON.stringify(hit), /Not a precise decision date/);
  assert.doesNotMatch(hit.dateDisplay ?? "", /January|March|day/i);
  const undated = await checkCitation("Re Fixture, Ex parte Example", { store: loaded.store });
  found(undated);
  assert.equal(undated.datePrecision, "none");
  assert.equal(undated.dateDisplay, null);
});

test("acceptance 4 and dedupe alias: one canonical row, and the losing URL still resolves", async () => {
  const matches = loaded.rows.filter((r) => normaliseCitation(r.citation) === "[2024] FCA 100");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].url, FCA_2024);
  const log = readFileSync(join(built.dir, "oalc_dedupe_log.csv"), "utf8");
  assert.match(log, /2024fca0100-copy/);
  assert.doesNotMatch(log, /2023fca0050/);
  const viaAlias = await checkCitation(HCA_ALIAS, { store: loaded.store });
  found(viaAlias);
  assert.equal(viaAlias.citation, "[1956] HCA 14");
  assert.equal(viaAlias.url, HCA_CANONICAL);
  const hcaRows = loaded.rows.filter((r) => r.citation === "[1956] HCA 14");
  assert.equal(hcaRows.length, 1);
});

test("acceptance 5: NSW and High Court results are citation, court, date and link, never judgment text", async () => {
  for (const query of ["[2024] NSWSC 88", "[2020] HCA 5"]) {
    const hit = await checkCitation(query, { store: loaded.store });
    found(hit);
    assert.equal(hit.mayQuote, false);
    assert.equal(hit.acknowledgement, null);
    assert.equal(hit.licence, "citation_and_link");
    assert.equal(hit.textIncluded, false);
    assert.equal("text" in hit, false);
    assert.equal(JSON.stringify(hit).includes(CANARY), false);
    assert.ok(hit.citation && hit.court && hit.url);
  }
  const federal = await checkCitation("[2024] FCA 100", { store: loaded.store });
  found(federal);
  assert.equal(federal.licence, "quote_with_acknowledgement");
  assert.equal(JSON.stringify(federal).includes(CANARY), false);
  const poisoned = toPublicCitation({ ...loaded.rows[0], text: CANARY, source: "NSW Caselaw" }, loaded.meta);
  assert.equal(JSON.stringify(poisoned).includes(CANARY), false);
});

test("acceptance 6: legislation is sent to the Federal Register and the corpus is not queried", async () => {
  let corpusHits = 0;
  const store: CitationStore = {
    async exact() { corpusHits++; return null; },
    async fuzzy() { corpusHits++; return null; },
    async byUrl() { corpusHits++; return null; },
    async meta() { return loaded.meta; },
  };
  let asked = "";
  const hit = await checkCitation("Income Tax Assessment Act 1997", {
    store,
    legislation: async (name) => {
      asked = name;
      return { query: name, source: "Federal Register of Legislation", results: [], acts: [] };
    },
  });
  assert.equal(corpusHits, 0);
  assert.equal(hit.status, "legislation");
  if (hit.status === "legislation") {
    assert.equal(hit.routedTo, "federal_register");
    assert.equal(asked, "Income Tax Assessment Act 1997");
    assert.match(hit.message, /Federal Register of Legislation/);
    assert.doesNotMatch(hit.message, /corpus|snapshot row/i);
  }
});

test("fuzzy match fixes a reported-citation typo and does not jump to a different case number", async () => {
  const typo = await checkCitation("Fixture v Exampl (2020) 100 CLR 1", { store: loaded.store });
  found(typo);
  assert.equal(typo.citation, "Fixture v Example (2020) 100 CLR 1");
  const other = await checkCitation("[2024] FCA 101", { store: loaded.store });
  assert.equal(other.status, "missing");
});

test("a missing table or a missing env is case-law index unavailable, not a miss", async () => {
  const broken: CitationStore = {
    async exact() { throw Object.assign(new Error("relation does not exist"), { code: "42P01" }); },
    async fuzzy() { return null; },
    async byUrl() { return null; },
    async meta() { return null; },
  };
  const down = await checkCitation("[2024] FCA 100", { store: broken });
  assert.deepEqual(down, { status: "unavailable", message: INDEX_UNAVAILABLE });

  const none = await checkCitation("[1999] HCA 1", { store: null });
  assert.equal(none.status, "unavailable");
  if (none.status === "unavailable") assert.doesNotMatch(none.message, /not in our licensed snapshot|may postdate/);

  const prevUrl = process.env.OALC_SUPABASE_URL;
  const prevKey = process.env.OALC_SUPABASE_ANON_KEY;
  delete process.env.OALC_SUPABASE_URL;
  delete process.env.OALC_SUPABASE_ANON_KEY;
  try {
    const bare = await checkCitation("[2024] FCA 100");
    assert.equal(bare.status, "unavailable");
    if (bare.status === "unavailable") assert.equal(bare.message, INDEX_UNAVAILABLE);
  } finally {
    if (prevUrl) process.env.OALC_SUPABASE_URL = prevUrl;
    if (prevKey) process.env.OALC_SUPABASE_ANON_KEY = prevKey;
  }
});

test("migration is read-only, trgm-indexed, and not applied from this test", () => {
  const sql = readFileSync("db/migrations/006_oalc_citations.sql", "utf8");
  for (const name of ["oalc_citations", "oalc_citation_aliases", "oalc_build_meta"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${name}`));
    assert.match(sql, new RegExp(`alter table public\\.${name} enable row level security`));
  }
  assert.match(sql, /pg_trgm/);
  assert.match(sql, /extensions\.gin_trgm_ops/);
  assert.match(sql, /grant select on public\.oalc_citations to anon, authenticated, lex_app/);
  assert.doesNotMatch(sql, /grant insert|grant update|grant delete|grant all on public\.oalc_citations/i);
  assert.match(sql, /Do not apply it to any existing Supabase project/);
});

test("git ignores the corpus and the built index, and the fixture is not named corpus.jsonl", () => {
  const ignore = readFileSync(".gitignore", "utf8");
  for (const name of ["oalc_citations.csv", "oalc_citation_aliases.csv", "oalc_dedupe_log.csv", "oalc_build_meta.json", "corpus.jsonl"]) {
    assert.match(ignore, new RegExp(name.replace(".", "\\.")));
  }
  assert.doesNotMatch(FIXTURE, /corpus\.jsonl$/);
  assert.equal(readFileSync(FIXTURE, "utf8").includes(CANARY), true);
});

test("tool descriptions and Lex copy do not claim every state supreme court", () => {
  const files = [
    "lib/lex-research-tools.ts",
    "lib/lex-tools.ts",
    "lib/lex-config.ts",
    "app/api/lex-draft/route.ts",
    "app/lex/_components/States.tsx",
    "lib/oalc-disclosure.ts",
  ];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /all State Supreme Courts/i, f);
    assert.doesNotMatch(src, /1000\+ (other )?(tribunals and )?databases/i, f);
    assert.doesNotMatch(src, /Covers High Court, Federal Court/i, f);
  }
  assert.match(CHECK_CITATION_DESCRIPTION, /cutoff 10 March 2025/);
  assert.match(CHECK_CITATION_DESCRIPTION, /NSW Caselaw, Federal Court and High Court/);
  assert.match(SEARCH_FAMILY_LAW_DESCRIPTION, /not in the licensed case-law snapshot/);
  const panel = OALC_SOURCE_PANEL.map((p) => p.body).join("\n");
  assert.match(panel, /may postdate our licensed snapshot \(cutoff 10 March 2025\), confirm it exists/);
  assert.match(panel, /not in our licensed snapshot \(cutoff 10 March 2025\), confirm it exists/);
  assert.match(panel, /citation and link only/);
  assert.match(panel, /Federal Register of Legislation/);
  assert.match(panel, /Family Court[\s\S]*not in this snapshot/);
  assert.ok(!/[\u2012-\u2015]/.test(panel));
});

test("checkCitation is on the internal tool list and drops when case law is out of scope", () => {
  const tools = buildLexResearchTools(getLexConfig()) as Record<string, { description?: string }>;
  assert.match(tools.checkCitation.description ?? "", /licensed Open Australian Legal Corpus/);
  assert.doesNotMatch(tools.checkCitation.description ?? "", /all State Supreme Courts/);
  const narrowed = filterToolsByScope(tools, ["legislation"]);
  assert.equal("checkCitation" in narrowed, false);
  assert.deepEqual(Object.keys(buildLexResearchTools(getLexConfig("lex-external"))), ["captureMatter"]);
  const page = readFileSync("app/legal/page.tsx", "utf8");
  const panel = readFileSync("app/lex/_components/SourcesPanel.tsx", "utf8");
  assert.match(page, /OALC_SOURCE_PANEL/);
  assert.match(panel, /OALC_SOURCE_PANEL/);
  assert.doesNotMatch(page, /All Australian databases/);
  assert.doesNotMatch(page, /not searching case law right now/);
});
