import { FILE_MAP } from "./file-map";
import { classifyPlanType, buildImplementationPlanText } from "./plan-types";

export type OperatorPlan = {
  mode: "direct_execute" | "plan_then_execute" | "suggest";
  goal: string;
  summary: string;
  steps: string[];
  risks: string[];
  files: string[];
  commands: string[];
  confidence: "high" | "medium" | "low";
  needsApproval: boolean;
  userMessage: string;
};

export function createOperatorPlan(input: string): OperatorPlan {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const files = inferFiles(lower);
  const classification = classifyPlanType(raw);

  if (classification.type === "IMPLEMENTATION") {
    return {
      mode: "suggest",
      goal: summarizeGoal(raw, lower),
      summary: "Implementation project detected",
      steps: [],
      risks: [
        "Broad scope should not be executed in one patch cycle",
        "Needs phased rollout to avoid regressions",
      ],
      files,
      commands: [],
      confidence: "high",
      needsApproval: true,
      userMessage: buildImplementationPlanText(raw, files),
    };
  }

  // =========================
  // 1. BROAD FEATURE / PRODUCT REQUESTS
  // PRIORITY FIRST
  // =========================
  if (isBroadFeatureRequest(lower)) {
    const primaryTargets = pickFeatureTargets(lower, files);

    return {
      mode: "plan_then_execute",
      goal: summarizeGoal(raw, lower),
      summary: "Broad request detected. Best path is to confirm a plan before execution.",
      steps: buildSteps(lower, primaryTargets),
      risks: buildRisks(lower),
      files: primaryTargets,
      commands: buildCommands(raw, lower, primaryTargets),
      confidence: primaryTargets.length > 0 ? "high" : "medium",
      needsApproval: true,
      userMessage: "I’ve built an execution plan. Approve it and I’ll run it.",
    };
  }

  // =========================
  // 2. SIMPLE / DIRECT EXECUTION
  // =========================

  if (hasPhrase(lower, ["build", "compile", "run build"])) {
    return {
      mode: "direct_execute",
      goal: "Run build",
      summary: "User requested a build.",
      steps: ["Run build"],
      risks: [],
      files: [],
      commands: ["run build"],
      confidence: "high",
      needsApproval: false,
      userMessage: "Running build.",
    };
  }

  if (hasPhrase(lower, ["clean things up", "clean up", "cleanup", "tidy", "safe cleanup"])) {
    return {
      mode: "direct_execute",
      goal: "Safe cleanup",
      summary: "User requested safe maintenance cleanup.",
      steps: ["Run autofix"],
      risks: [],
      files: [],
      commands: ["autofix"],
      confidence: "high",
      needsApproval: false,
      userMessage: "Running safe autofix.",
    };
  }

  if (isSimpleInspectRequest(lower)) {
    const primary = pickPrimaryTarget(lower, files);

    if (primary) {
      return {
        mode: "direct_execute",
        goal: `Inspect ${friendlyTargetName(primary)}`,
        summary: "Clear inspection request.",
        steps: [`Inspect ${primary}`],
        risks: [],
        files: [primary],
        commands: [`inspect ${primary}`],
        confidence: "high",
        needsApproval: false,
        userMessage: `Inspecting ${friendlyTargetName(primary)}.`,
      };
    }
  }

  if (isSimpleImproveRequest(lower)) {
    const primary = pickPrimaryTarget(lower, files);

    if (primary) {
      return {
        mode: "direct_execute",
        goal: `Improve ${friendlyTargetName(primary)}`,
        summary: "Straightforward improvement request on a clear target.",
        steps: [
          `Inspect ${primary}`,
          `Update ${primary}`,
          "Run build",
        ],
        risks: [],
        files: [primary],
        commands: [
          `inspect ${primary}`,
          `update ${primary} ${normalizeInstruction(raw)} and then run build`,
        ],
        confidence: "high",
        needsApproval: false,
        userMessage: `Improving ${friendlyTargetName(primary)}.`,
      };
    }
  }

  // =========================
  // 3. FALLBACK
  // =========================
  return {
    mode: "suggest",
    goal: "Clarify request",
    summary: "Could not confidently decide the right workflow.",
    steps: [],
    risks: [],
    files,
    commands: suggestionCommands(files),
    confidence: "low",
    needsApproval: false,
    userMessage: "I’m not fully sure what you want yet.",
  };
}

function buildSteps(lower: string, files: string[]): string[] {
  const steps: string[] = [];

  if (files.length > 0) {
    steps.push(`Inspect relevant files: ${files.join(", ")}`);
  } else {
    steps.push("Inspect likely relevant files");
  }

  if (lower.includes("project") || lower.includes("thread") || lower.includes("save") || lower.includes("persist")) {
    steps.push("Define persistence model for projects, threads, and saved history");
    steps.push("Update backend flow to support saved state");
    steps.push("Update frontend UI to show saved projects and threads");
    steps.push("Connect chat flow to load and continue existing threads");
  } else {
    steps.push("Apply targeted implementation changes");
  }

  steps.push("Run build");
  steps.push("Summarize outcome");

  return steps;
}

