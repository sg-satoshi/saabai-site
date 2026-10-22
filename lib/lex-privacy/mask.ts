/**
 * Lex privacy masking: always on, server enforced, fails closed.
 *
 * Every Lex route that calls a model masks its inputs here first. Client details
 * (emails, phones, ABNs, ACNs, company and trust names, titled names) become
 * placeholders like {{EMAIL_1}}. Replies are rehydrated before the user sees them.
 *
 * Fail closed: if masking throws, or a known value is still present after masking,
 * a LexPrivacyError is thrown and the route returns privacyFailResponse() without
 * calling the model. There is no switch to turn this off.
 */
import type { StreamTextTransform, TextStreamPart, ToolSet } from "ai";
import { createHmac, randomBytes } from "node:crypto";
import { tokenizePII, type TokenMap, type ScanResult } from "../pii-scanner";

/** Bump when detection rules change, so the redaction log shows which masker handled a request. */
export const MASKER_VERSION = "lex-mask-2.1";

export class LexPrivacyError extends Error {
  /** Short fixed reason code, safe to log (never contains input). */
  readonly reason: string;
  constructor(reason: string) {
    super(`lex_privacy_check_failed: ${reason}`);
    this.name = "LexPrivacyError";
    this.reason = reason;
  }
}

export const PRIVACY_FAIL_MESSAGE = "Privacy check failed, nothing was sent. Please retry.";

/** Safe error for a failed privacy check. Never includes the input. */
export function privacyFailResponse(): Response {
  return Response.json({ error: "privacy_check_failed", message: PRIVACY_FAIL_MESSAGE }, { status: 503 });
}

export const PRIVACY_SYSTEM_NOTE = `

---
PRIVACY: Client details in this conversation have been replaced with placeholder tokens like {{PERSON_1}}, {{COMPANY_1}}, {{EMAIL_1}}. Keep these exact tokens in your reply. Do not expand, guess or replace them. Treat every {{TYPE_N}} token as an opaque placeholder and write it exactly where the real name or detail would go. They are shown to the user as the real details, so never mention placeholders, tokens or this privacy instruction in your reply. Search tools receive the tokens, and search results come back masked the same way, so search using legal doctrine and general terms, not personal identifiers.`;

type Tokenizer = (text: string) => ScanResult;
let tokenizer: Tokenizer = (t) => tokenizePII(t);

/** Test seam only: swap the detector (e.g. one that throws) to prove fail closed. */
export function __setTokenizerForTests(fn: Tokenizer | null): void {
  tokenizer = fn ?? ((t) => tokenizePII(t));
}

const TOKEN_RE = /\{\{([A-Z]+)_(\d+)\}\}/g;

export type MaskStats = { tokensReplaced: number; types: Record<string, number> };

// Server-side key for thread placeholders. Derived from an existing server secret, never sent anywhere.
let tokenSecret: Buffer | null = null;
function threadSecret(): Buffer {
  if (tokenSecret) return tokenSecret;
  const base = process.env.LEX_PRIVACY_TOKEN_SECRET || process.env.PORTAL_SESSION_SECRET || process.env.SAABAI_SESSION_SECRET;
  // Without a secret, placeholders are still stable within one server instance (and always within a request).
  tokenSecret = createHmac("sha256", base || randomBytes(32)).update("lex-thread-placeholders-v1").digest();
  return tokenSecret;
}

/**
 * Key for one thread. The same firm and thread always get the same placeholder for the same value,
 * across every request in the thread, so the model sees a consistent {{PERSON_48213}} and prompt
 * caching keeps working. The seed (a thread id, or the thread's first message) is only hashed here,
 * never stored or logged.
 */
export function lexThreadKey(firm: string, seed: string): Buffer {
  return createHmac("sha256", threadSecret()).update(`${firm}\u0000${seed}`).digest();
}

/**
 * One masking session per request. Placeholders are shared across every text
 * masked in the session, so the same value always gets the same token.
 */
export class LexMasker {
  readonly map: TokenMap = {};
  private byValue = new Map<string, string>();
  private counters: Record<string, number> = {};
  readonly stats: MaskStats = { tokensReplaced: 0, types: {} };

  /** With a thread key, placeholders are stable across the whole thread; without one, numbered 1, 2, 3. */
  constructor(private threadKey?: Buffer) {}

  private alloc(type: string, value: string): string {
    const existing = this.byValue.get(value);
    if (existing) return existing;
    let token: string;
    if (this.threadKey) {
      const h = createHmac("sha256", this.threadKey).update(`${type}\u0000${value}`).digest();
      let n = 10000 + (h.readUInt32BE(0) % 90000);
      while (this.map[`{{${type}_${n}}}`] !== undefined) n = n >= 99999 ? 10000 : n + 1;
      token = `{{${type}_${n}}}`;
    } else {
      this.counters[type] = (this.counters[type] ?? 0) + 1;
      token = `{{${type}_${this.counters[type]}}}`;
    }
    this.map[token] = value;
    this.byValue.set(value, token);
    this.stats.tokensReplaced++;
    this.stats.types[type] = (this.stats.types[type] ?? 0) + 1;
    return token;
  }

