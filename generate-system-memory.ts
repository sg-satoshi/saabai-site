import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const PROJECT_ROOT = process.cwd();
const OUTPUT_FILE = path.join(PROJECT_ROOT, ".atlas-system-memory.json");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vercel",
  "dist",
  "build",
  ".turbo",
]);

const MAX_FILE_SUMMARY_CHARS = 8000;
const MAX_FILES_TO_SUMMARIZE = 80;

type SystemMemory = {
  domainIndex: Record<string, string[]>;
  fileSummaries: Record<string, string>;
};

function isIgnored(name: string): boolean {
  return IGNORE_DIRS.has(name);
}

function listAllFiles(dir: string, baseDir = dir): string[] {
  let results: string[] = [];

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (isIgnored(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      results = results.concat(listAllFiles(fullPath, baseDir));
    } else {
      results.push(relPath);
    }
  }

  return results;
}

function shouldIncludeFile(file: string): boolean {
  const lower = file.toLowerCase();

  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".json") ||
    lower.endsWith(".md")
  ) {
    return true;
  }

  return false;
}

function rankFile(file: string): number {
  let score = 0;
  const lower = file.toLowerCase();

  if (lower.startsWith("lib/")) score += 20;
  if (lower.startsWith("app/api/")) score += 18;
  if (lower === "readme.md") score += 25;
  if (lower === "claude.md") score += 25;
  if (lower.includes("config")) score += 8;
  if (lower.includes("knowledge")) score += 10;
  if (lower.includes("pricing")) score += 10;
  if (lower.includes("analytics")) score += 8;
  if (lower.includes("portal")) score += 6;
  if (lower.includes("linkedin")) score += 6;
  if (lower.includes("instagram")) score += 6;
  if (lower.endsWith(".md")) score += 5;

  return score;
}

function selectFilesForSummary(files: string[]): string[] {
  return files
    .filter(shouldIncludeFile)
    .sort((a, b) => rankFile(b) - rankFile(a) || a.localeCompare(b))
    .slice(0, MAX_FILES_TO_SUMMARIZE);
}

function readFileSafe(relPath: string): string {
  try {
    const fullPath = path.join(PROJECT_ROOT, relPath);
    const raw = fs.readFileSync(fullPath, "utf8");
    return raw.length > MAX_FILE_SUMMARY_CHARS
      ? `${raw.slice(0, MAX_FILE_SUMMARY_CHARS)}\n\n[Truncated]`
      : raw;
  } catch (error) {
    return `[Read error: ${error instanceof Error ? error.message : "Unknown error"}]`;
  }
}

function inferDomain(file: string): string[] {
  const lower = file.toLowerCase();
  const domains: string[] = [];

  if (lower.includes("rex")) domains.push("rex");
  if (lower.includes("lex")) domains.push("lex");
  if (lower.includes("pipedrive")) domains.push("crm");
  if (lower.includes("woo")) domains.push("commerce");
  if (lower.includes("portal")) domains.push("portal");
  if (lower.includes("analytics")) domains.push("analytics");
  if (lower.includes("linkedin")) domains.push("linkedin");
  if (lower.includes("instagram")) domains.push("instagram");
  if (lower.includes("chat")) domains.push("chat");
  if (lower.includes("config")) domains.push("config");
  if (lower.includes("prompt")) domains.push("prompting");
  if (lower.startsWith("app/api/")) domains.push("api");

  return [...new Set(domains)];
}

async function summarizeFile(file: string): Promise<string> {
  const content = readFileSafe(file);

  const result = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: `
You are summarizing a codebase file for an internal AI system memory index.

Write a concise 1-2 sentence summary of what this file does.
Focus on:
- business purpose
- technical role
- where it fits in the system

Be concrete. No fluff. No markdown. No bullet points.

FILE PATH:
${file}

FILE CONTENT:
${content}
    `,
  });

  return result.text.trim();
}

async function buildSystemMemory(): Promise<SystemMemory> {
  const allFiles = listAllFiles(PROJECT_ROOT);
  const selectedFiles = selectFilesForSummary(allFiles);

  const domainIndex: Record<string, string[]> = {};
  const fileSummaries: Record<string, string> = {};

  for (const file of selectedFiles) {
    const domains = inferDomain(file);

    for (const domain of domains) {
      if (!domainIndex[domain]) domainIndex[domain] = [];
      domainIndex[domain].push(file);
    }

    try {
      const summary = await summarizeFile(file);
      fileSummaries[file] = summary;
      console.log(`Summarized: ${file}`);
    } catch (error) {
      fileSummaries[file] = `Summary failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      console.log(`Failed: ${file}`);
    }
  }

  for (const key of Object.keys(domainIndex)) {
    domainIndex[key] = [...new Set(domainIndex[key])].sort();
  }

  return {
    domainIndex,
    fileSummaries,
  };
}

async function main() {
  console.log("Building Atlas system memory...");
  const memory = await buildSystemMemory();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(memory, null, 2), "utf8");
  console.log(`Done. Wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Generator failed:", error);
  process.exit(1);
});