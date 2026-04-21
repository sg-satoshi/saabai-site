export type Intent = "QUESTION" | "INVESTIGATE" | "EXECUTE" | "AUTOFIX";

export function classifyIntent(input: string): Intent {
  const lower = input.toLowerCase().trim();

  if (!lower) return "QUESTION";

  if (isAutofixIntent(lower)) {
    return "AUTOFIX";
  }

  if (isInvestigateIntent(lower)) {
    return "INVESTIGATE";
  }

  if (isQuestionIntent(lower)) {
    return "QUESTION";
  }

  return "EXECUTE";
}

function isAutofixIntent(input: string): boolean {
  return (
    input === "autofix" ||
    input.startsWith("autofix ") ||
    input.includes("auto-fix") ||
    input.includes("auto fix")
  );
}

function isInvestigateIntent(input: string): boolean {
  return (
    input.startsWith("inspect ") ||
    input.startsWith("read ") ||
    input.startsWith("show ") ||
    input.startsWith("view ")
  );
}

function isQuestionIntent(input: string): boolean {
  return input.endsWith("?") || input.startsWith("what ") || input.startsWith("why ");
}