import { Intent } from "./intent";
import { extractTargetFiles } from "./utils";

export type TaskAction = "PATCH" | "READ" | "RUN" | "SHELL" | "INVALID" | "AUTOFIX";

export type Task = {
  action: TaskAction;
  targets: string[];
  instructions: string;
  runBuild: boolean;
  runCommit: boolean;
  runPush: boolean;
};

export function parseTask(input: string, intent: Intent): Task {
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

  if (intent === "AUTOFIX") {
    return {
      action: "AUTOFIX",
      targets,
      instructions: input,
      runBuild: true,
      runCommit: false,
      runPush: false,
    };
  }

  if (intent === "INVESTIGATE") {
    return {
      action: "READ",
      targets,
      instructions: input,
      runBuild: false,
      runCommit: false,
      runPush: false,
    };
  }

  if (isSafeShellCommand(lower)) {
    return {
      action: "SHELL",
      targets: [],
      instructions: input,
      runBuild: false,
      runCommit: false,
      runPush: false,
    };
  }

  if (isPatchInstruction(lower)) {
    return {
      action: "PATCH",
      targets,
      instructions: input,
      runBuild: wantsBuild,
      runCommit: wantsCommit,
      runPush: wantsPush,
    };
  }

  if (isRunInstruction(lower)) {
    return {
      action: "RUN",
      targets,
      instructions: input,
      runBuild: wantsBuild,
      runCommit: wantsCommit,
      runPush: wantsPush,
    };
  }

  return {
    action: "INVALID",
    targets,
    instructions: input,
    runBuild: false,
    runCommit: false,
    runPush: false,
  };
}

function isSafeShellCommand(input: string): boolean {
  return input === "pwd" || input === "ls" || input.startsWith("ls ");
}

function isPatchInstruction(input: string): boolean {
  return [
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
  ].some((verb) => input.includes(verb));
}

function isRunInstruction(input: string): boolean {
  return (
    input === "build" ||
    input === "test" ||
    input.includes("npm run") ||
    input.startsWith("run ") ||
    input.includes("pnpm ") ||
    input.includes("yarn ") ||
    input.includes("bun ")
  );
}