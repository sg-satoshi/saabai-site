import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import readline from "readline";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PROJECT_ROOT = process.cwd();
const MEMORY_FILE = path.join(PROJECT_ROOT, ".atlas-memory.json");
const CACHE_FILE = path.join(PROJECT_ROOT, ".atlas-cache.json");
const SYSTEM_MEMORY_FILE = path.join(PROJECT_ROOT, ".atlas-system-memory.json");
const APPROVALS_FILE = path.join(PROJECT_ROOT, ".atlas-approvals.json");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vercel",
  "dist",
  "build",
  ".turbo",
]);

const BLOCKED_WRITE_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  "node_modules/",
  ".git/",
];

const ALLOWED_COMMAND_PREFIXES = [
  "pwd",
  "ls",
  "cat ",
  "git status",
  "git diff",
  "git add ",
  "git commit ",
  "git push",
  "git pull",
  "git branch",
  "git remote -v",
  "git remote set-url ",
  "npm run ",
  "npm install",
  "npm ci",
  "npx ",
  "vercel",
  "which git",
  "which vercel",
];

const MAX_TREE_ITEMS = 400;
const MAX_FILE_CHARS = 12000;
const MAX_CONTEXT_CHARS = 30000;
const MAX_FIND_RESULTS = 30;
const MAX_READ_CHARS = 12000;
const MAX_MEMORY_ITEMS = 20;
const MAX_MEMORY_CHARS = 10000;
const MAX_CACHE_ENTRIES = 100;
const MAX_WORKING_MEMORY_CHARS = 5000;
const MAX_SYSTEM_MEMORY_CHARS = 8000;
const MAX_COMMAND_OUTPUT_CHARS = 12000;
const MAX_PLAN_STEPS = 12;

const IMPORTANT_DOC_FILES = [
  "README.md",
  "CLAUDE.md",
  "IMPLEMENTATION_SUMMARY.md",
  "COMPLETION_REPORT.md",
  "DEPLOYMENT_SUMMARY.md",
  "DEPLOYMENT_READY.md",
  "DESIGN_SYSTEM.md",
  "QUICK_WIN_COMPLETION_REPORT.md",
  "QUICK_WINS_CODE_DIFF.md",
  "QUICK_WINS_README.md",
  "CHANGES_DIFF.md",
];

const IMPORTANT_CODE_FILES = [
  "lib/rex-pricing-engine.ts",
  "lib/rex-knowledge.ts",
  "lib/rex-config.ts",
  "lib/rex-stats.ts",
  "lib/lex-knowledge.ts",
  "lib/lex-tools.ts",
  "lib/lex-config.ts",
  "lib/chat-prompt.ts",
  "lib/chat-config.ts",
  "lib/pipedrive-client.ts",
  "lib/woo-client.ts",
  "lib/clients.ts",
  "lib/portal-config.ts",
  "lib/api-response.ts",
  "proxy.ts",
  "next.config.ts",
  "package.json",
  "vercel.json",
];

type MemoryEntry = {
  timestamp: string;
  user: string;
  assistant: string;
};

type WorkingMemory = {
  activeProjectFocus: string[];
  architectureDecisions: string[];
  unresolvedIssues: string[];
  businessRules: string[];
  nextPriorities: string[];
  lastUpdated: string | null;
};

type MemoryStore = {
  interactions: MemoryEntry[];
  workingMemory: WorkingMemory;
};

type FileCacheEntry = {
  path: string;
  cachedAt: string;
  content: string;
};

type CacheStore = {
  files: FileCacheEntry[];
};

type SystemMemory = {
  domainIndex: Record<string, string[]>;
  fileSummaries: Record<string, string>;
};

type ApprovalCategory = "PATCH" | "WRITE" | "RUN_SAFE" | "GIT_PUSH" | "DEPLOY";

type ApprovalStore = {
  autoApprove: Record<ApprovalCategory, boolean>;
  fullAuthority: boolean;
};

type Intent = "QUESTION" | "INVESTIGATE" | "MODIFY" | "EXECUTE";

type PlanStep =
  | {
      type: "PATCH";
      path: string;
      find: string;
      replace: string;
      summary: string;
    }
  | {
      type: "WRITE";
      path: string;
      content: string;
      summary: string;
    }
  | {
      type: "RUN";
      command: string;
      summary: string;
    }
  | {
      type: "ANSWER";
      answer: string;
    };

type ImplementationPlan =
  | {
      mode: "PLAN";
      summary: string;
      steps: PlanStep[];
    }
  | {
      mode: "ANSWER";
      answer: string;
    };

type StepResult = {
  ok: boolean;
  message: string;
};

type CommandResult = {
  ok: boolean;
  output: string;
};

type PendingAction = {
  step: Exclude<PlanStep, { type: "ANSWER" }>;
  remainingSteps: PlanStep[];
};

let pendingAction: PendingAction | null = null;
let lastRunOutput = "";

