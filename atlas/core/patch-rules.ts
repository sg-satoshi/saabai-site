import fs from "fs";
import path from "path";

export type PatchOperationType =
  | "replace_text"
  | "insert_before"
  | "insert_after"
  | "append_file"
  | "prepend_file"
  | "ensure_import"
  | "noop";

export type PatchOperation = {
  type: PatchOperationType;
  description: string;
  anchor?: string;
  find?: string;
  replace?: string;
  content?: string;
};

export type PatchIntent = {
  targetFile: string;
  goal: string;
  constraints: string[];
  operations: PatchOperation[];
  confidence: "high" | "medium" | "low";
  summary: string;
};

export type PatchApplyResult = {
  ok: boolean;
  changed: boolean;
  filePath: string;
  summary: string;
  operationsAttempted: number;
  operationsApplied: number;
  errors: string[];
};

export type ParsedUpdateCommand = {
  filePath: string;
  instruction: string;
  runBuildAfter: boolean;
};

const FILE_READ_ENCODING: BufferEncoding = "utf8";

export function parseUpdateCommand(raw: string): ParsedUpdateCommand | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^update\s+(.+?)\s+(.+?)(?:\s+and then run build)?$/i);

  if (!match) return null;

  return {
    filePath: match[1].trim(),
    instruction: match[2].trim(),
    runBuildAfter: /\band then run build\b/i.test(trimmed),
  };
}

export function normalizePatchInstruction(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

export function runPatchRules(filePath: string, instruction: string): PatchApplyResult {
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      changed: false,
      filePath,
      summary: "Target file does not exist.",
      operationsAttempted: 0,
      operationsApplied: 0,
      errors: [`File not found: ${absolutePath}`],
    };
  }

  const current = fs.readFileSync(absolutePath, FILE_READ_ENCODING);
  const intent = buildPatchIntent(filePath, instruction, current);
  return applyPatchIntent(filePath, intent);
}

export function runPatchRulesFromCommand(rawCommand: string): PatchApplyResult | null {
  const parsed = parseUpdateCommand(rawCommand);
  if (!parsed) return null;
  return runPatchRules(parsed.filePath, parsed.instruction);
}

export function buildPatchIntent(
  filePath: string,
  instruction: string,
  currentContent: string
): PatchIntent {
  const normalized = normalizePatchInstruction(instruction);

  if (
    includesAny(normalized, [
      "threadid and projectid",
      "saved conversations",
      "persist conversations",
      "ensure they persist",
    ])
  ) {
    return buildConversationPersistenceIntent(filePath, normalized, currentContent);
  }

  if (
    includesAny(normalized, [
      "load conversations by threadid",
      "return previous messages",
      "previous messages",
      "load conversations",
    ])
  ) {
    return buildConversationLoadIntent(filePath, normalized, currentContent);
  }

  if (
    includesAny(normalized, [
      "restrict access based on authentication state",
      "authentication state",
      "auth state",
    ])
  ) {
    return buildUiAuthGateIntent(filePath, normalized, currentContent);
  }

  if (
    includesAny(normalized, [
      "session token return",
      "basic validation logic",
      "validation logic",
    ])
  ) {
    return buildAuthRouteIntent(filePath, normalized, currentContent);
  }

  return buildGenericIntent(filePath, normalized, currentContent);
}

export function applyPatchIntent(filePath: string, intent: PatchIntent): PatchApplyResult {
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      changed: false,
      filePath,
      summary: "Target file does not exist.",
      operationsAttempted: intent.operations.length,
      operationsApplied: 0,
      errors: [`File not found: ${absolutePath}`],
    };
  }

  let content = fs.readFileSync(absolutePath, FILE_READ_ENCODING);
  let changed = false;
  let operationsApplied = 0;
  const errors: string[] = [];

  for (const op of intent.operations) {
    const result = applyOperation(content, op);

    if (!result.ok) {
      errors.push(result.error);
      continue;
    }

    if (result.changed) {
      content = result.content;
      changed = true;
      operationsApplied += 1;
    }
  }

  if (changed) {
    fs.writeFileSync(absolutePath, content, FILE_READ_ENCODING);
  }

  return {
    ok: errors.length === 0 || changed,
    changed,
    filePath,
    summary: changed
      ? `Applied ${operationsApplied}/${intent.operations.length} patch operation(s).`
      : "Patch engine ran, but no changes were needed.",
    operationsAttempted: intent.operations.length,
    operationsApplied,
    errors,
  };
}

