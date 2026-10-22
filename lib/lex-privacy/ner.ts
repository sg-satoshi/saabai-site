/**
 * Open-source name detection (NER) inside our own functions. No external API: the model
 * (distilbert-NER, Apache-2.0, quantised ONNX, about 66 MB) is fetched at build time and loaded from
 * the function's own files. It finds person, organisation and place names the patterns miss.
 *
 * Best effort, never a gate: if the model is missing, fails to load, errors or runs past its time
 * budget, Lex carries on with patterns plus matter parties, and the redaction log records why.
 * Names it finds are added to the masking session like matter parties (same variants rule).
 * Public bodies, courts, states, countries, capital cities and names inside a case citation
 * ("Donoghue v Stevenson") are left readable, so legal research still works.
 */
import { join } from "node:path";
import { existsSync } from "node:fs";
import { COMMON_WORDS } from "../pii-scanner";
import type { MatterParty, PartyKind } from "./parties";

export const NER_MODEL = "onnx-community/distilbert-NER-ONNX";
export type NerStatus = "on" | "off" | "unavailable" | "failed" | "partial";
export type NerEntity = { kind: PartyKind; text: string; score: number };
type Token = { entity: string; score: number; index: number; word: string };
type Classifier = (text: string) => Promise<Token[]>;

const MIN_SCORE = 0.8;
const CHUNK_CHARS = 1500;
export const NER_MAX_CHARS = 120_000;
export const NER_BUDGET_MS = 4000;

const PUBLIC_ORG = /\b(?:Court|Tribunal|Commission|Commissioner|Parliament|Commonwealth|Government|Department|Ministry|Registry|Police|Crown|Treasury|Taxation Office|Tax Office|ATO|ASIC|ACCC|APRA|AUSTRAC|ASX|OAIC|AFCA|AAT|ART|NCAT|QCAT|VCAT|Fair Work|Centrelink|Services Australia|Medicare|ABN|ACN|ARBN|TFN|BSB|GST|PAYG|SMSF|CGT|FBT|Legal Aid|Law Society|Bar Association|Law Council|AustLII|JADE|Lex|Saabai|Reserve Bank|Supreme|High Court|Federal Circuit)\b/i;
const PUBLIC_PLACE = new Set([
  "Australia", "Queensland", "New South Wales", "Victoria", "Tasmania", "South Australia", "Western Australia", "Northern Territory",
  "Australian Capital Territory", "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Hobart", "Darwin", "Canberra", "Gold Coast",
  "New Zealand", "United Kingdom", "England", "Wales", "Scotland", "Ireland", "United States", "America", "Canada", "China", "India",
  "Japan", "Singapore", "Hong Kong", "Indonesia", "Europe", "Asia", "Pacific", "Cth", "Qld", "NSW", "Vic", "WA", "SA", "Tas", "NT", "ACT",
]);

let loader: Promise<Classifier | null> | null = null;
let classifierForTests: Classifier | null | undefined;
let lastLoadMs = 0;

/** Test seam: a fake classifier, or null to simulate a model that will not load. */
export function __setNerForTests(fn: Classifier | null | undefined): void {
  classifierForTests = fn;
  loader = null;
}

export function nerEnabled(): boolean {
  return process.env.LEX_NER !== "off";
}

export function nerModelDir(): string {
  return join(process.cwd(), "models");
}

async function load(): Promise<Classifier | null> {
  if (classifierForTests !== undefined) return classifierForTests;
  if (!existsSync(join(nerModelDir(), NER_MODEL, "onnx", "model_quantized.onnx"))) return null;
  const t0 = Date.now();
  const tf = await import("@huggingface/transformers");
  tf.env.allowRemoteModels = false;
  tf.env.allowLocalModels = true;
  tf.env.localModelPath = nerModelDir() + "/";
  tf.env.useFSCache = false;
  // One thread: Vercel functions get about one vCPU.
  const pipe = await tf.pipeline("token-classification", NER_MODEL, { dtype: "q8", device: "cpu", session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 } } as never);
  lastLoadMs = Date.now() - t0;
  return async (text: string) => (await pipe(text)) as unknown as Token[];
}

/** Loads the model once per function instance. Resolves null if it cannot load (never throws). */
export function getNer(): Promise<Classifier | null> {
  if (!loader) {
    loader = load().catch((err) => {
      console.error("[lex-ner] load failed", err instanceof Error ? err.name : "error");
      return null;
    });
  }
  return loader;
}

export function nerLoadMs(): number {
  return lastLoadMs;
}

/** Splits text into chunks at sentence or line ends, so the model's 512 token window is never exceeded. */
export function chunks(text: string, size = CHUNK_CHARS): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > size) {
    const slice = rest.slice(0, size);
    const cut = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "), slice.lastIndexOf(" "));
    const at = cut > size / 2 ? cut + 1 : size;
    out.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest.trim()) out.push(rest);
  return out;
}

const KIND: Record<string, PartyKind | undefined> = { PER: "person", ORG: "org", LOC: "place" };

