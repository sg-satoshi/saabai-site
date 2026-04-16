import fs from "fs";
import { resolveProjectPath } from "./utils";

export type InspectionResult = {
  file: string;
  exists: boolean;
  preview?: string;
  lineCount?: number;
  notes: string[];
};

export function inspectFiles(files: string[], instructions: string): InspectionResult[] {
  if (files.length === 0) {
    return [];
  }

  return files.map((file) => inspectFile(file, instructions));
}

function inspectFile(file: string, instructions: string): InspectionResult {
  let fullPath: string;

  try {
    fullPath = resolveProjectPath(file);
  } catch (err) {
    return {
      file,
      exists: false,
      notes: [`Blocked or invalid path: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (!fs.existsSync(fullPath)) {
    return {
      file,
      exists: false,
      notes: ["File does not exist."],
    };
  }

  let content: string;

  try {
    content = fs.readFileSync(fullPath, "utf-8");
  } catch (err) {
    return {
      file,
      exists: true,
      notes: [`Could not read file: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const lines = content.split("\n");
  const notes: string[] = [];
  const { preview, matched } = createRelevantPreview(content, instructions);

  notes.push(`Readable file with ${lines.length} lines.`);

  if (!matched) {
    notes.push("No keyword match found — showing start of file.");
  }

  return {
    file,
    exists: true,
    preview,
    lineCount: lines.length,
    notes,
  };
}

function createRelevantPreview(
  content: string,
  instructions: string
): { preview: string; matched: boolean } {
  const lowerInstructions = instructions.toLowerCase();
  const lines = content.split("\n");

  const keywords = lowerInstructions
    .split(/[^a-zA-Z0-9._/-]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const matchIndex = lines.findIndex((line) =>
    keywords.some((keyword) => line.toLowerCase().includes(keyword))
  );

  if (matchIndex >= 0) {
    const start = Math.max(0, matchIndex - 3);
    const end = Math.min(lines.length, matchIndex + 5);
    return {
      preview: lines.slice(start, end).join("\n"),
      matched: true,
    };
  }

  return {
    preview: lines.slice(0, 12).join("\n"),
    matched: false,
  };
}