function buildConversationPersistenceIntent(
  filePath: string,
  instruction: string,
  current: string
): PatchIntent {
  const operations: PatchOperation[] = [];

  if (!current.includes("extractConversationPersistenceFields(")) {
    const helperBlock = `
function extractConversationPersistenceFields(payload: Record<string, unknown> | undefined) {
  return {
    threadId:
      typeof payload?.threadId === "string" && payload.threadId.trim()
        ? payload.threadId.trim()
        : undefined,
    projectId:
      typeof payload?.projectId === "string" && payload.projectId.trim()
        ? payload.projectId.trim()
        : undefined,
  };
}
`;

    const insertAnchor =
      findFirstExistingAnchor(current, [
        'const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.saabai.ai";',
        "export const maxDuration = 30;",
        "export const maxDuration = 60;",
      ]) ?? "";

    if (insertAnchor) {
      operations.push({
        type: "insert_after",
        description: "Add helper to extract persistence metadata from request payload.",
        anchor: insertAnchor,
        content: `\n${helperBlock}`,
      });
    }
  }

  const jsonContext = detectJsonParsingContext(current);

  if (
    jsonContext.kind === "destructured" &&
    jsonContext.statement &&
    !current.includes("const requestBody = await req.json();")
  ) {
    const replacement =
      `const requestBody = await req.json();\n` +
      jsonContext.statement.replace("await req.json()", "requestBody");

    operations.push({
      type: "replace_text",
      description: "Normalize req.json() into reusable requestBody for persistence extraction.",
      find: jsonContext.statement,
      replace: replacement,
    });

    operations.push({
      type: "insert_after",
      description: "Extract threadId and projectId from requestBody.",
      anchor: jsonContext.statement.replace("await req.json()", "requestBody"),
      content:
        `\n  const { threadId, projectId } = extractConversationPersistenceFields(` +
        `requestBody as Record<string, unknown> | undefined);`,
    });
  } else if (
    jsonContext.kind === "requestBody" &&
    jsonContext.statement &&
    jsonContext.variableName
  ) {
    const extractionLine =
      `const { threadId, projectId } = extractConversationPersistenceFields(` +
      `${jsonContext.variableName} as Record<string, unknown> | undefined);`;

    if (!current.includes("const { threadId, projectId } = extractConversationPersistenceFields(")) {
      operations.push({
        type: "insert_after",
        description: "Extract threadId and projectId from existing request body variable.",
        anchor: jsonContext.statement,
        content: `\n  ${extractionLine}`,
      });
    }
  }

  return {
    targetFile: filePath,
    goal: instruction,
    constraints: [
      "Keep changes minimal",
      "Do not alter unrelated route behavior",
      "Avoid duplicate req.json() calls",
      "Never insert await into non-async scope",
      "Only add persistence metadata support",
    ],
    operations,
    confidence: operations.length > 0 ? "high" : "medium",
    summary: "Add minimal conversation persistence metadata support.",
  };
}