class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private index = 0;
  private timer: NodeJS.Timeout | null = null;
  private text = "";

  start(text: string) {
    this.stop();
    this.text = text;
    this.timer = setInterval(() => {
      const frame = this.frames[this.index % this.frames.length];
      if (typeof process.stdout.write === "function") {
        process.stdout.write(`\r${frame} ${this.text}`);
      }
      this.index += 1;
    }, 80);
  }

  stop(finalText?: string) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (typeof process.stdout.write === "function") {
      process.stdout.write("\r");
    }

    const stdoutAny = process.stdout as unknown as {
      clearLine?: (dir: number) => void;
      cursorTo?: (x: number) => void;
    };

    if (typeof stdoutAny.clearLine === "function") {
      stdoutAny.clearLine(0);
    }
    if (typeof stdoutAny.cursorTo === "function") {
      stdoutAny.cursorTo(0);
    }

    if (finalText) {
      console.log(finalText);
    }
  }
}

const spinner = new Spinner();

async function withThinking<T>(label: string, fn: () => Promise<T>): Promise<T> {
  spinner.start(label);
  try {
    const result = await fn();
    spinner.stop(`✅ ${label} done`);
    return result;
  } catch (error) {
    spinner.stop(`❌ ${label} failed`);
    throw error;
  }
}

function createEmptyWorkingMemory(): WorkingMemory {
  return {
    activeProjectFocus: [],
    architectureDecisions: [],
    unresolvedIssues: [],
    businessRules: [],
    nextPriorities: [],
    lastUpdated: null,
  };
}

function createDefaultApprovals(): ApprovalStore {
  return {
    autoApprove: {
      PATCH: false,
      WRITE: false,
      RUN_SAFE: false,
      GIT_PUSH: false,
      DEPLOY: false,
    },
    fullAuthority: false,
  };
}

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function isIgnored(name: string): boolean {
  return IGNORE_DIRS.has(name);
}

function safeResolvePath(relPath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, relPath);
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error("Path escapes project root");
  }
  return resolved;
}

function isWritablePath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  return !BLOCKED_WRITE_PATHS.some((blocked) => {
    if (blocked.endsWith("/")) {
      return normalized.startsWith(blocked);
    }
    return normalized === blocked;
  });
}

function isAllowedCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  return ALLOWED_COMMAND_PREFIXES.some((prefix) => trimmed === prefix || trimmed.startsWith(prefix));
}

function getCommandCategory(command: string): ApprovalCategory {
  const trimmed = command.trim().toLowerCase();

  if (trimmed.includes("vercel") && trimmed.includes("--prod")) {
    return "DEPLOY";
  }

  if (trimmed.startsWith("git push")) {
    return "GIT_PUSH";
  }

  return "RUN_SAFE";
}

function loadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fileExists(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJsonFile(filePath: string, data: unknown): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore
  }
}

function loadApprovals(): ApprovalStore {
  const data = loadJsonFile<ApprovalStore>(APPROVALS_FILE, createDefaultApprovals());
  return {
    autoApprove: {
      PATCH: Boolean(data.autoApprove?.PATCH),
      WRITE: Boolean(data.autoApprove?.WRITE),
      RUN_SAFE: Boolean(data.autoApprove?.RUN_SAFE),
      GIT_PUSH: Boolean(data.autoApprove?.GIT_PUSH),
      DEPLOY: Boolean(data.autoApprove?.DEPLOY),
    },
    fullAuthority: Boolean(data.fullAuthority),
  };
}

function saveApprovals(approvals: ApprovalStore): void {
  saveJsonFile(APPROVALS_FILE, approvals);
}

function setAutoApprove(category: ApprovalCategory, value: boolean): void {
  const approvals = loadApprovals();
  approvals.autoApprove[category] = value;
  saveApprovals(approvals);
}

function isAutoApproved(category: ApprovalCategory): boolean {
  const approvals = loadApprovals();
  return approvals.fullAuthority || approvals.autoApprove[category] === true;
}

function setFullAuthority(value: boolean): void {
  const approvals = loadApprovals();
  approvals.fullAuthority = value;
  saveApprovals(approvals);
}

function hasFullAuthority(): boolean {
  return loadApprovals().fullAuthority === true;
}

function loadSystemMemory(): SystemMemory {
  return loadJsonFile<SystemMemory>(SYSTEM_MEMORY_FILE, {
    domainIndex: {},
    fileSummaries: {},
  });
}

function detectRelevantDomains(query: string, systemMemory: SystemMemory): string[] {
  const lowerQuery = query.toLowerCase();
  const matched = new Set<string>();

  for (const domain of Object.keys(systemMemory.domainIndex)) {
    if (lowerQuery.includes(domain.toLowerCase())) {
      matched.add(domain);
    }
  }

  const aliasMap: Record<string, string[]> = {
    crm: ["pipedrive", "crm", "lead", "leads"],
    commerce: ["woo", "woocommerce", "checkout", "cart", "order"],
    analytics: ["analytics", "stats", "tracking", "dashboard", "conversion"],
    portal: ["portal", "login", "auth", "session"],
    rex: ["rex", "pricing", "quote", "quotes", "plastic", "plastics", "widget"],
    lex: ["lex", "legal", "intake", "review", "law"],
    linkedin: ["linkedin"],
    instagram: ["instagram"],
    api: ["api", "route", "endpoint"],
    chat: ["chat", "widget", "assistant"],
    config: ["config", "configuration", "settings"],
    prompting: ["prompt", "prompting"],
    admin: ["admin", "dashboard", "portal", "login"],
    theme: ["theme", "dark mode", "dark", "light mode", "light", "css", "globals.css"],
  };

  for (const [domain, aliases] of Object.entries(aliasMap)) {
    if (aliases.some((alias) => lowerQuery.includes(alias))) {
      if (systemMemory.domainIndex[domain]) {
        matched.add(domain);
      }
    }
  }

  return [...matched];
}

