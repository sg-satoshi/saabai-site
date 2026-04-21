export type PlanType = "EXECUTION" | "IMPLEMENTATION";

export interface PlanClassification {
  type: PlanType;
  score: number;
  reasons: string[];
  matchedSignals: string[];
}

const IMPLEMENTATION_SIGNALS = [
  "add saved projects",
  "projects and threads",
  "persistent chat history",
  "chat history",
  "build auth",
  "authentication",
  "persistent",
  "persistence",
  "dashboard",
  "major dashboard",
  "major dashboards",
  "new workflow",
  "new workflows",
  "workflow across multiple subsystems",
  "workflows across multiple subsystems",
  "major ui",
  "thread history",
  "thread persistence",
  "project persistence",
  "user accounts",
  "permissions",
  "roles",
  "database",
  "schema",
  "storage layer",
  "session history",
  "memory across sessions",
  "sync",
  "workspace",
];

const EXECUTION_SIGNALS = [
  "check lex",
  "inspect rex",
  "inspect lex",
  "run build",
  "clean things up",
  "fix lex ui",
  "darken theme",
  "fix ui",
  "clean up",
  "patch",
  "repair",
  "revert",
  "autofix",
  "inspect",
  "adjust",
  "darken",
  "lighten",
  "rename",
  "update file",
  "fix",
  "tweak",
  "polish",
];

const IMPLEMENTATION_NOUNS = [
  "auth",
  "authentication",
  "dashboard",
  "persistence",
  "history",
  "projects",
  "threads",
  "workflow",
  "workflows",
  "database",
  "schema",
  "storage",
  "accounts",
  "permissions",
  "roles",
  "workspace",
];

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, values: string[]): string[] {
  return values.filter((v) => text.includes(v));
}

export function classifyPlanType(input: string): PlanClassification {
  const text = normalize(input);

  let score = 0;
  const reasons: string[] = [];
  const matchedSignals = new Set<string>();

  const matchedImplementationSignals = includesAny(text, IMPLEMENTATION_SIGNALS);
  const matchedExecutionSignals = includesAny(text, EXECUTION_SIGNALS);
  const matchedImplementationNouns = includesAny(text, IMPLEMENTATION_NOUNS);

  if (matchedImplementationSignals.length > 0) {
    score += matchedImplementationSignals.length * 3;
    matchedImplementationSignals.forEach((s) => matchedSignals.add(s));
    reasons.push("matched broad implementation signals");
  }

  if (matchedImplementationNouns.length >= 2) {
    score += 2;
    matchedImplementationNouns.forEach((s) => matchedSignals.add(s));
    reasons.push("touches multiple architectural concepts");
  }

  if (text.includes("like chatgpt")) {
    score += 2;
    matchedSignals.add("like chatgpt");
    reasons.push("open-ended product-style request");
  }

  if (text.includes("across multiple subsystems")) {
    score += 3;
    matchedSignals.add("across multiple subsystems");
    reasons.push("explicit multi-subsystem scope");
  }

  if (matchedExecutionSignals.length > 0) {
    score -= 1;
    matchedExecutionSignals.forEach((s) => matchedSignals.add(s));
    reasons.push("matched bounded execution signals");
  }

  if (
    text.startsWith("fix ") ||
    text.startsWith("check ") ||
    text.startsWith("inspect ") ||
    text.startsWith("run ") ||
    text.startsWith("clean ")
  ) {
    score -= 1;
    reasons.push("starts like a direct operator task");
  }

  const type: PlanType = score >= 3 ? "IMPLEMENTATION" : "EXECUTION";

  return {
    type,
    score,
    reasons,
    matchedSignals: Array.from(matchedSignals),
  };
}

export function buildImplementationPlanText(
  input: string,
  relevantFiles: string[] = []
): string {
  const classification = classifyPlanType(input);
  const text = input.trim();
  const lower = text.toLowerCase();

  let phases: string[] = [
    "1. Scope the MVP boundary",
    "2. Define the technical approach and file touch points",
    "3. Implement the smallest working slice",
    "4. Integrate, build, and harden",
  ];

  if (lower.includes("projects") && lower.includes("threads")) {
    phases = [
      "1. Define the project/thread MVP and lifecycle",
      "2. Design persistence structure and save/load flow",
      "3. Integrate create/open/list behavior into Lex",
      "4. Build, verify, and harden edge cases",
    ];
  } else if (lower.includes("auth") || lower.includes("authentication")) {
    phases = [
      "1. Define auth scope and protected surfaces",
      "2. Choose session/storage approach",
      "3. Implement the minimum auth flow",
      "4. Integrate and harden",
    ];
  } else if (lower.includes("dashboard")) {
    phases = [
      "1. Define dashboard MVP and required data",
      "2. Build dashboard shell",
      "3. Connect live data",
      "4. Build, verify, and harden",
    ];
  }

  const risks = [
    "broad scope can cause over-patching if phase 1 is not constrained",
    "multi-file changes increase regression risk",
    "this should start with phase 1 only, not a one-shot full implementation",
  ];

  const relevantFilesText =
    relevantFiles.length > 0
      ? relevantFiles.map((file) => `- ${file}`).join("\n")
      : "- to be confirmed during phase 1 scoping";

  const whyText =
    classification.reasons.length > 0
      ? classification.reasons.map((r) => `- ${r}`).join("\n")
      : "- broad request requiring phased delivery";

  return `This is an implementation project.

Goal:
${text}

Why this is implementation:
${whyText}

Relevant files:
${relevantFilesText}

Phases:
${phases.map((p) => `- ${p}`).join("\n")}

Risks:
${risks.map((r) => `- ${r}`).join("\n")}

Recommended phase 1:
- ${phases[0].replace(/^1\.\s*/, "")}

Approve phase 1? yes / no`;
}