function buildConversationLoadIntent(
  filePath: string,
  instruction: string,
  current: string
): PatchIntent {
  const operations: PatchOperation[] = [];

  if (!current.includes("extractThreadId(")) {
    const helperBlock = `
function extractThreadId(payload: Record<string, unknown> | undefined): string | undefined {
  const value = payload?.threadId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
`;

    const insertAnchor =
      findFirstExistingAnchor(current, [
        "export const maxDuration = 60;",
        "export const maxDuration = 30;",
      ]) ?? "";

    if (insertAnchor) {
      operations.push({
        type: "insert_after",
        description: "Add helper to extract threadId from request payload.",
        anchor: insertAnchor,
        content: `\n${helperBlock}`,
      });
    }
  }

  if (!current.includes("loadPreviousMessagesByThreadId(")) {
    const loaderBlock = `
async function loadPreviousMessagesByThreadId(threadId?: string) {
  if (!threadId) return [];
  return [];
}
`;

    const insertAnchor =
      findFirstExistingAnchor(current, [
        "export const maxDuration = 60;",
        "export const maxDuration = 30;",
      ]) ?? "";

    if (insertAnchor) {
      operations.push({
        type: "insert_after",
        description: "Add minimal placeholder loader for previous messages by threadId.",
        anchor: insertAnchor,
        content: `\n${loaderBlock}`,
      });
    }
  }

  const jsonContext = detectJsonParsingContext(current);

  if (
    jsonContext.kind === "destructured" &&
    jsonContext.statement &&
    !current.includes("const requestBody = await req.json();")
  ) {
    const replacement =
      `const requestBody = await req.json();\n` +
      jsonContext.statement.replace("await req.json()", "requestBody");

    operations.push({
      type: "replace_text",
      description: "Normalize req.json() into reusable requestBody for thread loading.",
      find: jsonContext.statement,
      replace: replacement,
    });

    if (!current.includes("const threadId = extractThreadId(")) {
      operations.push({
        type: "insert_after",
        description: "Extract threadId and previous messages from requestBody.",
        anchor: jsonContext.statement.replace("await req.json()", "requestBody"),
        content:
          `\n  const threadId = extractThreadId(requestBody as Record<string, unknown> | undefined);` +
          `\n  const previousMessages = await loadPreviousMessagesByThreadId(threadId);`,
      });
    }
  } else if (
    jsonContext.kind === "requestBody" &&
    jsonContext.statement &&
    jsonContext.variableName
  ) {
    if (!current.includes("const threadId = extractThreadId(")) {
      operations.push({
        type: "insert_after",
        description: "Extract threadId and previous messages from existing requestBody variable.",
        anchor: jsonContext.statement,
        content:
          `\n  const threadId = extractThreadId(${jsonContext.variableName} as Record<string, unknown> | undefined);` +
          `\n  const previousMessages = await loadPreviousMessagesByThreadId(threadId);`,
      });
    }
  }

  return {
    targetFile: filePath,
    goal: instruction,
    constraints: [
      "Keep retrieval support minimal",
      "Avoid duplicate req.json() calls",
      "Never insert await into non-async scope",
      "Return empty fallback safely if no thread exists",
    ],
    operations,
    confidence: operations.length > 0 ? "high" : "medium",
    summary: "Add minimal thread-based previous message loading support.",
  };
}

function buildUiAuthGateIntent(
  filePath: string,
  instruction: string,
  current: string
): PatchIntent {
  const operations: PatchOperation[] = [];

  if (!current.includes("useLexAuthState(")) {
    const helperBlock = `
function useLexAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(true);
  }, []);

  return isAuthenticated;
}
`;

    const insertAnchor =
      findFirstExistingAnchor(current, [
        'import { useState, useRef, useEffect, useCallback } from "react";',
        '"use client";',
      ]) ?? "";

    if (insertAnchor) {
      operations.push({
        type: "insert_after",
        description: "Add minimal UI auth state helper.",
        anchor: insertAnchor,
        content: `\n${helperBlock}`,
      });
    }
  }

  return {
    targetFile: filePath,
    goal: instruction,
    constraints: [
      "Keep UI auth gating minimal",
      "Do not build full auth UX yet",
      "Preserve existing layout and flow",
    ],
    operations,
    confidence: operations.length > 0 ? "medium" : "low",
    summary: "Add minimal authentication-state gating support in UI.",
  };
}