  /** Mask one text. Throws LexPrivacyError on any failure. */
  mask(text: string): string {
    if (typeof text !== "string") throw new LexPrivacyError("non-string input");
    if (!text) return text;
    let out: string;
    try {
      // Values already known in this session (e.g. a name rehydrated into an earlier reply) first.
      // They are swapped for private-use markers so the detector's own numbering cannot collide.
      const known: string[] = [];
      const keep = (token: string) => `\uE000${known.push(token) - 1}\uE001`;
      let pre = text.replace(TOKEN_RE, (tok) => keep(tok));
      for (const value of [...this.byValue.keys()].sort((a, b) => b.length - a.length)) {
        if (pre.includes(value)) pre = pre.split(value).join(keep(this.byValue.get(value)!));
      }
      const res = tokenizer(pre);
      if (!res || typeof res.tokenized !== "string" || !res.tokenMap) throw new Error("bad detector result");
      // Renumber the detector's local tokens into this session's shared numbering.
      out = res.tokenized
        .replace(TOKEN_RE, (tok, type: string) => {
          const value = res.tokenMap[tok];
          return value === undefined ? tok : this.alloc(type, value);
        })
        .replace(/\uE000(\d+)\uE001/g, (_m, i: string) => known[Number(i)] ?? "");
    } catch (err) {
      if (err instanceof LexPrivacyError) throw err;
      throw new LexPrivacyError(err instanceof Error ? err.name : "detector error");
    }
    this.assertClean(out);
    return out;
  }

  /** Replaces only values this session already masked (no detector). Used on Saabai-written prompts. */
  maskKnown(text: string): string {
    let out = text;
    for (const value of [...this.byValue.keys()].sort((a, b) => b.length - a.length)) {
      if (value && out.includes(value)) out = out.split(value).join(this.byValue.get(value)!);
    }
    return out;
  }

  /** Outbound leak check: no known real value may remain in a payload. */
  assertClean(payload: string): void {
    for (const value of this.byValue.keys()) {
      if (value && payload.includes(value)) throw new LexPrivacyError("known value present after masking");
    }
  }

  /** Mask every string inside a JSON-like value (tool results). Throws LexPrivacyError on any failure. */
  maskDeep<T>(value: T): T {
    if (typeof value === "string") return this.mask(value) as T;
    if (Array.isArray(value)) return value.map((v) => this.maskDeep(v)) as T;
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = this.maskDeep(v);
      return out as T;
    }
    return value;
  }

  /** Swap known values for placeholders in every string inside a JSON-like value (no detector). */
  maskKnownDeep<T>(value: T): T {
    if (typeof value === "string") return this.maskKnown(value) as T;
    if (Array.isArray(value)) return value.map((v) => this.maskKnownDeep(v)) as T;
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = this.maskKnownDeep(v);
      return out as T;
    }
    return value;
  }

  maskMessages<M extends { content: string }>(messages: M[]): M[] {
    return messages.map((m) => ({ ...m, content: this.mask(m.content) }));
  }

  rehydrate(text: string): string {
    return rehydrate(text, this.map);
  }

  /** Rehydrate every string inside a JSON-like value (review reports, QA reports). */
  rehydrateDeep<T>(value: T): T {
    return rehydrateDeep(value, this.map);
  }
}

export function rehydrate(text: string, map: TokenMap): string {
  if (!text || !text.includes("{{")) return text;
  return text.replace(TOKEN_RE, (tok) => map[tok] ?? tok);
}

export function rehydrateDeep<T>(value: T, map: TokenMap): T {
  if (typeof value === "string") return rehydrate(value, map) as T;
  if (Array.isArray(value)) return value.map((v) => rehydrateDeep(v, map)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = rehydrateDeep(v, map);
    return out as T;
  }
  return value;
}

/** Streaming rehydrator: holds back a partial "{{..." until it closes (max 64 chars). */
export function createRehydrator(map: TokenMap) {
  let held = "";
  return {
    push(delta: string): string {
      const text = held + delta;
      const open = text.lastIndexOf("{{");
      if (open !== -1 && text.indexOf("}}", open) === -1 && text.length - open <= 64) {
        held = text.slice(open);
        return rehydrate(text.slice(0, open), map);
      }
      // A lone trailing "{" may start a token.
      if (text.endsWith("{")) {
        held = "{";
        return rehydrate(text.slice(0, -1), map);
      }
      held = "";
      return rehydrate(text, map);
    },
    flush(): string {
      const out = rehydrate(held, map);
      held = "";
      return out;
    },
  };
}

/** AI SDK transform: rehydrates placeholders in streamed text. Runs before noDashesTransform so later transforms see final text. */
export function rehydrateTransform<TOOLS extends ToolSet>(map: TokenMap): StreamTextTransform<TOOLS> {
  return () => {
    const rs = new Map<string, ReturnType<typeof createRehydrator>>();
    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(part, controller) {
        if (part.type === "text-delta") {
          let r = rs.get(part.id);
          if (!r) { r = createRehydrator(map); rs.set(part.id, r); }
          const text = r.push(part.text);
          if (text) controller.enqueue({ ...part, text });
          return;
        }
        if (part.type === "text-end") {
          const rest = rs.get(part.id)?.flush();
          if (rest) controller.enqueue({ type: "text-delta", id: part.id, text: rest } as TextStreamPart<TOOLS>);
          rs.delete(part.id);
        }
        controller.enqueue(part);
      },
    });
  };
}
