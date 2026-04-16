import fs from "fs";
import path from "path";
import readline from "readline";
import { execSync, spawnSync } from "child_process";
import { classifyIntent } from "./intent";
import { parseTask } from "./tasks";
import { inspectFiles } from "./inspect";
import { applyPatchRules, PatchContext } from "./patch-rules";
import { PROJECT_ROOT, resolveProjectPath } from "./utils";

const EXEC_OPTS = {
  cwd: PROJECT_ROOT,
  stdio: "ignore" as const,
  maxBuffer: 10 * 1024 * 1024,
};

export type AtlasResult = {
  mode: "question" | "investigate" | "execute" | "shell";
  summary: string;
  filesTargeted: string[];
  filesChanged: string[];
  buildResult: "success" | "failed" | "skipped";
  commitHash: string | "none";
  pushResult: "success" | "failed" | "skipped";
};

type PendingFileChange = {
  file: string;
  original: string;
  updated: string;
};

function log(...args: unknown[]): void {
  console.log(...args);
}

export async function runAtlas(input: string, authority: boolean): Promise<AtlasResult> {
  const intent = classifyIntent(input);
  const task = parseTask(input, intent);

  if (
    task.targets.length > 0 &&
    /update|change|replace|patch|modify|set|rewrite|convert|refactor|fix|remove|add/i.test(input)
  ) {
    task.action = "PATCH";
  }

  log("TASK ACTION:", task.action);

  if (intent === "QUESTION") {
    return {
      mode: "question",
      summary:
        "Question mode detected. Atlas CLI is execution-first; answer in a higher-level assistant layer if needed.",
      filesTargeted: [],
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  if (task.action === "INVALID") {
    return {
      mode: "execute",
      summary: "Target detected, but no valid action was specified.",
      filesTargeted: task.targets,
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  if (task.action === "READ") {
    const inspections = inspectFiles(task.targets, task.instructions);

    if (inspections.length === 0) {
      return {
        mode: "investigate",
        summary: "No valid target file specified for investigation.",
        filesTargeted: [],
        filesChanged: [],
        buildResult: "skipped",
        commitHash: "none",
        pushResult: "skipped",
      };
    }

    for (const item of inspections) {
      log("\n---");
      log(`file: ${item.file}`);
      log(`exists: ${item.exists}`);
      if (typeof item.lineCount === "number") {
        log(`lines: ${item.lineCount}`);
      }
      for (const note of item.notes) {
        log(`note: ${note}`);
      }
      if (item.preview) {
        log("preview:");
        log(item.preview);
      }
    }

    return {
      mode: "investigate",
      summary: `Investigated ${inspections.length} file(s).`,
      filesTargeted: task.targets,
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  if (task.action === "SHELL") {
    let shellOutput: string;

    try {
      shellOutput = runSafeShellCommand(task.instructions);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        mode: "shell",
        summary: `Shell command failed: ${message}`,
        filesTargeted: [],
        filesChanged: [],
        buildResult: "skipped",
        commitHash: "none",
        pushResult: "skipped",
      };
    }

    if (shellOutput) {
      log(shellOutput);
    }

    return {
      mode: "shell",
      summary: `Ran safe shell command: ${task.instructions}`,
      filesTargeted: [],
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  if (!authority) {
    return {
      mode: "execute",
      summary: "Authority is off. Run /authority on first.",
      filesTargeted: task.targets,
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  if (task.action === "RUN") {
    let runSummary: string;
    let buildResult: "success" | "failed" | "skipped" = "skipped";

    try {
      runSummary = runCommandFromInput(task.instructions);

      if (task.instructions.toLowerCase().includes("build")) {
        buildResult = "success";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        mode: "execute",
        summary: `Run command failed: ${message}`,
        filesTargeted: task.targets,
        filesChanged: [],
        buildResult: task.instructions.toLowerCase().includes("build") ? "failed" : "skipped",
        commitHash: "none",
        pushResult: "skipped",
      };
    }

    return {
      mode: "execute",
      summary: runSummary,
      filesTargeted: task.targets,
      filesChanged: [],
      buildResult,
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  if (task.targets.length === 0) {
    return {
      mode: "execute",
      summary: "No valid target file specified.",
      filesTargeted: [],
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  const pendingChanges = collectPendingChanges(task.targets, task.instructions);

  if (pendingChanges.length === 0) {
    return {
      mode: "execute",
      summary: "Patch engine ran, but no changes were needed.",
      filesTargeted: task.targets,
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  printDiffPreview(pendingChanges);

  const approved = await confirmApplyChanges();

  if (!approved) {
    return {
      mode: "execute",
      summary: "Change set was cancelled by user.",
      filesTargeted: task.targets,
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  const changedFiles = writeApprovedChanges(pendingChanges);

  const buildResult = task.runBuild ? runBuild() : "skipped";

  if (task.runBuild && buildResult !== "success") {
    revertChanges(pendingChanges);

    return {
      mode: "execute",
      summary: "Files changed, but build failed. Changes were automatically reverted.",
      filesTargeted: task.targets,
      filesChanged: [],
      buildResult: "failed",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  const commitHash = task.runCommit ? gitCommit(changedFiles) : "none";

  if (task.runCommit && commitHash === "none") {
    return {
      mode: "execute",
      summary: "Files changed and build passed, but commit did not complete.",
      filesTargeted: task.targets,
      filesChanged: changedFiles,
      buildResult,
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  const pushResult = task.runPush && commitHash !== "none" ? gitPush() : "skipped";

  return {
    mode: "execute",
    summary: "Execution completed.",
    filesTargeted: task.targets,
    filesChanged: changedFiles,
    buildResult,
    commitHash,
    pushResult,
  };
}

function collectPendingChanges(files: string[], instructions: string): PendingFileChange[] {
  const pendingChanges: PendingFileChange[] = [];

  for (const file of files) {
    if (file.startsWith(".atlas")) continue;

    let fullPath: string;

    try {
      fullPath = resolveProjectPath(file);
    } catch (err) {
      log(`Skipping ${file}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (!fs.existsSync(fullPath)) {
      log(`Skipping ${file}: file does not exist`);
      continue;
    }

    let original: string;

    try {
      original = fs.readFileSync(fullPath, "utf-8");
    } catch (err) {
      log(`Skipping ${file}: could not read file — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const ctx: PatchContext = {
      filePath: file,
      instructions,
    };

    let updated: string;

    try {
      updated = applyPatchRules(original, ctx);
    } catch (err) {
      log(`Skipping ${file}: patch rules threw — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (updated !== original) {
      pendingChanges.push({
        file,
        original,
        updated,
      });
    }
  }

  return pendingChanges;
}

function writeApprovedChanges(changes: PendingFileChange[]): string[] {
  const changedFiles: string[] = [];

  for (const change of changes) {
    const fullPath = resolveProjectPath(change.file);
    fs.writeFileSync(fullPath, change.updated, "utf-8");
    changedFiles.push(change.file);
  }

  return changedFiles;
}

function revertChanges(changes: PendingFileChange[]): void {
  log("BUILD FAILED — REVERTING CHANGES");

  for (const change of changes) {
    try {
      const fullPath = resolveProjectPath(change.file);
      fs.writeFileSync(fullPath, change.original, "utf-8");
      log(`Reverted: ${change.file}`);
    } catch (err) {
      log(`Failed to revert ${change.file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

function printDiffPreview(changes: PendingFileChange[]): void {
  log("\n================ DIFF PREVIEW ================\n");

  for (const change of changes) {
    log(`FILE: ${change.file}`);
    log("---------------------------------------------");

    const diffLines = createSimpleDiffPreview(change.original, change.updated, 24);

    if (diffLines.length === 0) {
      log("(No previewable line changes found)");
    } else {
      for (const line of diffLines) {
        log(line);
      }
    }

    log("");
  }
}

function createSimpleDiffPreview(original: string, updated: string, maxLines: number): string[] {
  const originalLines = original.split("\n");
  const updatedLines = updated.split("\n");

  const m = originalLines.length;
  const n = updatedLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalLines[i - 1] === updatedLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const preview: string[] = [];
  let emitted = 0;
  let i = m;
  let j = n;
  const ops: Array<{ type: "same" | "add" | "remove"; line: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === updatedLines[j - 1]) {
      ops.unshift({ type: "same", line: originalLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "add", line: updatedLines[j - 1] });
      j--;
    } else {
      ops.unshift({ type: "remove", line: originalLines[i - 1] });
      i--;
    }
  }

  for (const op of ops) {
    if (op.type === "same") continue;

    if (op.type === "remove") {
      preview.push(`- ${op.line}`);
      emitted++;
    } else {
      preview.push(`+ ${op.line}`);
      emitted++;
    }

    if (emitted >= maxLines) {
      preview.push("... diff truncated ...");
      break;
    }
  }

  return preview;
}

function confirmApplyChanges(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Apply these changes? (y/n): ", (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

function runSafeShellCommand(input: string): string {
  const trimmed = input.trim();

  if (trimmed === "pwd") {
    return PROJECT_ROOT;
  }

  if (trimmed === "ls") {
    return listDirectory(PROJECT_ROOT);
  }

  if (trimmed.startsWith("ls ")) {
    const rawTarget = trimmed.slice(3).trim();
    const resolved = path.resolve(PROJECT_ROOT, rawTarget);

    let realResolved: string;
    try {
      realResolved = fs.realpathSync(resolved);
    } catch {
      throw new Error(`Path does not exist: ${rawTarget}`);
    }

    const realRoot = fs.realpathSync(PROJECT_ROOT);

    if (!realResolved.startsWith(realRoot + path.sep) && realResolved !== realRoot) {
      throw new Error("Blocked path outside project root.");
    }

    const stat = fs.statSync(realResolved);

    if (stat.isFile()) {
      return path.relative(PROJECT_ROOT, realResolved) || path.basename(realResolved);
    }

    return listDirectory(realResolved);
  }

  throw new Error("Unsupported shell command.");
}

function listDirectory(dirPath: string): string {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries
    .map((entry) => {
      const suffix = entry.isDirectory() ? "/" : "";
      return `${entry.name}${suffix}`;
    })
    .sort((a, b) => a.localeCompare(b))
    .join("\n");
}

function runCommandFromInput(input: string): string {
  const lower = input.toLowerCase().trim();

  if (lower.includes("npm run build") || lower.includes("run build") || lower === "build") {
    execSync("npm run build", { ...EXEC_OPTS });
    return "Ran npm run build.";
  }

  if (lower.includes("npm test") || lower.includes("run test") || lower === "test") {
    execSync("npm test", { ...EXEC_OPTS });
    return "Ran npm test.";
  }

  throw new Error("Unsupported run command. Currently supports build/test style commands only.");
}

function runBuild(): "success" | "failed" {
  try {
    execSync("npm run build", { ...EXEC_OPTS });
    return "success";
  } catch {
    return "failed";
  }
}

function gitCommit(files: string[]): string | "none" {
  if (files.length === 0) return "none";

  const addResult = spawnSync("git", ["add", "--", ...files], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (addResult.status !== 0) {
    log("git add failed:", addResult.stderr || addResult.stdout);
    return "none";
  }

  const commitResult = spawnSync("git", ["commit", "-m", "atlas: deterministic update"], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (commitResult.status !== 0) {
    log("git commit failed:", commitResult.stderr || commitResult.stdout);
    return "none";
  }

  try {
    return execSync("git rev-parse HEAD", {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      maxBuffer: 10 * 1024 * 1024,
    })
      .toString()
      .trim();
  } catch {
    return "none";
  }
}

function gitPush(): "success" | "failed" {
  try {
    execSync("git push", { ...EXEC_OPTS });
    return "success";
  } catch {
    return "failed";
  }
}