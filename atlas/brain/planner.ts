import { FILE_MAP } from "./file-map";

export type Plan = {
  mode: "inspect_first" | "execute_direct" | "suggest";
  reason: string;
  files: string[];
  commands: string[];
  confidence: "high" | "medium" | "low";
  message: string;
};

export function createPlan(input: string): Plan {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const files = inferFiles(lower);

  if (hasPhrase(lower, ["build", "compile", "run build"])) {
    return {
      mode: "execute_direct",
      reason: "User requested a build",
      files: [],
      commands: ["run build"],
      confidence: "high",
      message: "Running build",
    };
  }

  if (hasPhrase(lower, ["clean things up", "clean up", "cleanup", "tidy", "safe cleanup"])) {
    return {
      mode: "execute_direct",
      reason: "User requested cleanup",
      files: [],
      commands: ["autofix"],
      confidence: "high",
      message: "Running autofix",
    };
  }

  if (
    hasPhrase(lower, [
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
      "feels shit",
      "looks bad",
      "looks outdated",
      "looks clunky",
    ])
  ) {
    const primary = pickPrimaryTarget(lower, files);

    if (primary) {
      return {
        mode: "inspect_first",
        reason: "Detected improvement/fix intent",
        files: [primary],
        commands: [
          `inspect ${primary}`,
          `update ${primary} ${normalizeUpdateInstruction(raw)} and then run build`,
        ],
        confidence: "high",
        message: `Improving ${friendlyTargetName(primary)}`,
      };
    }

    return {
      mode: "suggest",
      reason: "Improvement intent detected but target is unclear",
      files,
      commands: [
        "inspect app/page.tsx",
        "inspect app/lex/page.tsx",
        "inspect app/rex-dashboard/page.tsx",
      ],
      confidence: "medium",
      message: "I need a clearer target before making changes.",
    };
  }

  if (hasPhrase(lower, ["inspect", "check", "review", "show", "read", "look at"])) {
    const primary = pickPrimaryTarget(lower, files);

    if (primary) {
      return {
        mode: "execute_direct",
        reason: "Detected inspection intent",
        files: [primary],
        commands: [`inspect ${primary}`],
        confidence: "high",
        message: `Inspecting ${friendlyTargetName(primary)}`,
      };
    }

    return {
      mode: "suggest",
      reason: "Multiple possible files matched",
      files,
      commands: files.slice(0, 3).map((f) => `inspect ${f}`),
      confidence: "medium",
      message: "Multiple files match your request.",
    };
  }

  return {
    mode: "suggest",
    reason: "Could not confidently determine the next action",
    files,
    commands: ["inspect app/page.tsx", "run build", "autofix"],
    confidence: "low",
    message: "I’m not fully sure what you want yet.",
  };
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
    if (input.includes("home") || input.includes("website")) return ["app/page.tsx"];
  }

  if (input.includes("theme") || input.includes("globals") || input.includes("dark")) {
    return ["app/globals.css"];
  }

  return [...new Set(results)];
}

function pickPrimaryTarget(input: string, files: string[]): string | null {
  if (input.includes("lex")) {
    if (input.includes("chat")) return "app/api/lex-chat/route.ts";
    if (input.includes("config")) return "lib/lex-config.ts";
    return "app/lex/page.tsx";
  }

  if (input.includes("rex")) {
    if (input.includes("changelog")) return "app/rex-changelog/ChangelogClient.tsx";
    if (input.includes("analytics")) return "app/rex-analytics/page.tsx";
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

function friendlyTargetName(file: string): string {
  if (file === "app/lex/page.tsx") return "Lex UI";
  if (file === "app/api/lex-chat/route.ts") return "Lex chat route";
  if (file === "lib/lex-config.ts") return "Lex config";
  if (file === "app/rex-dashboard/page.tsx") return "Rex dashboard";
  if (file === "app/globals.css") return "global theme";
  if (file === "app/page.tsx") return "homepage";
  return file;
}

function normalizeUpdateInstruction(input: string): string {
  return input.trim();
}

function hasPhrase(input: string, phrases: string[]): boolean {
  return phrases.some((phrase) => input.includes(phrase));
}