function buildSystemMemoryContext(query?: string): string {
  const memory = loadSystemMemory();

  if (!query) {
    const fallback = JSON.stringify(
      {
        domainIndex: memory.domainIndex,
        fileSummaries: Object.fromEntries(Object.entries(memory.fileSummaries).slice(0, 20)),
      },
      null,
      2,
    );

    return fallback.length > MAX_SYSTEM_MEMORY_CHARS
      ? `${fallback.slice(0, MAX_SYSTEM_MEMORY_CHARS)}\n\n[System memory truncated at ${MAX_SYSTEM_MEMORY_CHARS} chars]`
      : fallback;
  }

  const relevantDomains = detectRelevantDomains(query, memory);

  if (!relevantDomains.length) {
    const fallback = JSON.stringify(
      {
        domainIndex: memory.domainIndex,
        fileSummaries: Object.fromEntries(Object.entries(memory.fileSummaries).slice(0, 15)),
      },
      null,
      2,
    );

    return fallback.length > MAX_SYSTEM_MEMORY_CHARS
      ? `${fallback.slice(0, MAX_SYSTEM_MEMORY_CHARS)}\n\n[System memory truncated at ${MAX_SYSTEM_MEMORY_CHARS} chars]`
      : fallback;
  }

  const selectedFiles = new Set<string>();
  for (const domain of relevantDomains) {
    for (const file of memory.domainIndex[domain] || []) {
      selectedFiles.add(file);
    }
  }

  const targeted = {
    relevantDomains,
    domainIndex: Object.fromEntries(
      relevantDomains.map((domain) => [domain, memory.domainIndex[domain] || []]),
    ),
    fileSummaries: Object.fromEntries(
      [...selectedFiles]
        .filter((file) => memory.fileSummaries[file])
        .map((file) => [file, memory.fileSummaries[file]]),
    ),
  };

  const text = JSON.stringify(targeted, null, 2);

  return text.length > MAX_SYSTEM_MEMORY_CHARS
    ? `${text.slice(0, MAX_SYSTEM_MEMORY_CHARS)}\n\n[Targeted system memory truncated at ${MAX_SYSTEM_MEMORY_CHARS} chars]`
    : text;
}

function loadMemory(): MemoryStore {
  const data = loadJsonFile<MemoryStore>(MEMORY_FILE, {
    interactions: [],
    workingMemory: createEmptyWorkingMemory(),
  });

  return {
    interactions: Array.isArray(data.interactions)
      ? data.interactions.slice(-MAX_MEMORY_ITEMS)
      : [],
    workingMemory: data.workingMemory ?? createEmptyWorkingMemory(),
  };
}

function saveMemory(memory: MemoryStore): void {
  saveJsonFile(MEMORY_FILE, {
    interactions: memory.interactions.slice(-MAX_MEMORY_ITEMS),
    workingMemory: memory.workingMemory,
  });
}

function buildRecentConversationContext(): string {
  const memory = loadMemory();

  if (!memory.interactions.length) {
    return "No prior conversation memory available.";
  }

  const text = memory.interactions
    .map(
      (item, index) => `
MEMORY ${index + 1}
Time: ${item.timestamp}
User: ${item.user}
Assistant: ${item.assistant}
`.trim(),
    )
    .join("\n\n---\n\n");

  return text.length > MAX_MEMORY_CHARS
    ? `${text.slice(0, MAX_MEMORY_CHARS)}\n\n[Conversation memory truncated at ${MAX_MEMORY_CHARS} chars]`
    : text;
}

function buildWorkingMemoryContext(): string {
  const memory = loadMemory().workingMemory;

  const text = `
WORKING MEMORY
Last updated: ${memory.lastUpdated ?? "Never"}

ACTIVE PROJECT FOCUS:
${memory.activeProjectFocus.length ? memory.activeProjectFocus.map((x) => `- ${x}`).join("\n") : "- None"}

ARCHITECTURE DECISIONS:
${memory.architectureDecisions.length ? memory.architectureDecisions.map((x) => `- ${x}`).join("\n") : "- None"}

UNRESOLVED ISSUES:
${memory.unresolvedIssues.length ? memory.unresolvedIssues.map((x) => `- ${x}`).join("\n") : "- None"}

BUSINESS RULES / CONSTRAINTS:
${memory.businessRules.length ? memory.businessRules.map((x) => `- ${x}`).join("\n") : "- None"}

NEXT PRIORITIES:
${memory.nextPriorities.length ? memory.nextPriorities.map((x) => `- ${x}`).join("\n") : "- None"}
`.trim();

  return text.length > MAX_WORKING_MEMORY_CHARS
    ? `${text.slice(0, MAX_WORKING_MEMORY_CHARS)}\n\n[Working memory truncated at ${MAX_WORKING_MEMORY_CHARS} chars]`
    : text;
}