function buildAuthRouteIntent(
  filePath: string,
  instruction: string,
  current: string
): PatchIntent {
  const operations: PatchOperation[] = [];

  if (current.includes("export async function POST")) {
    if (current.includes(`const password = formData.get("password")?.toString() ?? "";`)) {
      operations.push({
        type: "replace_text",
        description: "Strengthen password extraction.",
        find: `const password = formData.get("password")?.toString() ?? "";`,
        replace: `const password = formData.get("password")?.toString().trim() ?? "";`,
      });
    }

    if (current.includes(`const email    = formData.get("email")?.toString()    ?? "";`)) {
      operations.push({
        type: "replace_text",
        description: "Strengthen email extraction.",
        find: `const email    = formData.get("email")?.toString()    ?? "";`,
        replace: `const email    = formData.get("email")?.toString().trim() ?? "";`,
      });
    }
  }

  return {
    targetFile: filePath,
    goal: instruction,
    constraints: [
      "Keep auth route bounded",
      "Preserve existing route exports",
      "Do not redesign full auth system",
    ],
    operations,
    confidence: operations.length > 0 ? "high" : "medium",
    summary: "Add minimal validation hardening to auth route.",
  };
}

function buildGenericIntent(
  filePath: string,
  instruction: string,
  current: string
): PatchIntent {
  const operations: PatchOperation[] = [];

  const probableImport = extractProbableImportLine(instruction);
  if (probableImport) {
    operations.push({
      type: "ensure_import",
      description: "Ensure requested import exists.",
      content: probableImport,
    });
  }

  if (operations.length === 0 && current.length > 0) {
    operations.push({
      type: "noop",
      description: "No deterministic rule matched.",
    });
  }

  return {
    targetFile: filePath,
    goal: instruction,
    constraints: [
      "No deterministic rule matched strongly enough",
      "Escalate to fallback intelligence if this no-ops",
    ],
    operations,
    confidence: operations[0]?.type === "noop" ? "low" : "medium",
    summary: "Generic patch intent generated.",
  };
}

function applyOperation(
  content: string,
  operation: PatchOperation
): { ok: boolean; changed: boolean; content: string; error: string } {
  switch (operation.type) {
    case "replace_text":
      return applyReplaceText(content, operation);
    case "insert_before":
      return applyInsertBefore(content, operation);
    case "insert_after":
      return applyInsertAfter(content, operation);
    case "append_file":
      return applyAppendFile(content, operation);
    case "prepend_file":
      return applyPrependFile(content, operation);
    case "ensure_import":
      return applyEnsureImport(content, operation);
    case "noop":
      return { ok: true, changed: false, content, error: "" };
    default:
      return {
        ok: false,
        changed: false,
        content,
        error: `Unsupported operation: ${String(operation.type)}`,
      };
  }
}

function applyReplaceText(
  content: string,
  operation: PatchOperation
): { ok: boolean; changed: boolean; content: string; error: string } {
  if (!operation.find || typeof operation.replace !== "string") {
    return {
      ok: false,
      changed: false,
      content,
      error: `replace_text missing find/replace: ${operation.description}`,
    };
  }

  if (!content.includes(operation.find)) {
    return {
      ok: false,
      changed: false,
      content,
      error: `replace_text anchor not found: ${operation.find}`,
    };
  }

  const next = content.replace(operation.find, operation.replace);
  return {
    ok: true,
    changed: next !== content,
    content: next,
    error: "",
  };
}

function applyInsertBefore(
  content: string,
  operation: PatchOperation
): { ok: boolean; changed: boolean; content: string; error: string } {
  if (!operation.anchor || !operation.content) {
    return {
      ok: false,
      changed: false,
      content,
      error: `insert_before missing anchor/content: ${operation.description}`,
    };
  }

  if (content.includes(operation.content.trim())) {
    return { ok: true, changed: false, content, error: "" };
  }

  const index = content.indexOf(operation.anchor);
  if (index === -1) {
    return {
      ok: false,
      changed: false,
      content,
      error: `insert_before anchor not found: ${operation.anchor}`,
    };
  }

  const next = content.slice(0, index) + operation.content + content.slice(index);
  return { ok: true, changed: true, content: next, error: "" };
}

