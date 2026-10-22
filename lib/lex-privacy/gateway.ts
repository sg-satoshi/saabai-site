/**
 * Lex AI gateway: the only door from Lex code to a model provider.
 *
 * Every Lex model call (chat, research, drafting, the drafting QA pass, review, compare,
 * the confidence check and the LLM settings test) goes through a LexGateway. The gateway:
 *   - picks the model, so routes never import a provider or build a model themselves
 *   - masks every prompt and message itself, and leak checks the system prompt, before sending
 *   - fails closed: any masking problem throws LexPrivacyError and nothing is sent
 *   - rehydrates replies (streamed text, text and structured objects) before the route sees them
 *
 * Masking is always on for every firm, including firms using their own API key. There is no switch.
 */
import {
  streamText as aiStreamText,
  generateText as aiGenerateText,
  generateObject as aiGenerateObject,
  type LanguageModel,
  type ModelMessage,
  type SystemModelMessage,
  type ToolSet,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getLexModelForFirm } from "../lex-model";
import { buildModelFromConfig, getClientLLMConfig, type ClientLLMConfig } from "../client-config";
import { modelIdFrom } from "../chat-log";
import { randomBytes } from "node:crypto";
import { LexMasker, LexPrivacyError, MASKER_VERSION, PRIVACY_SYSTEM_NOTE, lexThreadKey, rehydrateTransform } from "./mask";
import { recordRedaction, type RedactionOutcome } from "./redaction-log";
import type { MatterParty } from "./parties";

/** Test seam (same module instance the gateway uses). */
export { __setTokenizerForTests, LexPrivacyError } from "./mask";

export type LexRoute =
  | "lex-chat"
  | "lex-research"
  | "lex-answer-check"
  | "lex-draft"
  | "lex-draft-qa"
  | "lex-review"
  | "lex-compare"
  | "lex-settings-test";

/** Where the model comes from. Routes describe it; only the gateway builds it. */
export type LexModelSource =
  /** The firm's own saved key and model, else Lex's research model (LEX_RESEARCH_MODEL). */
  | { kind: "firm"; configId: string }
  /** The firm's own saved key and model when a clientId is given, else Claude Haiku (intake chat). */
  | { kind: "chat"; clientId?: string }
  /** A fixed Saabai model (review and compare). */
  | { kind: "saabai"; modelId: "claude-sonnet-4-6" | "claude-haiku-4-5-20251001" }
  /** A firm config being tested from LLM settings (never saved by the gateway). */
  | { kind: "config"; config: ClientLLMConfig };

async function resolveModel(src: LexModelSource): Promise<LanguageModel | null> {
  switch (src.kind) {
    case "firm":
      return getLexModelForFirm(src.configId);
    case "chat": {
      if (src.clientId) {
        try {
          const own = await getClientLLMConfig(src.clientId);
          const built = own ? buildModelFromConfig(own) : null;
          if (built) return built;
        } catch {
          // Broken saved config: use the default.
        }
      }
      return anthropic("claude-haiku-4-5-20251001");
    }
    case "saabai":
      return anthropic(src.modelId);
    case "config":
      return buildModelFromConfig(src.config);
  }
}

type Msg = { role: string; content: unknown };

/**
 * Tools that write to Saabai's own systems for the firm (not a third party). Their arguments are
 * rehydrated so the firm's own admin keeps the real details. Every other tool (searches, source reads)
 * gets placeholders only, so client details never reach a search provider.
 */
export const FIRST_PARTY_TOOLS = new Set(["captureMatter"]);

export type ToolPrivacyStats = { calls: number; resultsMasked: number; argsScrubbed: number; errorsMasked: number; resultsBlocked: number };

export interface LexGatewayInit {
  route: LexRoute;
  /** Firm the request belongs to (for the redaction log). Never an email of a client. */
  firm: string;
  model: LexModelSource;
  /** Share an existing masking session (e.g. a route that masked parties into its system prompt). */
  masker?: LexMasker;
  /**
   * Thread seed for stable placeholders across a whole thread: a thread id from the client, or the
   * thread's first user message. Hashed with the firm and a server key, never stored. See threadSeed().
   */
  thread?: string;
  /** The matter's known parties (see matterPartiesFor). Every variant is always masked. */
  parties?: MatterParty[];
}