function buildRisks(lower: string): string[] {
  const risks: string[] = [];

  if (lower.includes("project") || lower.includes("thread") || lower.includes("save") || lower.includes("persist")) {
    risks.push("Persistence/storage design may require additional infrastructure");
    risks.push("Auth and user ownership may need to be respected for saved data");
    risks.push("UI complexity increases when adding projects + nested threads");
  }

  if (lower.includes("deploy") || lower.includes("live")) {
    risks.push("Deployment should only happen after successful build and review");
  }

  return risks;
}

function buildCommands(raw: string, lower: string, files: string[]): string[] {
  const commands: string[] = [];
  const targets = files.length > 0 ? files : ["app/page.tsx"];

  for (const file of targets) {
    commands.push(`inspect ${file}`);
  }

  // Keep MVP bounded: only auto-update the first 2 files max
  for (const file of targets.slice(0, 2)) {
    commands.push(`update ${file} ${normalizeInstruction(raw)} and then run build`);
  }

  return commands;
}

function summarizeGoal(raw: string, lower: string): string {
  if (lower.includes("lex") && lower.includes("project") && lower.includes("thread")) {
    return "Add saved Projects and Threads to Lex";
  }

  if (lower.includes("lex")) return `Improve Lex: ${raw}`;
  if (lower.includes("rex")) return `Improve Rex: ${raw}`;
  if (lower.includes("website") || lower.includes("home") || lower.includes("homepage")) {
    return `Improve website: ${raw}`;
  }

  return raw;
}

function suggestionCommands(files: string[]): string[] {
  if (files.length > 0) {
    return files.slice(0, 3).map((f) => `inspect ${f}`);
  }

  return ["inspect app/page.tsx", "run build", "autofix"];
}

function inferFiles(input: string): string[] {
  const results: string[] = [];

  for (const [key, files] of Object.entries(FILE_MAP)) {
    if (input.includes(key)) {
      results.push(...files);
    }
  }

  if (input.includes("ui") || input.includes("layout") || input.includes("design")) {
    if (input.includes("lex")) return ["app/lex/page.tsx"];
    if (input.includes("rex")) return ["app/rex-dashboard/page.tsx"];
    if (input.includes("website") || input.includes("home")) return ["app/page.tsx"];
  }

  if (input.includes("theme") || input.includes("globals") || input.includes("dark")) {
    return ["app/globals.css"];
  }

  return [...new Set(results)];
}

function pickPrimaryTarget(input: string, files: string[]): string | null {
  if (input.includes("lex")) {
    if (hasStandaloneWord(input, "chat")) return "app/api/lex-chat/route.ts";
    if (hasStandaloneWord(input, "config")) return "lib/lex-config.ts";
    return "app/lex/page.tsx";
  }

  if (input.includes("rex")) {
    if (hasStandaloneWord(input, "analytics")) return "app/rex-analytics/page.tsx";
    if (hasStandaloneWord(input, "changelog")) return "app/rex-changelog/ChangelogClient.tsx";
    return "app/rex-dashboard/page.tsx";
  }

  if (input.includes("theme") || input.includes("globals") || input.includes("dark")) {
    return "app/globals.css";
  }

  if (input.includes("website") || input.includes("home") || input.includes("homepage")) {
    return "app/page.tsx";
  }

  if (files.length === 1) return files[0];
  if (files.length > 1) return files[0];

  return null;
}

function pickFeatureTargets(input: string, files: string[]): string[] {
  if (input.includes("lex")) {
    return [
      "app/lex/page.tsx",
      "app/api/lex-chat/route.ts",
      "lib/lex-config.ts",
    ];
  }

  if (input.includes("rex")) {
    return ["app/rex-dashboard/page.tsx"];
  }

  if (files.length > 0) return files;

  return ["app/page.tsx"];
}

function friendlyTargetName(file: string): string {
  if (file === "app/lex/page.tsx") return "Lex UI";
  if (file === "app/api/lex-chat/route.ts") return "Lex chat route";
  if (file === "lib/lex-config.ts") return "Lex config";
  if (file === "app/rex-dashboard/page.tsx") return "Rex dashboard";
  if (file === "app/globals.css") return "global theme";
  if (file === "app/page.tsx") return "homepage";
  return file;
}

function isSimpleInspectRequest(input: string): boolean {
  return hasPhrase(input, ["inspect", "check", "review", "show", "read", "look at"]);
}

function isSimpleImproveRequest(input: string): boolean {
  return hasPhrase(input, [
    "fix",
    "improve",
    "make",
    "change",
    "update",
    "polish",
    "cleaner",
    "better",
    "premium",
    "looks shit",
    "looks bad",
    "looks outdated",
    "looks clunky",
  ]);
}

function isBroadFeatureRequest(input: string): boolean {
  return hasPhrase(input, [
    "add ",
    "build ",
    "create ",
    "implement ",
    "research ",
    "qa ",
    "test ",
    "review code",
    "save ",
    "persist ",
    "projects",
    "threads",
    "deploy",
    "live",
  ]);
}

function normalizeInstruction(input: string): string {
  return input.trim();
}

function hasPhrase(input: string, phrases: string[]): boolean {
  return phrases.some((phrase) => input.includes(phrase));
}

function hasStandaloneWord(input: string, word: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  return pattern.test(input);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}