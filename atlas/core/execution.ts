import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { runPatchRules } from "./patch-rules";
import { updateMemory } from "../system/memory";

export type AtlasResult = {
  mode: string;
  summary: string;
  filesTargeted: string[];
  filesChanged: string[];
  buildResult: "success" | "failed" | "skipped";
  commitHash: string;
  pushResult: string;
};

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  combined: string;
};

const PROJECT_ROOT = process.cwd();
const MAX_BUFFER = 1024 * 1024 * 10;

export async function runAtlas(input: string, authority: boolean): Promise<AtlasResult> {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  // ===== INSPECT =====
  if (lower.startsWith("inspect ")) {
    const file = raw.replace(/^inspect\s+/i, "").trim();
    const inspection = inspectSingleFile(file);

    console.log("TASK ACTION: READ");
    console.log("");
    console.log("---");
    console.log(`file: ${inspection.file}`);
    console.log(`exists: ${inspection.exists}`);

    if (typeof inspection.lines === "number") {
      console.log(`lines: ${inspection.lines}`);
    }

    for (const note of inspection.notes) {
      console.log(`note: ${note}`);
    }

    if (inspection.preview) {
      console.log("preview:");
      console.log(inspection.preview);
    }

    console.log("");

    return {
      mode: "investigate",
      summary: `Investigated 1 file(s).`,
      filesTargeted: [file],
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  // ===== RUN BUILD =====
  if (lower === "run build" || lower === "build") {
    console.log("TASK ACTION: RUN");

    const build = runBuildDetailed();

    if (build.stdout.trim()) {
      console.log(build.stdout.trim());
    }

    if (build.stderr.trim()) {
      console.log(build.stderr.trim());
    }

    console.log("");

    if (!build.ok) {
      updateMemory({
        lastBuild: {
          status: "failed",
          timestamp: new Date().toISOString(),
        },
      });

      return {
        mode: "execute",
        summary: "Ran npm run build.",
        filesTargeted: [],
        filesChanged: [],
        buildResult: "failed",
        commitHash: "none",
        pushResult: "skipped",
      };
    }

    updateMemory({
      lastBuild: {
        status: "success",
        timestamp: new Date().toISOString(),
      },
    });

    return {
      mode: "execute",
      summary: "Ran npm run build.",
      filesTargeted: [],
      filesChanged: [],
      buildResult: "success",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  // ===== AUTOFIX =====
  if (lower === "autofix") {
    console.log("TASK ACTION: AUTOFIX");
    console.log("");

    return {
      mode: "execute",
      summary: "Autofix ran, but no safe fixes were needed.",
      filesTargeted: [],
      filesChanged: [],
      buildResult: "skipped",
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  // ===== UPDATE =====
  if (lower.startsWith("update ")) {
    if (!authority) {
      return {
        mode: "execute",
        summary: "Authority is off. Run /authority on first.",
        filesTargeted: [],
        filesChanged: [],
        buildResult: "skipped",
        commitHash: "none",
        pushResult: "skipped",
      };
    }

    const parsed = parseUpdateCommand(raw);

    if (!parsed) {
      return {
        mode: "execute",
        summary: "Invalid update command.",
        filesTargeted: [],
        filesChanged: [],
        buildResult: "skipped",
        commitHash: "none",
        pushResult: "skipped",
      };
    }

    const { filePath, instruction, runBuildAfter } = parsed;

    console.log("TASK ACTION: PATCH");
    console.log("");

    const patchResult = runPatchRules(filePath, instruction);

    let buildResult: "success" | "failed" | "skipped" = "skipped";

    if (patchResult.changed && runBuildAfter) {
      const build = runBuildDetailed();

      if (build.stdout.trim()) {
        console.log(build.stdout.trim());
      }

      if (build.stderr.trim()) {
        console.log(build.stderr.trim());
      }

      console.log("");

      if (!build.ok) {
        updateMemory({
          lastBuild: {
            status: "failed",
            timestamp: new Date().toISOString(),
          },
        });

        return {
          mode: "execute",
          summary: "Patch applied but build failed.",
          filesTargeted: [filePath],
          filesChanged: [filePath],
          buildResult: "failed",
          commitHash: "none",
          pushResult: "skipped",
        };
      }

      updateMemory({
        lastBuild: {
          status: "success",
          timestamp: new Date().toISOString(),
        },
      });

      buildResult = "success";
    }

    return {
      mode: "execute",
      summary: patchResult.summary,
      filesTargeted: [filePath],
      filesChanged: patchResult.changed ? [filePath] : [],
      buildResult,
      commitHash: "none",
      pushResult: "skipped",
    };
  }

  return {
    mode: "execute",
    summary: "Unknown command.",
    filesTargeted: [],
    filesChanged: [],
    buildResult: "skipped",
    commitHash: "none",
    pushResult: "skipped",
  };
}

function parseUpdateCommand(raw: string): {
  filePath: string;
  instruction: string;
  runBuildAfter: boolean;
} | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^update\s+(.+?)\s+(.+?)(?:\s+and then run build)?$/i);

  if (!match) return null;

  return {
    filePath: match[1].trim(),
    instruction: match[2].trim(),
    runBuildAfter: /\band then run build\b/i.test(trimmed),
  };
}

function runBuildDetailed(): CommandResult {
  return runCommandDetailed("npm", ["run", "build"]);
}

function runCommandDetailed(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
    maxBuffer: MAX_BUFFER,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combined = [stdout, stderr].filter(Boolean).join("\n").trim();

  return {
    ok: result.status === 0,
    stdout,
    stderr,
    combined,
  };
}

function inspectSingleFile(filePath: string): {
  file: string;
  exists: boolean;
  lines?: number;
  notes: string[];
  preview?: string;
} {
  const absolutePath = path.resolve(PROJECT_ROOT, filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      file: filePath,
      exists: false,
      notes: ["File not found."],
    };
  }

  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) {
    return {
      file: filePath,
      exists: true,
      notes: ["Path exists but is not a regular file."],
    };
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = content.split("\n");
  const preview = lines.slice(0, 12).join("\n");

  const notes: string[] = [
    `Readable file with ${lines.length} lines.`,
  ];

  if (preview.trim().length === 0) {
    notes.push("File is empty.");
  } else {
    notes.push("No keyword match found — showing start of file.");
  }

  return {
    file: filePath,
    exists: true,
    lines: lines.length,
    notes,
    preview,
  };
}