const THREAD_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;

/** Picks the thread seed: a well-formed thread id if the client sent one, else the first user message. */
export function threadSeed(threadId: unknown, messages: Array<{ role: string; content: unknown }> | undefined): string | undefined {
  if (typeof threadId === "string" && THREAD_ID_RE.test(threadId)) return `id:${threadId}`;
  const first = messages?.find((m) => m.role === "user" && typeof m.content === "string" && m.content.trim());
  return first ? `first:${String(first.content).trim()}` : undefined;
}

export class LexGateway {
  readonly route: LexRoute;
  readonly firm: string;
  readonly masker: LexMasker;
  readonly toolStats: ToolPrivacyStats = { calls: 0, resultsMasked: 0, argsScrubbed: 0, errorsMasked: 0, resultsBlocked: 0 };
  readonly requestId: string;
  private constructor(init: LexGatewayInit, private model: LanguageModel, requestId?: string) {
    this.route = init.route;
    this.firm = init.firm;
    this.masker = init.masker ?? new LexMasker(init.thread ? lexThreadKey(init.firm, init.thread) : undefined);
    if (init.parties?.length) this.masker.addParties(init.parties);
    this.requestId = requestId ?? randomBytes(8).toString("hex");
  }

  /** Writes one redaction log entry (types and counts only). Never throws. */
  private log(outcome: RedactionOutcome, err?: unknown): void {
    try {
      const reason = err instanceof LexPrivacyError ? err.reason : outcome === "error" ? (err instanceof Error ? err.name : "error") : undefined;
      void recordRedaction(this.firm, {
        requestId: this.requestId,
        ts: Date.now(),
        route: this.route,
        model: this.modelId,
        masker: MASKER_VERSION,
        outcome,
        reason,
        types: { ...this.masker.stats.types },
        total: this.masker.stats.tokensReplaced,
        sources: { ...this.masker.stats.sources },
        parties: this.masker.partyCount,
        tools: { ...this.toolStats },
      });
    } catch {
      // logging never breaks a request
    }
  }