async function updateWorkingMemory(user: string, assistant: string): Promise<void> {
  const memory = loadMemory();

  const currentWorkingMemory = buildWorkingMemoryContext();
  const recentConversation = buildRecentConversationContext();

  try {
    const result = await withThinking("Updating working memory", async () =>
      generateText({
        model: anthropic("claude-sonnet-4-6"),
        prompt: `
You are updating a working memory file for an internal AI operator.

Maintain a concise summary of:
- active project focus
- architecture decisions
- unresolved issues
- business rules / constraints
- next priorities

Rules:
- concise
- high signal
- no fluff
- preserve important context
- max 8 items per list
- valid JSON only

Schema:
{
  "activeProjectFocus": ["..."],
  "architectureDecisions": ["..."],
  "unresolvedIssues": ["..."],
  "businessRules": ["..."],
  "nextPriorities": ["..."]
}

CURRENT WORKING MEMORY:
${currentWorkingMemory}

RECENT CONVERSATION MEMORY:
${recentConversation}

LATEST USER MESSAGE:
${user}

LATEST ASSISTANT MESSAGE:
${assistant}
        `,
      }),
    );

    const parsed = JSON.parse(result.text);

    memory.workingMemory = {
      activeProjectFocus: Array.isArray(parsed.activeProjectFocus)
        ? parsed.activeProjectFocus.slice(0, 8)
        : [],
      architectureDecisions: Array.isArray(parsed.architectureDecisions)
        ? parsed.architectureDecisions.slice(0, 8)
        : [],
      unresolvedIssues: Array.isArray(parsed.unresolvedIssues)
        ? parsed.unresolvedIssues.slice(0, 8)
        : [],
      businessRules: Array.isArray(parsed.businessRules)
        ? parsed.businessRules.slice(0, 8)
        : [],
      nextPriorities: Array.isArray(parsed.nextPriorities)
        ? parsed.nextPriorities.slice(0, 8)
        : [],
      lastUpdated: new Date().toISOString(),
    };

    saveMemory(memory);
  } catch {
    // ignore
  }
}

function appendMemory(user: string, assistant: string): void {
  const memory = loadMemory();

  memory.interactions.push({
    timestamp: new Date().toISOString(),
    user,
    assistant,
  });

  memory.interactions = memory.interactions.slice(-MAX_MEMORY_ITEMS);
  saveMemory(memory);
}

function loadCache(): CacheStore {
  const data = loadJsonFile<CacheStore>(CACHE_FILE, { files: [] });
  return {
    files: Array.isArray(data.files) ? data.files.slice(-MAX_CACHE_ENTRIES) : [],
  };
}

function saveCache(cache: CacheStore): void {
  saveJsonFile(CACHE_FILE, {
    files: cache.files.slice(-MAX_CACHE_ENTRIES),
  });
}

function getCachedFile(relPath: string): FileCacheEntry | null {
  const cache = loadCache();
  return cache.files.find((entry) => entry.path === relPath) ?? null;
}

function setCachedFile(relPath: string, content: string): void {
  const cache = loadCache();
  const filtered = cache.files.filter((entry) => entry.path !== relPath);
  filtered.push({
    path: relPath,
    cachedAt: new Date().toISOString(),
    content,
  });
  cache.files = filtered.slice(-MAX_CACHE_ENTRIES);
  saveCache(cache);
}

function safeReadFile(relPath: string, maxChars = MAX_FILE_CHARS): string {
  try {
    const fullPath = safeResolvePath(relPath);

    if (!fs.existsSync(fullPath)) {
      return `FILE: ${relPath}\n[Missing]`;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return `FILE: ${relPath}\n[Path is a directory, not a file]`;
    }

    const cached = getCachedFile(relPath);
    if (cached?.content) {
      const cachedContent =
        cached.content.length > maxChars
          ? `${cached.content.slice(0, maxChars)}\n\n[Truncated at ${maxChars} chars from cache]`
          : cached.content;

      return `FILE: ${relPath}\n${cachedContent}`;
    }

    const raw = fs.readFileSync(fullPath, "utf8");
    setCachedFile(relPath, raw);

    const content =
      raw.length > maxChars
        ? `${raw.slice(0, maxChars)}\n\n[Truncated at ${maxChars} chars]`
        : raw;

    return `FILE: ${relPath}\n${content}`;
  } catch (error) {
    return `FILE: ${relPath}\n[Read error: ${
      error instanceof Error ? error.message : "Unknown error"
    }]`;
  }
}