/** Joins word pieces into entities ("River", "##bend", "Logistics" -> "Riverbend Logistics"). */
export function aggregate(tokens: Token[]): NerEntity[] {
  const out: NerEntity[] = [];
  let cur: { kind: PartyKind; text: string; scores: number[]; last: number; frag: boolean } | null = null;
  const flush = () => {
    // An entity that starts mid word ("##omba") is a fragment of a longer word: drop it.
    if (cur && !cur.frag) out.push({ kind: cur.kind, text: cur.text.trim(), score: cur.scores.reduce((a, b) => a + b, 0) / cur.scores.length });
    cur = null;
  };
  for (const t of tokens) {
    const [bio, tag] = t.entity.split("-");
    const kind = KIND[tag];
    const piece = t.word.startsWith("##");
    const word = piece ? t.word.slice(2) : t.word;
    const cont = cur && kind === cur.kind && t.index === cur.last + 1 && (bio === "I" || piece);
    if (!kind) { flush(); continue; }
    if (cont && cur) {
      const tight = piece || /^['\u2019&.-]$/.test(word) || /['\u2019-]$/.test(cur.text);
      cur.text += (tight ? "" : " ") + word;
      cur.scores.push(t.score);
      cur.last = t.index;
    } else {
      flush();
      cur = { kind, text: word, scores: [t.score], last: t.index, frag: piece };
    }
  }
  flush();
  return out;
}

/** Words inside public body names in the text ("Federal Court of Australia"): a lone word from one stays readable. */
function publicWords(text: string): Set<string> {
  const out = new Set<string>();
  const re = /(?:[A-Z][\w'&.-]*\s+){0,4}(?:Court|Tribunal|Commission|Commissioner|Parliament|Government|Department|Ministry|Registry|Police|Office|Authority|Treasury)(?:\s+(?:of|for)(?:\s+(?:the\s+)?[A-Z][\w'&.-]*){1,4})?/g;
  for (const m of text.matchAll(re)) for (const w of m[0].split(/\s+/)) out.add(w);
  return out;
}

/** Case citations in the text ("Smith v Jones", "R v Smith"): their names stay readable. */
function citationNames(text: string): Set<string> {
  const names = new Set<string>();
  const re = /([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*){0,5})\s+v\.?\s+([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*){0,5})/g;
  for (const m of text.matchAll(re)) for (const side of [m[1], m[2]]) for (const w of side.split(/\s+/)) names.add(w.replace(/['\u2019]s$/, ""));
  return names;
}

export function keepEntity(e: NerEntity, text: string, cited: Set<string>, pub: Set<string> = new Set()): boolean {
  const t = e.text;
  if (e.score < MIN_SCORE || t.length < 2 || /\d|\{\{/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.every((w) => COMMON_WORDS.has(w) || w.length < 2)) return false;
  if (e.kind === "org" && PUBLIC_ORG.test(t)) return false;
  if (e.kind === "place" && PUBLIC_PLACE.has(t)) return false;
  // Street names and "Suburb QLD" are left to the address patterns, which mask the whole address.
  if (e.kind === "place" && /\b(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Parade|Pde|Lane|Ln|Way|Terrace|Tce|Boulevard|Highway|Hwy|Close|Circuit|Esplanade|Grove|QLD|NSW|VIC|WA|SA|TAS|ACT|NT)$/i.test(t)) return false;
  if (words.every((w) => cited.has(w))) return false;
  if (words.length === 1 && pub.has(t)) return false;
  // Must really be in the text as written, as whole words (guards against tokenizer spacing).
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${esc}(?![\\p{L}\\p{N}_])`, "u").test(text);
}

/** Fixed made-up sentence with known names, run before each request's text (about 5 ms). */
const SELF_CHECK = "Margaret Okafor met Brendan Walsh in Toowoomba.";
/**
 * The ONNX runtime gave wrong results under heavy CPU load on our build box. If the self-check
 * sentence does not come back right, this request's model output is not trusted (status failed,
 * patterns and matter parties still mask everything they know).
 */
export async function selfCheck(ner: Classifier): Promise<boolean> {
  try {
    const e = aggregate(await ner(SELF_CHECK)).map((x) => `${x.kind}:${x.text}`);
    return e.includes("person:Margaret Okafor") && e.includes("person:Brendan Walsh") && e.includes("place:Toowoomba");
  } catch {
    return false;
  }
}

export type NerResult = { status: NerStatus; parties: MatterParty[]; ms: number; chars: number };

/** Finds names in the given texts. Never throws. */
export async function detectNames(texts: string[], opts?: { budgetMs?: number; maxChars?: number }): Promise<NerResult> {
  const t0 = Date.now();
  const all = texts.filter((t) => typeof t === "string" && t.trim()).join("\n\n");
  if (!nerEnabled()) return { status: "off", parties: [], ms: 0, chars: 0 };
  if (!all) return { status: "on", parties: [], ms: 0, chars: 0 };
  const ner = await getNer();
  if (!ner) return { status: "unavailable", parties: [], ms: Date.now() - t0, chars: 0 };
  if (classifierForTests === undefined && !(await selfCheck(ner))) return { status: "failed", parties: [], ms: Date.now() - t0, chars: 0 };
  // The time budget covers running the model, not the one-off load on a cold start.
  const tRun = Date.now();
  const budget = opts?.budgetMs ?? NER_BUDGET_MS;
  const max = opts?.maxChars ?? NER_MAX_CHARS;
  const text = all.slice(0, max);
  const cited = citationNames(text);
  const pub = publicWords(text);
  const found = new Map<string, MatterParty>();
  let status: NerStatus = all.length > max ? "partial" : "on";
  let done = 0;
  try {
    for (const c of chunks(text)) {
      if (Date.now() - tRun > budget) { status = "partial"; break; }
      for (const e of aggregate(await ner(c))) {
        if (!keepEntity(e, c, cited, pub)) continue;
        const key = `${e.kind}:${e.text.toLowerCase()}`;
        if (!found.has(key)) found.set(key, { name: e.text, kind: e.kind });
      }
      done += c.length;
    }
  } catch (err) {
    console.error("[lex-ner] run failed", err instanceof Error ? err.name : "error");
    status = "failed";
  }
  return { status, parties: [...found.values()], ms: Date.now() - t0, chars: done };
}