  /** Runs a masking step; a privacy failure is logged as blocked and rethrown (nothing is sent). */
  private guard<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (err instanceof LexPrivacyError) this.log("blocked", err);
      throw err;
    }
  }

  /** Opens a gateway. Returns null when the model cannot be built (e.g. an unsupported provider). */
  static async open(init: LexGatewayInit): Promise<LexGateway | null> {
    const model = await resolveModel(init.model);
    if (!model) {
      void recordRedaction(init.firm, { requestId: randomBytes(8).toString("hex"), ts: Date.now(), route: init.route, model: "unavailable", masker: MASKER_VERSION, outcome: "error", reason: "model unavailable", types: {}, total: 0, tools: { calls: 0, resultsMasked: 0, argsScrubbed: 0, errorsMasked: 0, resultsBlocked: 0 } });
      return null;
    }
    return new LexGateway(init, model);
  }

  /** Test seam only: a gateway around a mock model. Production code uses open(). */
  static __forTests(model: LanguageModel, init: Omit<LexGatewayInit, "model">): LexGateway {
    return new LexGateway({ ...init, model: { kind: "saabai", modelId: "claude-sonnet-4-6" } }, model);
  }

  /** "provider:model" style id for logs. Never includes a key. */
  get modelId(): string {
    return modelIdFrom(this.model);
  }

  /** A gateway for a second call in the same request, sharing placeholders (e.g. the confidence check). */
  child(route: LexRoute): LexGateway {
    return new LexGateway({ route, firm: this.firm, model: { kind: "saabai", modelId: "claude-sonnet-4-6" }, masker: this.masker }, this.model, this.requestId);
  }

  mask(text: string): string {
    return this.guard(() => this.masker.mask(text));
  }
  rehydrate(text: string): string {
    return this.masker.rehydrate(text);
  }
  rehydrateDeep<T>(value: T): T {
    return this.masker.rehydrateDeep(value);
  }

  // ── Outbound ─────────────────────────────────────────────────────────────

  private maskContent(content: unknown): unknown {
    if (typeof content === "string") return this.masker.mask(content);
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (part && typeof part === "object" && (part as { type?: string }).type === "text") {
          const p = part as { text?: unknown };
          return { ...part, text: this.masker.mask(String(p.text ?? "")) };
        }
        if (part && typeof part === "object" && (part as { type?: string }).type === "tool-result") return part; // already masked by the gateway
        if (part && typeof part === "object" && (part as { type?: string }).type === "tool-call") return part;
        throw new LexPrivacyError("unsupported message part");
      });
    }
    throw new LexPrivacyError("unsupported message content");
  }

  /** Masks messages, drops any client-sent system message. */
  maskMessages<M extends Msg>(messages: M[]): M[] {
    return this.guard(() => this.maskMessagesInner(messages));
  }
  private maskMessagesInner<M extends Msg>(messages: M[]): M[] {
    if (!Array.isArray(messages)) throw new LexPrivacyError("messages not an array");
    return messages.filter((m) => m.role !== "system").map((m) => ({ ...m, content: this.maskContent(m.content) }) as M);
  }

  /**
   * The system prompt is written by Saabai code (and firm settings). It is not run through the detector,
   * so legal instructions stay intact, but any value this session has masked is swapped for its
   * placeholder. Routes that put client text in the system prompt (drafting parties) mask that part first.
   */
  private checkSystem(system: string | SystemModelMessage | undefined): string | SystemModelMessage {
    const text = typeof system === "string" ? system : system?.content ?? "";
    const withNote = this.masker.maskKnown(text.includes(PRIVACY_SYSTEM_NOTE.trim()) ? text : text + PRIVACY_SYSTEM_NOTE);
    this.masker.assertClean(withNote);
    return typeof system === "object" && system ? { ...system, content: withNote } : withNote;
  }

  private prepare(p: { system?: string | SystemModelMessage; prompt?: string; messages?: Msg[] }) {
    return this.guard(() => {
      const prompt = typeof p.prompt === "string" ? this.masker.mask(p.prompt) : undefined;
      const messages = p.messages ? this.maskMessagesInner(p.messages) : undefined;
      const system = this.checkSystem(p.system);
      // Final outbound leak check on the whole payload.
      this.masker.assertClean(JSON.stringify({ system, prompt, messages }));
      return { system, prompt, messages };
    });
  }

  /**
   * Wraps every tool so it is masked both ways:
   *   in:  arguments from the model have any known real value swapped for its placeholder (first-party
   *        tools get real values back, for the firm's own records)
   *   out: every string in the result, or in an error message, is masked before the model sees it
   * A masking failure in a result throws LexPrivacyError, so the step fails closed.
   */
  wrapTools<T>(tools: T): T {
    if (!tools || typeof tools !== "object") return tools;
    const out: Record<string, unknown> = {};
    for (const [name, t] of Object.entries(tools as Record<string, unknown>)) {
      const orig = t as { execute?: (input: unknown, opts: unknown) => unknown };
      if (!orig || typeof orig.execute !== "function") { out[name] = t; continue; }
      const exec = orig.execute.bind(orig);
      out[name] = {
        ...orig,
        execute: async (input: unknown, opts: unknown) => {
          this.toolStats.calls++;
          let args: unknown;
          if (FIRST_PARTY_TOOLS.has(name)) {
            args = this.masker.rehydrateDeep(input);
          } else {
            args = this.masker.maskKnownDeep(input);
            if (JSON.stringify(args) !== JSON.stringify(input)) this.toolStats.argsScrubbed++;
            this.masker.assertClean(JSON.stringify(args ?? null));
          }
          let result: unknown;
          try {
            result = await exec(args, opts);
          } catch (err) {
            this.toolStats.errorsMasked++;
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(this.masker.mask(msg.slice(0, 2000)));
          }
          try {
            const masked = this.masker.maskDeep(result);
            this.masker.assertClean(JSON.stringify(masked ?? null));
            this.toolStats.resultsMasked++;
            return masked;
          } catch (err) {
            // The raw result is dropped. The model only sees a fixed privacy error for this tool call.
            this.toolStats.resultsBlocked++;
            throw err instanceof LexPrivacyError ? err : new LexPrivacyError("tool result masking failed");
          }
        },
      };
    }
    return out as T;
  }

  /**
   * Runs before every step: swaps known values out of the whole message history (e.g. a tool-call
   * argument the model wrote with a real value) and leak checks it, then applies the route's own prepareStep.
   */
  private prepareStepFor(routeStep: unknown) {
    return async (opts: { messages: unknown[] } & Record<string, unknown>) => {
      const own = typeof routeStep === "function" ? await (routeStep as (o: unknown) => unknown)(opts) : undefined;
      const base = (own && typeof own === "object" ? own : {}) as { messages?: unknown[] };
      const messages = this.masker.maskKnownDeep(base.messages ?? opts.messages);
      this.masker.assertClean(JSON.stringify(messages));
      return { ...base, messages };
    };
  }

  /** Logs the outcome of a one-shot call. */
  private async track<R>(fn: () => Promise<R>): Promise<R> {
    try {
      const r = await fn();
      this.log("pass");
      return r;
    } catch (err) {
      this.log(err instanceof LexPrivacyError ? "blocked" : "error", err);
      throw err;
    }
  }

  // ── Calls ────────────────────────────────────────────────────────────────

  /** Streams a reply. Text is rehydrated before any route transform runs. Throws LexPrivacyError before sending. */
  streamText<TOOLS extends ToolSet = ToolSet>(params: Omit<Parameters<typeof aiStreamText<TOOLS>>[0], "model" | "system" | "prompt" | "messages"> & {
    system?: string | SystemModelMessage;
    messages: Msg[];
  }) {
    const { system, messages } = this.prepare(params);
    const transforms = params.experimental_transform
      ? Array.isArray(params.experimental_transform) ? params.experimental_transform : [params.experimental_transform]
      : [];
    return aiStreamText<TOOLS>({
      ...(params as object),
      ...(params.tools ? { tools: this.wrapTools(params.tools) } : {}),
      prepareStep: this.prepareStepFor(params.prepareStep),
      model: this.model,
      system,
      messages: messages as ModelMessage[],
      experimental_transform: [rehydrateTransform<TOOLS>(this.masker.map), ...transforms],
      onFinish: async (event: unknown) => {
        this.log("pass");
        await (params.onFinish as ((e: unknown) => unknown) | undefined)?.(event);
      },
      onError: async (event: { error: unknown }) => {
        this.log(event?.error instanceof LexPrivacyError ? "blocked" : "error", event?.error);
        await (params.onError as ((e: unknown) => unknown) | undefined)?.(event);
      },
    } as Parameters<typeof aiStreamText<TOOLS>>[0]);
  }

  /** One-shot text. Returns rehydrated text plus usage. */
  async generateText<TOOLS extends ToolSet = ToolSet>(params: Omit<Parameters<typeof aiGenerateText<TOOLS>>[0], "model" | "system" | "prompt" | "messages"> & {
    system?: string;
    prompt?: string;
    messages?: Msg[];
  }) {
    const { system, prompt, messages } = this.prepare(params);
    const res = await this.track(() => aiGenerateText<TOOLS>({
      ...(params as object),
      ...(params.tools ? { tools: this.wrapTools(params.tools) } : {}),
      prepareStep: this.prepareStepFor(params.prepareStep),
      model: this.model,
      system,
      ...(messages ? { messages: messages as ModelMessage[] } : { prompt: prompt ?? "" }),
    } as Parameters<typeof aiGenerateText<TOOLS>>[0]));
    return { text: this.masker.rehydrate(res.text), maskedText: res.text, usage: res.usage, totalUsage: res.totalUsage };
  }

  /** Structured output. Every string in the object is rehydrated. */
  async generateObject<T>(params: {
    schema: Parameters<typeof aiGenerateObject>[0] extends infer P ? P extends { schema: infer S } ? S : never : never;
    schemaName?: string;
    system?: string;
    prompt: string;
    maxOutputTokens?: number;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    providerOptions?: Record<string, Record<string, unknown>>;
  }): Promise<{ object: T; usage: unknown }> {
    const { system, prompt } = this.prepare(params);
    const res = await this.track(() => (aiGenerateObject as unknown as (p: Record<string, unknown>) => Promise<{ object: T; usage: unknown }>)({
      ...params,
      model: this.model,
      system,
      prompt,
    }));
    return { object: this.masker.rehydrateDeep(res.object), usage: res.usage };
  }
}