function safeWriteFile(relPath: string, content: string): StepResult {
  try {
    if (!isWritablePath(relPath)) {
      return { ok: false, message: `Blocked write path: ${relPath}` };
    }

    const fullPath = safeResolvePath(relPath);
    const dir = path.dirname(fullPath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
    setCachedFile(relPath, content);

    return { ok: true, message: `✅ Wrote file successfully: ${relPath}` };
  } catch (error) {
    return {
      ok: false,
      message: `❌ Write failed for ${relPath}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

function safePatchFile(relPath: string, find: string, replace: string): StepResult {
  try {
    if (!isWritablePath(relPath)) {
      return { ok: false, message: `Blocked patch path: ${relPath}` };
    }

    const fullPath = safeResolvePath(relPath);

    if (!fs.existsSync(fullPath)) {
      return { ok: false, message: `Patch failed: file not found: ${relPath}` };
    }

    const raw = fs.readFileSync(fullPath, "utf8");

    if (!raw.includes(find)) {
      return { ok: false, message: `Patch failed: target text not found in ${relPath}` };
    }

    const updated = raw.replace(find, replace);
    fs.writeFileSync(fullPath, updated, "utf8");
    setCachedFile(relPath, updated);

    return { ok: true, message: `✅ Patched file successfully: ${relPath}` };
  } catch (error) {
    return {
      ok: false,
      message: `❌ Patch failed for ${relPath}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

function detectCommandWarnings(output: string): string[] {
  const warnings: string[] = [];
  const lower = output.toLowerCase();

  if (lower.includes("failed to build") || lower.includes("failed to compile")) {
    warnings.push("Build output contains failure wording.");
  }

  if (lower.includes("warning:")) {
    warnings.push("Command output contains warnings.");
  }

  if (lower.includes("retrying")) {
    warnings.push("Command output includes retries.");
  }

  return warnings;
}

function runCommand(command: string): CommandResult {
  if (!isAllowedCommand(command)) {
    return {
      ok: false,
      output: `ERROR:\nBlocked command: ${command}`,
    };
  }

  spinner.start(`Running command: ${command}`);

  try {
    const output = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
      maxBuffer: 10 * 1024 * 1024,
    });

    spinner.stop(`✅ Command completed: ${command}`);

    const trimmed = output.trim();
    const finalOutput = trimmed || "[Command completed with no output]";
    const capped =
      finalOutput.length > MAX_COMMAND_OUTPUT_CHARS
        ? `${finalOutput.slice(0, MAX_COMMAND_OUTPUT_CHARS)}\n\n[Command output truncated at ${MAX_COMMAND_OUTPUT_CHARS} chars]`
        : finalOutput;

    const warnings = detectCommandWarnings(finalOutput);

    if (warnings.length > 0) {
      return {
        ok: true,
        output: `${capped}\n\nWarnings detected:\n- ${warnings.join("\n- ")}`,
      };
    }

    return {
      ok: true,
      output: capped,
    };
  } catch (error: any) {
    spinner.stop(`❌ Command failed: ${command}`);

    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    const message = typeof error?.message === "string" ? error.message : "Unknown command error";
    const combined = [stdout, stderr, message].filter(Boolean).join("\n");

    return {
      ok: false,
      output:
        combined.length > MAX_COMMAND_OUTPUT_CHARS
          ? `${combined.slice(0, MAX_COMMAND_OUTPUT_CHARS)}\n\n[Command output truncated at ${MAX_COMMAND_OUTPUT_CHARS} chars]`
          : combined,
    };
  }
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

function getFileTree(dir: string, prefix = ""): string[] {
  let tree: string[] = [];

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (isIgnored(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const displayName = prefix + entry.name + (entry.isDirectory() ? "/" : "");

    tree.push(displayName);

    if (tree.length >= MAX_TREE_ITEMS) return tree;

    if (entry.isDirectory()) {
      const childTree = getFileTree(fullPath, prefix + "  ");
      tree = tree.concat(childTree);

      if (tree.length >= MAX_TREE_ITEMS) {
        return tree.slice(0, MAX_TREE_ITEMS);
      }
    }
  }

  return tree.slice(0, MAX_TREE_ITEMS);
}

function buildProjectContext(): string {
  const tree = getFileTree(PROJECT_ROOT).join("\n");
  const docs = IMPORTANT_DOC_FILES.map((file) => safeReadFile(file)).join("\n\n---\n\n");
  const code = IMPORTANT_CODE_FILES.map((file) => safeReadFile(file)).join("\n\n---\n\n");

  const context = `
PROJECT ROOT:
${PROJECT_ROOT}

========================================
PROJECT FILE TREE
========================================
${tree}

========================================
PROJECT DOCUMENTATION
========================================
${docs}

========================================
CORE CODE / CONFIG
========================================
${code}
`.trim();

  return context.length > MAX_CONTEXT_CHARS
    ? `${context.slice(0, MAX_CONTEXT_CHARS)}\n\n[Project context truncated at ${MAX_CONTEXT_CHARS} chars]`
    : context;
}

function findFiles(query: string): string[] {
  const term = query.toLowerCase().trim();
  if (!term) return [];

  const systemMemory = loadSystemMemory();
  const files = listAllFiles(PROJECT_ROOT);
  const matches: Array<{ file: string; score: number }> = [];

  for (const file of files) {
    let score = 0;
    const lowerFile = file.toLowerCase();

    if (lowerFile.includes(term)) score += 10;

    try {
      const fullPath = safeResolvePath(file);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      const content = fs.readFileSync(fullPath, "utf8").toLowerCase();

      if (content.includes(term)) score += 5;

      const queryWords = term.split(/\s+/).filter(Boolean);
      for (const word of queryWords) {
        if (word.length < 2) continue;
        if (lowerFile.includes(word)) score += 3;
        if (content.includes(word)) score += 1;
      }

      for (const [domain, domainFiles] of Object.entries(systemMemory.domainIndex)) {
        if (term.includes(domain.toLowerCase()) && domainFiles.includes(file)) {
          score += 12;
        }
      }

      const summary = systemMemory.fileSummaries[file]?.toLowerCase() ?? "";
      if (summary && summary.includes(term)) score += 6;

      if (score > 0) {
        matches.push({ file, score });
      }
    } catch {
      // ignore
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
    .slice(0, MAX_FIND_RESULTS)
    .map((m) => m.file);
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return trimmed;
}

async function classifyIntent(input: string): Promise<Intent> {
  const result = await withThinking("Classifying intent", async () =>
    generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: `
Classify the user's intent into ONE of:

- QUESTION
- INVESTIGATE
- MODIFY
- EXECUTE

Definitions:
- QUESTION: explanation or answer
- INVESTIGATE: inspect code / debug / understand structure
- MODIFY: change, fix, update, create, edit, patch code/files
- EXECUTE: run commands, builds, git operations, deploys, status checks

User input:
${input}

Respond with ONLY one word.
      `,
    }),
  );

  const text = result.text.trim().toUpperCase();

  if (text.includes("EXECUTE")) return "EXECUTE";
  if (text.includes("MODIFY")) return "MODIFY";
  if (text.includes("INVESTIGATE")) return "INVESTIGATE";
  return "QUESTION";
}

async function buildImplementationPlan(
  input: string,
  intent: Intent,
  conversationMemoryContext: string,
  workingMemoryContext: string,
  systemMemoryContext: string,
  projectContext: string,
): Promise<ImplementationPlan> {
  const result = await withThinking("Building implementation plan", async () =>
    generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: `
You are Atlas, an implementation operator for a codebase.

Create either:
1. a multi-step implementation plan in JSON
2. or a direct answer in JSON

Output VALID JSON only.

Schema for implementation:
{
  "mode": "PLAN",
  "summary": "short summary",
  "steps": [
    {
      "type": "PATCH",
      "path": "relative/path",
      "summary": "what this patch does",
      "find": "exact existing text",
      "replace": "exact replacement text"
    },
    {
      "type": "WRITE",
      "path": "relative/path",
      "summary": "what this write does",
      "content": "full file content"
    },
    {
      "type": "RUN",
      "summary": "what this command does",
      "command": "npm run build"
    }
  ]
}

Schema for answer:
{
  "mode": "ANSWER",
  "answer": "your answer"
}

Rules:
- For MODIFY requests, prefer PLAN.
- For EXECUTE requests, prefer PLAN.
- For QUESTION requests, use ANSWER unless implementation is clearly requested.
- For INVESTIGATE requests, use ANSWER unless code changes or commands are requested.
- Steps must be in execution order.
- Keep steps lean. Max ${MAX_PLAN_STEPS} steps.
- Use PATCH instead of WRITE for existing files.
- Use exact FIND text for PATCH.
- Only use RUN for allowed commands.
- Allowed command prefixes:
${ALLOWED_COMMAND_PREFIXES.join("\n")}
- If the user asks to apply all required changes, include all needed patches/writes, then build/push/deploy if requested.
- Do not swap modify intent for random repo-inspection commands.
- If unsure, answer honestly instead of hallucinating.

=====================
PROJECT CONTEXT
${projectContext}
=====================

=====================
TARGETED SYSTEM MEMORY
${systemMemoryContext}
=====================

=====================
WORKING MEMORY
${workingMemoryContext}
=====================

=====================
RECENT CONVERSATION MEMORY
${conversationMemoryContext}
=====================

LAST RUN OUTPUT:
${lastRunOutput || "[None]"}

INTENT:
${intent}

USER REQUEST:
${input}
      `,
    }),
  );

  try {
    const parsed = JSON.parse(stripCodeFences(result.text)) as ImplementationPlan;

    if (parsed.mode === "PLAN" && Array.isArray(parsed.steps)) {
      return {
        mode: "PLAN",
        summary: parsed.summary || "Implementation plan",
        steps: parsed.steps.slice(0, MAX_PLAN_STEPS),
      };
    }

    if (parsed.mode === "ANSWER" && typeof parsed.answer === "string") {
      return parsed;
    }
  } catch {
    // fall through
  }

  return {
    mode: "ANSWER",
    answer: result.text.trim(),
  };
}

function getStepCategory(step: Exclude<PlanStep, { type: "ANSWER" }>): ApprovalCategory {
  if (step.type === "PATCH") return "PATCH";
  if (step.type === "WRITE") return "WRITE";
  return getCommandCategory(step.command);
}

function formatApprovalOptions(category: ApprovalCategory): string {
  let label: string = category;

  if (category === "RUN_SAFE") label = "safe commands";
  if (category === "GIT_PUSH") label = "git push";
  if (category === "DEPLOY") label = "deployments";

  return ["", "1. Yes", `2. Yes, approve and don't ask me again for ${label}`, "3. No"].join("\n");
}

function formatPendingAction(step: Exclude<PlanStep, { type: "ANSWER" }>, remainingSteps: PlanStep[]): string {
  const category = getStepCategory(step);
  const extra =
    remainingSteps.length > 0
      ? `\n\nRemaining queued steps after this: ${remainingSteps.length}`
      : "";

  if (step.type === "PATCH") {
    return [
      `Proposed patch ready for approval.${extra}`,
      `File: ${step.path}`,
      `Summary: ${step.summary}`,
      "",
      "FIND:",
      "<<<",
      step.find,
      ">>>",
      "",
      "REPLACE:",
      "<<<",
      step.replace,
      ">>>",
      formatApprovalOptions(category),
    ].join("\n");
  }

  if (step.type === "WRITE") {
    return [
      `Proposed new file ready for approval.${extra}`,
      `File: ${step.path}`,
      `Summary: ${step.summary}`,
      "",
      "CONTENT:",
      "<<<",
      step.content,
      ">>>",
      formatApprovalOptions(category),
    ].join("\n");
  }

  return [
    `Proposed command ready for approval.${extra}`,
    `Command: ${step.command}`,
    `Summary: ${step.summary}`,
    formatApprovalOptions(category),
  ].join("\n");
}

function executeSingleStep(step: Exclude<PlanStep, { type: "ANSWER" }>): StepResult {
  if (step.type === "PATCH") {
    return safePatchFile(step.path, step.find, step.replace);
  }

  if (step.type === "WRITE") {
    return safeWriteFile(step.path, step.content);
  }

  const result = runCommand(step.command);
  lastRunOutput = result.output;

  return {
    ok: result.ok,
    message: result.ok
      ? `✅ Command completed successfully:\n${step.command}\n\n${result.output}`
      : `❌ Command finished with errors:\n${step.command}\n\n${result.output}`,
  };
}

function canAutoExecute(step: Exclude<PlanStep, { type: "ANSWER" }>): boolean {
  return isAutoApproved(getStepCategory(step));
}

function formatPlanSummary(summary: string, steps: PlanStep[]): string {
  const lines = steps.map((step, index) => {
    if (step.type === "PATCH") {
      return `${index + 1}. PATCH ${step.path} — ${step.summary}`;
    }
    if (step.type === "WRITE") {
      return `${index + 1}. WRITE ${step.path} — ${step.summary}`;
    }
    if (step.type === "RUN") {
      return `${index + 1}. RUN ${step.command} — ${step.summary}`;
    }
    return `${index + 1}. ANSWER — ${step.answer}`;
  });

  return [`Plan: ${summary}`, "", ...lines].join("\n");
}

function executePlan(steps: PlanStep[]): string {
  const outputs: string[] = [];

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];

    if (step.type === "ANSWER") {
      outputs.push(step.answer);
      continue;
    }

    if (!canAutoExecute(step)) {
      pendingAction = {
        step,
        remainingSteps: steps.slice(i + 1),
      };

      const header = outputs.length > 0 ? `${outputs.join("\n\n")}\n\nPaused for approval:\n` : "";
      return `${header}${formatPendingAction(step, steps.slice(i + 1))}`;
    }

    const result = executeSingleStep(step);
    outputs.push(result.message);

    if (!result.ok) {
      pendingAction = null;
      return outputs.join("\n\n");
    }
  }

  pendingAction = null;
  return outputs.join("\n\n") || "Plan completed.";
}