function applyInsertAfter(
  content: string,
  operation: PatchOperation
): { ok: boolean; changed: boolean; content: string; error: string } {
  if (!operation.anchor || !operation.content) {
    return {
      ok: false,
      changed: false,
      content,
      error: `insert_after missing anchor/content: ${operation.description}`,
    };
  }

  if (content.includes(operation.content.trim())) {
    return { ok: true, changed: false, content, error: "" };
  }

  const index = content.indexOf(operation.anchor);
  if (index === -1) {
    return {
      ok: false,
      changed: false,
      content,
      error: `insert_after anchor not found: ${operation.anchor}`,
    };
  }

  const insertionPoint = index + operation.anchor.length;
  const next =
    content.slice(0, insertionPoint) + operation.content + content.slice(insertionPoint);

  return { ok: true, changed: true, content: next, error: "" };
}

function applyAppendFile(
  content: string,
  operation: PatchOperation
): { ok: boolean; changed: boolean; content: string; error: string } {
  if (!operation.content) {
    return {
      ok: false,
      changed: false,
      content,
      error: `append_file missing content: ${operation.description}`,
    };
  }

  if (content.includes(operation.content.trim())) {
    return { ok: true, changed: false, content, error: "" };
  }

  const next = content.endsWith("\n")
    ? content + operation.content
    : `${content}\n${operation.content}`;

  return { ok: true, changed: true, content: next, error: "" };
}

function applyPrependFile(
  content: string,
  operation: PatchOperation
): { ok: boolean; changed: boolean; content: string; error: string } {
  if (!operation.content) {
    return {
      ok: false,
      changed: false,
      content,
      error: `prepend_file missing content: ${operation.description}`,
    };
  }

  if (content.includes(operation.content.trim())) {
    return { ok: true, changed: false, content, error: "" };
  }

  return {
    ok: true,
    changed: true,
    content: `${operation.content}${content}`,
    error: "",
  };
}

function applyEnsureImport(
  content: string,
  operation: PatchOperation
): { ok: boolean; changed: boolean; content: string; error: string } {
  if (!operation.content) {
    return {
      ok: false,
      changed: false,
      content,
      error: `ensure_import missing content: ${operation.description}`,
    };
  }

  if (content.includes(operation.content.trim())) {
    return { ok: true, changed: false, content, error: "" };
  }

  const lines = content.split("\n");
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith("import ")) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    return {
      ok: true,
      changed: true,
      content: `${operation.content}\n${content}`,
      error: "",
    };
  }

  lines.splice(lastImportIndex + 1, 0, operation.content);
  return { ok: true, changed: true, content: lines.join("\n"), error: "" };
}

function detectJsonParsingContext(current: string):
  | { kind: "destructured"; statement: string }
  | { kind: "requestBody"; statement: string; variableName: string }
  | { kind: "none" } {
  const destructuredMatch = current.match(/const\s+\{[\s\S]*?\}\s*=\s*await\s+req\.json\(\);?/m);
  if (destructuredMatch?.[0]) {
    return {
      kind: "destructured",
      statement: destructuredMatch[0],
    };
  }

  const bodyMatch = current.match(/const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*await\s+req\.json\(\);?/m);
  if (bodyMatch?.[0] && bodyMatch?.[1]) {
    return {
      kind: "requestBody",
      statement: bodyMatch[0],
      variableName: bodyMatch[1],
    };
  }

  return { kind: "none" };
}

function findFirstExistingAnchor(current: string, anchors: string[]): string | null {
  for (const anchor of anchors) {
    if (current.includes(anchor)) return anchor;
  }
  return null;
}

function extractProbableImportLine(instruction: string): string | null {
  const match = instruction.match(/import\s+.+/i);
  return match ? match[0] : null;
}

function includesAny(input: string, values: string[]): boolean {
  return values.some((value) => input.includes(value));
}