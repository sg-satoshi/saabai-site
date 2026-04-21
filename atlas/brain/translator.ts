import { FILE_MAP } from "./file-map";

export type TranslationResult = {
  mode: "execute" | "suggest";
  command: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  suggestions?: string[];
};

export function translateBrainInput(input: string): TranslationResult {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return {
      mode: "suggest",
      command: "",
      reason: "No instruction provided.",
      confidence: "low",
      suggestions: ["inspect app/page.tsx"]
    };
  }

  // Build intent
  if (includesAny(lower, ["build", "compile", "run build"])) {
    return {
      mode: "execute",
      command: "run build",
      reason: "Detected build intent.",
      confidence: "high"
    };
  }

  // Autofix intent
  if (includesAny(lower, ["autofix", "auto fix", "clean things up", "cleanup"])) {
    return {
      mode: "execute",
      command: "autofix",
      reason: "Detected safe cleanup intent.",
      confidence: "high"
    };
  }

  const files = inferFiles(lower);

  // Inspect intent
  if (includesAny(lower, ["inspect", "look", "check", "review", "show"])) {
    if (files.length === 1) {
      return {
        mode: "execute",
        command: `inspect ${files[0]}`,
        reason: "Clear inspection target.",
        confidence: "high"
      };
    }

    return {
      mode: "suggest",
      command: "",
      reason: "Multiple possible files.",
      confidence: "medium",
      suggestions: files.map((f) => `inspect ${f}`).slice(0, 3)
    };
  }

  // Update intent
  if (includesAny(lower, ["update", "improve", "fix", "make", "change", "polish"])) {
    if (files.length === 1) {
      return {
        mode: "execute",
        command: `update ${files[0]} ${raw} and then run build`,
        reason: "Clear update target.",
        confidence: "high"
      };
    }

    return {
      mode: "suggest",
      command: "",
      reason: "Multiple possible update targets.",
      confidence: "medium",
      suggestions: [
        `inspect ${files[0]}`,
        `update ${files[0]} ${raw} and then run build`
      ]
    };
  }

  return {
    mode: "suggest",
    command: "",
    reason: "Could not confidently translate request.",
    confidence: "low",
    suggestions: ["inspect app/page.tsx", "run build", "autofix"]
  };
}

function inferFiles(input: string): string[] {
  const results: string[] = [];

  for (const [key, files] of Object.entries(FILE_MAP)) {
    if (input.includes(key)) {
      results.push(...files);
    }
  }

  // UI hinting
  if (input.includes("ui") || input.includes("layout")) {
    if (input.includes("lex")) return ["app/lex/page.tsx"];
    if (input.includes("rex")) return ["app/rex-dashboard/page.tsx"];
  }

  if (input.includes("theme") || input.includes("globals")) {
    return ["app/globals.css"];
  }

  return [...new Set(results)];
}

function includesAny(input: string, terms: string[]): boolean {
  return terms.some((t) => input.includes(t));
}