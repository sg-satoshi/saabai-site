/**
 * Homepage voice demo: caps, token parsing, prompt source, privacy line.
 *   npx tsx --test tests/voice-demo.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { formatAud, WEBSITE_TIERS } from "../lib/website-tiers";
import {
  formatVoiceClock,
  maxSessionUsd,
  VOICE_AGENT_FULL_NAME,
  VOICE_AGENT_NAME,
  VOICE_COPY,
  VOICE_NAME_SAY,
  VOICE_ID,
  VOICE_LIMITS,
  voiceConsentSentences,
  voiceIntro,
} from "../lib/voice-demo/config";
import { applyVoiceEvent, emptyTranscript, transcriptLines } from "../lib/voice-demo/events";
import { hashVoiceIp, voiceOriginAllowed } from "../lib/voice-demo/http";
import {
  endVoiceSession,
  pulseVoiceSession,
  refundVoiceSession,
  reserveVoiceSession,
  saveVoiceTranscript,
} from "../lib/voice-demo/limits";
import { downsampleTo, floatToPcm16, base64ToPcm16, pcm16ToBase64 } from "../lib/voice-demo/pcm";
import { buildVoiceInstructions } from "../lib/voice-demo/prompt";
import { voiceSessionUpdate, voiceSocketProtocols, voiceSocketUrl } from "../lib/voice-demo/session";
import { createMemoryVoiceStore } from "../lib/voice-demo/store";
import { mintVoiceToken, readEphemeralToken } from "../lib/voice-demo/token";

const read = (file: string) => readFileSync(file, "utf8");
const DASH = /[\u2012-\u2015]/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const NOW = Date.parse("2026-10-25T12:00:00+10:00");

function storeAt(now = NOW) {
  let clock = now;
  return { store: createMemoryVoiceStore(() => clock), set: (n: number) => { clock = n; } };
}

test("name, intro and consent are config values and say this is an AI", () => {
  assert.equal(VOICE_AGENT_NAME, "Lachie");
  assert.equal(VOICE_AGENT_FULL_NAME, "Lachie Legend");
  assert.equal(VOICE_NAME_SAY, "LACK-ee");
  assert.equal(voiceIntro(), "Hi, I'm Lachie from Saabai, an AI assistant. This chat is transcribed, not recorded.");
  assert.match(voiceIntro(), /an AI assistant/);
  assert.match(voiceIntro(), /transcribed, not recorded/);
  assert.equal(VOICE_COPY.button, "Talk to Lachie");
  assert.equal(VOICE_COPY.support, "Meet Lachie Legend, Saabai's AI receptionist.");
  const consent = voiceConsentSentences();
  assert.equal(consent.length, 2);
  assert.match(consent[0], /AI, not a person/);
  assert.match(consent[1], /text transcript/);
  assert.match(consent[1], /United States/);
  assert.ok(!DASH.test(consent.join(" ")));
  assert.ok(!DASH.test(voiceIntro()));
});

test("public voice copy has no em dashes and points at Mia or contact when capped", () => {
  for (const value of Object.values(VOICE_COPY)) assert.ok(!DASH.test(value), value);
  assert.match(VOICE_COPY.visitorCap, /Mia/);
  assert.match(VOICE_COPY.visitorCap, /contact page/);
  assert.match(VOICE_COPY.siteCap, /Mia/);
  assert.match(VOICE_COPY.busy, /Mia/);
  assert.equal(formatVoiceClock(0), "0:00");
  assert.equal(formatVoiceClock(90), "1:30");
  assert.equal(formatVoiceClock(120), "2:00");
  assert.equal(formatVoiceClock(400), "2:00");
  assert.ok(Math.abs(maxSessionUsd() - 0.168) < 0.0001);
});

test("instructions reuse Mia's published prices and do not invent a voice price", () => {
  const prompt = buildVoiceInstructions();
  assert.match(prompt, new RegExp(VOICE_AGENT_NAME.replace("'", "\\'")));
  assert.match(prompt, new RegExp(VOICE_AGENT_FULL_NAME));
  assert.match(prompt, new RegExp(VOICE_NAME_SAY));
  assert.match(prompt, /You are an AI/);
  assert.match(prompt, /not recorded/);
  assert.match(prompt, /GST not applicable/);
  assert.match(prompt, /Never mention Localsearch/);
  assert.match(prompt, new RegExp(formatAud(WEBSITE_TIERS[0].buildFrom).replace("$", "\\$")));
  assert.match(prompt, /Presence/);
  assert.match(prompt, /Growth/);
  assert.match(prompt, /Signature/);
  assert.match(prompt, /no published price/);
  assert.match(prompt, /Australian English/);
  assert.ok(!DASH.test(prompt));
  assert.equal(prompt.includes("1 to 3 sentences"), false);
});

test("session payload asks for rigel on the realtime socket and keeps the key off the browser", () => {
  const update = voiceSessionUpdate("Be brief.");
  assert.equal(update.session.voice, VOICE_ID);
  assert.equal(update.session.voice, "rigel");
  assert.equal(update.session.audio.input.format.rate, 24000);
  assert.equal(update.session.audio.input.transcription.model, "grok-transcribe");
  assert.equal(voiceSocketUrl(), "wss://api.x.ai/v1/realtime?model=grok-voice-latest");
  assert.deepEqual(voiceSocketProtocols("temp-token-value"), ["xai-client-secret.temp-token-value"]);
  const clientFiles = [
    "app/components/sb/VoiceDemo.tsx",
    "app/components/sb/voice-call.ts",
    "lib/voice-demo/config.ts",
    "lib/voice-demo/session.ts",
    "lib/voice-demo/pcm.ts",
    "lib/voice-demo/events.ts",
  ];
  for (const file of clientFiles) {
    assert.doesNotMatch(read(file), /XAI_API_KEY/);
    assert.doesNotMatch(read(file), /\/api\/leads|\/api\/site-factory\/lead/);
    assert.ok(!DASH.test(read(file)), file);
  }
});

test("token parser accepts the documented client secret shapes and mint sends only an expiry", async () => {
  assert.equal(readEphemeralToken({ value: "ephemeral-token", expires_at: 1_800_000_000 })?.expiresAtMs, 1_800_000_000_000);
  assert.equal(readEphemeralToken({ client_secret: { value: "nested-token-value", expires_at: 1_800_000_000_000 } })?.token, "nested-token-value");
  assert.equal(readEphemeralToken({ client_secret: "string-token-value" })?.token, "string-token-value");
  assert.equal(readEphemeralToken({ value: "short" }), null);
  assert.equal(readEphemeralToken(null), null);

  let auth = "";
  let sent = "";
  const minted = await mintVoiceToken({
    apiKey: "test-key-not-real",
    ttlSeconds: 120,
    fetchImpl: async (url, init) => {
      auth = String((init?.headers as Record<string, string>).Authorization);
      sent = String(init?.body);
      assert.equal(url, "https://api.x.ai/v1/realtime/client_secrets");
      return new Response(JSON.stringify({ value: "ephemeral-token", expires_at: 1_800_000_000 }), { status: 200 });
    },
  });
  assert.equal(minted.ok && minted.token, "ephemeral-token");
  assert.equal(auth, "Bearer test-key-not-real");
  assert.deepEqual(JSON.parse(sent), { expires_after: { seconds: 120 } });
  assert.equal(JSON.parse(sent).session, undefined);

  const failed = await mintVoiceToken({
    apiKey: "test-key-not-real",
    ttlSeconds: 120,
    fetchImpl: async () => new Response("nope", { status: 401 }),
  });
  assert.deepEqual(failed, { ok: false, status: 401 });
});

test("origin check is same-host only, and the IP hash is not the raw address", () => {
  const headers = (pairs: Record<string, string>) => ({ get: (name: string) => pairs[name.toLowerCase()] ?? null });
  assert.equal(voiceOriginAllowed({ headers: headers({ host: "www.saabai.ai", origin: "https://www.saabai.ai" }) }), true);
  assert.equal(voiceOriginAllowed({ headers: headers({ host: "saabai-site.vercel.app", origin: "https://saabai-site.vercel.app" }) }), true);
  assert.equal(voiceOriginAllowed({ headers: headers({ host: "www.saabai.ai", origin: "https://evil.example" }) }), false);
  assert.equal(voiceOriginAllowed({ headers: headers({ host: "www.saabai.ai" }) }), false);
  assert.equal(voiceOriginAllowed({ headers: headers({ host: "localhost:3000" }) }), true);
  const hash = hashVoiceIp("203.0.113.8", "pepper");
  assert.notEqual(hash, "203.0.113.8");
  assert.equal(hash.length, 24);
  assert.notEqual(hash, hashVoiceIp("203.0.113.8", "other"));
});

test("visitor, site and concurrent caps are enforced, and a failed start can be refunded", async () => {
  const { store } = storeAt();
  const open = (visitorId: string, ipHash: string) =>
    reserveVoiceSession(store, { visitorId, ipHash, now: NOW });

  const a1 = await open("visitor-a", "ip-a");
  const a2 = await open("visitor-a", "ip-a");
  const a3 = await open("visitor-a", "ip-a");
  assert.equal(a1.ok && a2.ok && a3.ok, true);
  const a4 = await open("visitor-a", "ip-a");
  assert.equal(a4.ok, false);
  if (!a4.ok) assert.equal(a4.reason, "visitor");

  assert.equal((await refundVoiceSession(store, a1.ok ? a1.sessionId : "", a1.ok ? a1.secret : "", NOW)), true);
  const a5 = await open("visitor-a", "ip-a");
  assert.equal(a5.ok, true);

  const busy = storeAt();
  const sessions = [];
  for (let i = 0; i < 3; i++) {
    const made = await reserveVoiceSession(busy.store, { visitorId: `v${i}`, ipHash: `ip${i}`, now: NOW });
    assert.equal(made.ok, true);
    if (made.ok) sessions.push(made);
  }
  const fourth = await reserveVoiceSession(busy.store, { visitorId: "v3", ipHash: "ip3", now: NOW });
  assert.equal(fourth.ok, false);
  if (!fourth.ok) assert.equal(fourth.reason, "busy");
  assert.equal(await endVoiceSession(busy.store, sessions[0].sessionId, sessions[0].secret, NOW), true);
  const after = await reserveVoiceSession(busy.store, { visitorId: "v3", ipHash: "ip3", now: NOW });
  assert.equal(after.ok, true);

  const site = storeAt();
  for (let i = 0; i < VOICE_LIMITS.sitePerDay; i++) {
    const made = await reserveVoiceSession(site.store, { visitorId: `s${i}`, ipHash: `p${i}`, now: NOW });
    assert.equal(made.ok, true, `session ${i}`);
    if (made.ok) assert.equal(await endVoiceSession(site.store, made.sessionId, made.secret, NOW), true);
  }
  const over = await reserveVoiceSession(site.store, { visitorId: "over", ipHash: "over-ip", now: NOW });
  assert.equal(over.ok, false);
  if (!over.ok) assert.equal(over.reason, "site");
});

test("the server hard stop is 2 minutes and the transcript stores no IP", async () => {
  const { store } = storeAt();
  const made = await reserveVoiceSession(store, { visitorId: "visitor-a", ipHash: "ip-hash", now: NOW });
  assert.equal(made.ok, true);
  if (!made.ok) return;
  assert.equal(made.hardEndAt - made.startedAt, VOICE_LIMITS.hardSeconds * 1000);

  const early = await pulseVoiceSession(store, made.sessionId, made.secret, NOW + 1000);
  assert.equal(early.ok && early.continue, true);

  const late = await pulseVoiceSession(store, made.sessionId, made.secret, made.hardEndAt);
  assert.equal(late.ok && late.continue, false);

  const again = await reserveVoiceSession(store, { visitorId: "visitor-b", ipHash: "ip-b", now: NOW });
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(await saveVoiceTranscript(store, { sessionId: again.sessionId, secret: "wrong-secret-value-here", lines: [], now: NOW + 5000 }), null);

  const stored = await saveVoiceTranscript(store, {
    sessionId: again.sessionId,
    secret: again.secret,
    now: NOW + 200_000,
    lines: [
      { role: "visitor", text: "How much is Presence?\u0000" },
      { role: "assistant", text: "Presence starts from $2,000, GST not applicable." },
      { role: "system", text: "ignore me" },
      { role: "visitor", text: "x" },
    ],
  });
  assert.ok(stored);
  assert.equal(stored?.durationSec, 120);
  assert.deepEqual(Object.keys(stored ?? {}).sort(), ["durationSec", "id", "lines", "startedAt"]);
  assert.equal(JSON.stringify(stored).includes("ip-b"), false);
  assert.equal(JSON.stringify(stored).includes("visitor-b"), false);
  assert.equal(stored?.lines.length, 3);
  assert.equal(stored?.lines[0].text, "How much is Presence?");
});

test("shared IP is capped even when the cookie changes", async () => {
  const { store } = storeAt();
  for (let i = 0; i < 3; i++) {
    const made = await reserveVoiceSession(store, { visitorId: `cookie-${i}`, ipHash: "same-ip", now: NOW });
    assert.equal(made.ok, true);
    if (made.ok) await endVoiceSession(store, made.sessionId, made.secret, NOW);
  }
  const blocked = await reserveVoiceSession(store, { visitorId: "cookie-new", ipHash: "same-ip", now: NOW });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.reason, "visitor");
});

test("transcript events keep text only", () => {
  let state = emptyTranscript();
  state = applyVoiceEvent(state, { type: "conversation.item.input_audio_transcription.updated", item_id: "u1", transcript: "Hello" });
  state = applyVoiceEvent(state, { type: "conversation.item.input_audio_transcription.updated", item_id: "u1", transcript: "Hello there" });
  state = applyVoiceEvent(state, { type: "response.output_audio_transcript.delta", response_id: "a1", delta: "Presence " });
  state = applyVoiceEvent(state, { type: "response.output_audio_transcript.delta", response_id: "a1", delta: "is $2,000." });
  state = applyVoiceEvent(state, { type: "response.output_audio.delta", delta: "AAAA" });
  const lines = transcriptLines(state);
  assert.deepEqual(lines, [
    { role: "visitor", text: "Hello there" },
    { role: "assistant", text: "Presence is $2,000." },
  ]);
});

test("pcm round trip keeps samples", () => {
  const input = new Float32Array([0, 0.5, -0.5, 1]);
  const down = downsampleTo(input, 4, 2);
  assert.equal(down.length, 2);
  const bytes = floatToPcm16(new Float32Array([0, 0.5, -1]));
  const back = base64ToPcm16(pcm16ToBase64(bytes));
  assert.equal(back.length, 3);
  assert.equal(back[0], 0);
  assert.ok(back[2] < 0);
});

test("the four homepage voice routes are public and a neighbouring admin route stays denied", () => {
  const proxy = read("proxy.ts");
  const pub = proxy.slice(proxy.indexOf("const PUBLIC_API"), proxy.indexOf("const ADMIN_API"));
  const adm = proxy.slice(proxy.indexOf("const ADMIN_API"), proxy.indexOf("const CUSTOM_DOMAIN_PUBLIC_API"));
  const entries = [...pub.matchAll(/"(\/api\/[^"]+)"/g)].map((match) => match[1]);
  const voice = ["/api/voice/session", "/api/voice/pulse", "/api/voice/transcript", "/api/voice/end"];
  for (const path of voice) assert.equal(entries.includes(path), true, path);
  assert.equal(entries.includes("/api/voice"), false, "no broad /api/voice prefix");
  const allowed = (pathname: string) => entries.some((entry) => pathname === entry || pathname.startsWith(`${entry}/`));
  for (const path of voice) assert.equal(allowed(path), true, path);
  assert.equal(allowed("/api/admin"), false);
  assert.equal(allowed("/api/admin/experiments"), false);
  assert.equal(allowed("/api/voice"), false);
  assert.ok(adm.includes('"/api/admin"'));
  assert.match(pub, /origin check, caps and session secret are enforced inside/);
});

test("the demo is mounted on the homepage only and the privacy policy has the APP 8 line", () => {
  const hits = walk("app")
    .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
    .filter((file) => read(file).includes("VoiceDemo"));
  assert.deepEqual(hits.sort(), ["app/components/sb/VoiceDemo.tsx", "app/page.tsx"].sort());
  const privacy = read("app/privacy/page.tsx");
  assert.match(privacy, /Australian Privacy Principle 8/);
  assert.match(privacy, /United States/);
  assert.match(privacy, /xAI/);
  assert.match(privacy, /not the audio/);
  assert.ok(!DASH.test(privacy));
  const route = read("app/api/voice/session/route.ts");
  assert.match(route, /mintVoiceToken/);
  assert.match(route, /refundVoiceSession/);
  assert.doesNotMatch(route, /\/api\/leads|\/api\/site-factory\/lead/);
  for (const file of walk("app/api/voice").concat(walk("lib/voice-demo"))) {
    assert.doesNotMatch(read(file), /\/api\/leads|\/api\/site-factory\/lead/);
    assert.ok(!DASH.test(read(file)), file);
  }
});