function handleApprovalChoice(choice: string): string {
  if (!pendingAction) {
    return "No pending action.";
  }

  const { step, remainingSteps } = pendingAction;
  const category = getStepCategory(step);

  if (choice === "3") {
    pendingAction = null;
    return "Pending action rejected.";
  }

  if (choice === "2") {
    setAutoApprove(category, true);
  }

  pendingAction = null;

  const firstResult = executeSingleStep(step);
  const prefix = choice === "2" ? `✅ Auto-approval enabled for category: ${category}\n\n` : "";

  if (!firstResult.ok) {
    return `${prefix}${firstResult.message}`;
  }

  if (remainingSteps.length === 0) {
    return `${prefix}${firstResult.message}`;
  }

  const rest = executePlan(remainingSteps);
  return `${prefix}${firstResult.message}\n\n${rest}`;
}

async function answerFromContext(
  input: string,
  intent: Intent,
  conversationMemoryContext: string,
  workingMemoryContext: string,
  systemMemoryContext: string,
  projectContext: string,
): Promise<string> {
  const result = await withThinking("Preparing answer", async () =>
    generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: `
You are Atlas.

Answer directly and practically.

Rules:
- concise
- use the actual system design
- if something is unclear, say which file should be checked next
- if implementation is actually needed, say so

=====================
PROJECT CONTEXT
${projectContext}
=====================

=====================
TARGETED SYSTEM MEMORY
${systemMemoryContext}
=====================

=====================
WORKING MEMORY
${workingMemoryContext}
=====================

=====================
RECENT CONVERSATION MEMORY
${conversationMemoryContext}
=====================

LAST RUN OUTPUT:
${lastRunOutput || "[None]"}

INTENT:
${intent}

USER REQUEST:
${input}
      `,
    }),
  );

  return result.text.trim();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🧠 Atlas CLI ready. Type a command (type 'exit' to quit)");
