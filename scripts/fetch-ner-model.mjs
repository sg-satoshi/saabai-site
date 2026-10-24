#!/usr/bin/env node
/**
 * Fetches the open-source NER model Lex runs inside its own functions (prebuild, and before tests).
 * Model: onnx-community/distilbert-NER-ONNX (quantised), from dslim/distilbert-NER, Apache-2.0.
 * Pinned to one revision and checked by SHA-256. Weights only: no client data is sent anywhere.
 * If the download fails the build still succeeds and Lex falls back to patterns plus matter parties.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const NER_MODEL = "onnx-community/distilbert-NER-ONNX";
export const NER_REVISION = "3a19fe9404a4469d91aa3d551558a97f68872f67";
const FILES = {
  "config.json": "f109facddb205dac712adf5877e4315fae62041bc0916fe808d92abdb594d1fe",
  "tokenizer.json": "cb26b43c98e8266ae3e99c2a583cf8315d73b33a17e6b20b4df7ff1f22392d34",
  "tokenizer_config.json": "3c02f7e3bd40e2aca0235ca42256609fd0cd7d883226e17ddea667f1b1314665",
  "onnx/model_quantized.onnx": "9419a876387ff2bbe5f21ab7429c7bef93eac86c50353390d4d8fca6e4a210d8",
};
const DIR = join(process.cwd(), "models", NER_MODEL);
const sha = (b) => createHash("sha256").update(b).digest("hex");

async function main() {
  if (process.env.LEX_NER === "off") return console.log("NER model: skipped (LEX_NER=off)");
  for (const [file, want] of Object.entries(FILES)) {
    const dest = join(DIR, file);
    if (existsSync(dest) && sha(readFileSync(dest)) === want) continue;
    const url = `https://huggingface.co/${NER_MODEL}/resolve/${NER_REVISION}/${file}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha(buf) !== want) throw new Error(`${file}: checksum mismatch`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
  }
  console.log(`NER model: ready (${NER_MODEL}@${NER_REVISION.slice(0, 7)})`);
}

main().catch((err) => {
  console.warn(`NER model: not available, Lex will use patterns and matter parties only (${err instanceof Error ? err.message : "error"})`);
});
