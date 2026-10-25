#!/usr/bin/env node
/**
 * Lex privacy guard (CI and every Vercel build, via npm "prebuild").
 *
 * Fails if any Lex code can reach an AI model without going through lib/lex-privacy/gateway.ts:
 *   - imports a provider package (@ai-sdk/*, openai, @anthropic-ai/sdk, ...)
 *   - calls the AI SDK directly (streamText, generateText, generateObject, streamObject, embed)
 *   - builds a model itself (buildModelFromConfig, getLexModelForFirm, getPremiumModel, modelFromSpec, ...)
 *   - fetches an AI provider's API directly
 * Plain Node, no dependencies, so it runs before anything else in the build.
 *   node scripts/check-lex-gateway.mjs            exit 1 on a violation
 *   node scripts/check-lex-gateway.mjs --json     machine readable report
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();

/** The only files allowed to touch providers and models on Lex's behalf. */
export const ALLOWED = new Set(["lib/lex-privacy/gateway.ts", "lib/lex-model.ts"]);

/** Lex code: routes, pages, components and libs. */
export function isLexFile(rel) {
  const p = rel.split(sep).join("/");
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p)) return false;
  return (
    /^app\/api\/lex[-/]/.test(p) ||
    /^app\/lex(-[a-z-]+)?\//.test(p) ||
    /^app\/saabai-admin\/lex[-/]/.test(p) ||
    /^app\/api\/admin\/lex[-/]/.test(p) ||
    /^lib\/lex[-/]/.test(p) ||
    /^components\/lex[-/]/i.test(p)
  );
}

const PROVIDER_PKG = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](@ai-sdk\/[^"']+|openai|@anthropic-ai\/sdk|@google\/generative-ai|@google\/genai|groq-sdk|@mistralai\/[^"']+|cohere-ai|@aws-sdk\/client-bedrock[^"']*|ollama)["']/g;
const AI_CALLS = /\b(streamText|generateText|generateObject|streamObject|embed|embedMany|generateImage|experimental_generateImage)\s*(?:<[^()]*>)?\s*\(/g;
const AI_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']ai["']/g;
const MODEL_BUILDERS = /\b(buildModelFromConfig|getLexModelForFirm|getLexResearchModel|getPremiumModel|modelFromSpec|createAnthropic|createOpenAI|createGoogleGenerativeAI|createXai)\s*\(/g;
const PROVIDER_HOSTS = /https?:\/\/(?:api\.anthropic\.com|api\.openai\.com|api\.x\.ai|generativelanguage\.googleapis\.com|openrouter\.ai|api\.groq\.com|api\.mistral\.ai|api\.together\.xyz|api\.cohere\.ai|bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com)/g;
const BANNED_AI_IMPORTS = new Set(["streamText", "generateText", "generateObject", "streamObject", "embed", "embedMany", "generateImage", "experimental_generateImage"]);

function stripComments(src) {
  // Keep line breaks so reported line numbers match the file.
  return src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, "")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

export function checkSource(rel, src) {
  const problems = [];
  const code = stripComments(src);
  const line = (idx) => code.slice(0, idx).split("\n").length;
  for (const m of code.matchAll(PROVIDER_PKG)) problems.push({ file: rel, line: line(m.index), rule: "provider-import", detail: m[1] });
  for (const m of code.matchAll(AI_IMPORT)) {
    for (const name of m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0])) {
      if (BANNED_AI_IMPORTS.has(name) && !/^\s*type\b/.test(m[0].slice(6))) problems.push({ file: rel, line: line(m.index), rule: "ai-sdk-call-import", detail: name });
    }
  }
  // Calls through the gateway (gw.streamText, this.x.generateText) are fine; bare calls are not.
  for (const m of code.matchAll(AI_CALLS)) {
    const before = code.slice(Math.max(0, m.index - 2), m.index);
    if (/[.\w]$/.test(before)) continue;
    if (/function\s+$/.test(code.slice(Math.max(0, m.index - 10), m.index))) continue;
    problems.push({ file: rel, line: line(m.index), rule: "ai-sdk-call", detail: m[1] });
  }
  for (const m of code.matchAll(MODEL_BUILDERS)) {
    const before = code.slice(Math.max(0, m.index - 10), m.index);
    if (/function\s+$/.test(before)) continue;
    problems.push({ file: rel, line: line(m.index), rule: "model-builder", detail: m[1] });
  }
  for (const m of code.matchAll(PROVIDER_HOSTS)) problems.push({ file: rel, line: line(m.index), rule: "provider-host", detail: m[0] });
  return problems;
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git" || name === ".vercel") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(relative(ROOT, full));
  }
  return out;
}

export function run() {
  const files = [...walk(join(ROOT, "app"), []), ...walk(join(ROOT, "lib"), []), ...(safeExists("components") ? walk(join(ROOT, "components"), []) : [])];
  const lex = files.filter(isLexFile).filter((f) => !ALLOWED.has(f.split(sep).join("/")));
  const problems = lex.flatMap((f) => checkSource(f.split(sep).join("/"), readFileSync(join(ROOT, f), "utf8")));
  return { checked: lex.length, problems };
}

function safeExists(d) {
  try { return statSync(join(ROOT, d)).isDirectory(); } catch { return false; }
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const { checked, problems } = run();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ checked, problems }, null, 2));
  } else if (problems.length) {
    console.error(`Lex privacy guard: ${problems.length} problem(s). Lex code must call models through lib/lex-privacy/gateway.ts.`);
    for (const p of problems) console.error(`  ${p.file}:${p.line}  ${p.rule}  ${p.detail}`);
  } else {
    console.log(`Lex privacy guard: ok (${checked} Lex files, every model call goes through the gateway).`);
  }
  process.exit(problems.length ? 1 : 0);
}
