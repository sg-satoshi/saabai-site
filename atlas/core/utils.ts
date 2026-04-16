import fs from "fs";
import path from "path";

export const PROJECT_ROOT = process.cwd();

export function resolveProjectPath(relPath: string): string {
  if (!relPath || relPath.trim().length === 0) {
    throw new Error("Empty path provided.");
  }

  const resolved = path.resolve(PROJECT_ROOT, relPath);

  // Resolve symlinks on both sides before comparing, so a symlink
  // inside the project can't point outside it and pass the prefix check.
  let realResolved: string;
  let realRoot: string;

  try {
    realResolved = fs.realpathSync(resolved);
  } catch {
    // File doesn't exist yet (e.g. a new file to be written) — fall back
    // to the un-symlinked resolved path for the prefix check.
    realResolved = resolved;
  }

  try {
    realRoot = fs.realpathSync(PROJECT_ROOT);
  } catch {
    realRoot = PROJECT_ROOT;
  }

  const rootWithSep = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;

  if (realResolved !== realRoot && !realResolved.startsWith(rootWithSep)) {
    throw new Error(`Blocked path outside project root: ${relPath}`);
  }

  return resolved;
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function extractTargetFiles(input: string): string[] {
  const matches = input.match(/\b[a-zA-Z0-9_\-./]+\.(tsx|ts|css|js|jsx|json|md)\b/g) ?? [];
  const deduped = [...new Set(matches.map((m) => m.trim()))];

  return deduped.filter((file) => {
    if (file.startsWith(".atlas")) return false;

    try {
      const full = resolveProjectPath(file);
      return fs.existsSync(full) && fs.statSync(full).isFile();
    } catch {
      return false;
    }
  });
}