console.log(
  "Commands: /ls, /find <term>, /read <path>, /project, /memory, /working, /system, /approvals, /reset-approvals, /authority on, /authority off\n",
);

async function runAtlas(input: string): Promise<string> {
  const intent = await classifyIntent(input);
  const projectContext = buildProjectContext();
  const conversationMemoryContext = buildRecentConversationContext();
  const workingMemoryContext = buildWorkingMemoryContext();
  const systemMemoryContext = buildSystemMemoryContext(input);

  if (intent === "MODIFY" || intent === "EXECUTE") {
    const plan = await buildImplementationPlan(
      input,
      intent,
      conversationMemoryContext,
      workingMemoryContext,
      systemMemoryContext,
      projectContext,
    );

    if (plan.mode === "ANSWER") {
      return plan.answer;
    }

    const summary = formatPlanSummary(plan.summary, plan.steps);
    const execution = executePlan(plan.steps);
    return `${summary}\n\n${execution}`;
  }

  return answerFromContext(
    input,
    intent,
    conversationMemoryContext,
    workingMemoryContext,
    systemMemoryContext,
    projectContext,
  );
}

function ask() {
  rl.question("You: ", async (input) => {
    const trimmed = input.trim();

    if (trimmed.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    try {
      if (["1", "2", "3"].includes(trimmed)) {
        const result = handleApprovalChoice(trimmed);
        console.log(`\nAtlas: ${result}\n`);
        ask();
        return;
      }

      if (trimmed === "/approvals") {
        console.log(`\n${JSON.stringify(loadApprovals(), null, 2)}\n`);
        ask();
        return;
      }

      if (trimmed === "/reset-approvals") {
        saveApprovals(createDefaultApprovals());
        console.log(`\nAtlas: Approval memory reset.\n`);
        ask();
        return;
      }

      if (trimmed === "/authority on") {
        setFullAuthority(true);
        console.log(`\nAtlas: Full authority enabled.\n`);
        ask();
        return;
      }

      if (trimmed === "/authority off") {
        setFullAuthority(false);
        console.log(`\nAtlas: Full authority disabled.\n`);
        ask();
        return;
      }

      if (trimmed === "/ls") {
        console.log(`\n${getFileTree(PROJECT_ROOT).join("\n")}\n`);
        ask();
        return;
      }

      if (trimmed === "/project") {
        console.log(`\n${buildProjectContext()}\n`);
        ask();
        return;
      }

      if (trimmed === "/memory") {
        console.log(`\n${buildRecentConversationContext()}\n`);
        ask();
        return;
      }

      if (trimmed === "/working") {
        console.log(`\n${buildWorkingMemoryContext()}\n`);
        ask();
        return;
      }

      if (trimmed === "/system") {
        console.log(`\n${buildSystemMemoryContext()}\n`);
        ask();
        return;
      }

      if (trimmed.startsWith("/find ")) {
        const query = trimmed.slice(6).trim();

        if (!query) {
          console.log("\nUsage: /find <term>\n");
          ask();
          return;
        }

        const matches = findFiles(query);
        console.log(`\n${matches.length ? matches.join("\n") : "No matches found."}\n`);
        ask();
        return;
      }

      if (trimmed.startsWith("/read ")) {
        const relPath = trimmed.slice(6).trim();

        if (!relPath) {
          console.log("\nUsage: /read <path>\n");
          ask();
          return;
        }

        const fileOutput = safeReadFile(relPath, MAX_READ_CHARS);
        console.log(`\n${fileOutput}\n`);
        ask();
        return;
      }

      if (trimmed === "/authority") {
        console.log(`\nAtlas: Full authority is ${hasFullAuthority() ? "ON" : "OFF"}.\n`);
        ask();
        return;
      }

      const response = await runAtlas(trimmed);
      console.log(`\nAtlas: ${response}\n`);
      appendMemory(trimmed, response);
      await updateWorkingMemory(trimmed, response);
    } catch (err) {
      spinner.stop("❌ Unexpected failure");
      console.error("Atlas error:", err);
    }

    ask();
  });
}

ask();