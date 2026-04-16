import { Intent } from "./intent";
import { extractTargetFiles } from "./utils";

export type TaskAction = "PATCH" | "READ" | "RUN" | "SHELL" | "INVALID";

export type Task = {
  action: TaskAction;
  targets: string[];
  instructions: string;
  runBuild: boolean;
  runCommit: boolean;
  runPush: boolean;
};

// Verbs that signal a file mutation. Checked before RUN so patch instructions
// like "fix the build script" don't fall through to the RUN branch.
const PATCH_VERBS = [
  "update",
  "change",
  "replace",
  "patch",
  "modify",
  "set",
  "rewrite",
  "convert",
  "refactor",
  "fix",
  "remove",
  "add",
] as const;

// Verbs/keywords that signal running a command rather than editing a file.
const RUN_KEYWORDS = [
  "npm run",
  "pnpm ",
  "yarn ",
  "bun ",
  "run ",
] as const;

const RUN_EXACT = ["build", "test"] as const;

export function parseTask(input: string, intent: Intent): Task {
  if (!input || input.trim().length === 0) {
    return makeTask("INVALID", [], input, false, false, false);
  }

  const lower = input.toLowerCase().trim();
  const targets = extractTargetFiles(input);

  const wantsBuild =
    lower.includes("build") ||
    lower.includes("npm run build") ||
    lower.includes("run build") ||
    lower.includes("then run build");

  const wantsCommit =
    lower.includes("commit") ||
    lower.includes("git commit") ||
    lower.includes("save changes");

  const wantsPush =
    lower.includes("push") ||
    lower.includes("git push");

  if (intent === "INVESTIGATE") {
    return makeTask("READ", targets, input, false, false, false);
  }

  if (isSafeShellCommand(lower)) {
    return makeTask("SHELL", [], input, false, false, false);
  }

  // PATCH must be checked before RUN — a PATCH verb on a target file
  // should never fall through to the RUN branch.
  if (isPatchInstruction(lower)) {
    return makeTask("PATCH", targets, input, wantsBuild, wantsCommit, wantsPush);
  }

  if (isRunInstruction(lower)) {
    return makeTask("RUN", targets, input, wantsBuild, wantsCommit, wantsPush);
  }

  return makeTask("INVALID", targets, input, false, false, false);
}

// Helper to keep return sites concise and consistent
function makeTask(
  action: TaskAction,
  targets: string[],
  instructions: string,
  runBuild: boolean,
  runCommit: boolean,
  runPush: boolean
): Task {
  return { action, targets, instructions, runBuild, runCommit, runPush };
}

function isSafeShellCommand(input: string): boolean {
  return input === "pwd" || input === "ls" || input.startsWith("ls ");
}

function isPatchInstruction(input: string): boolean {
  return PATCH_VERBS.some((verb) => input.includes(verb));
}

function isRunInstruction(input: string): boolean {
  if ((RUN_EXACT as readonly string[]).includes(input)) return true;
  return RUN_KEYWORDS.some((kw) => input.includes(kw));
}
