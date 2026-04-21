import readline from "readline";
import { runAtlas, AtlasResult } from "./core/execution";
import { readMemory } from "./system/memory";
import { createOperatorPlan, OperatorPlan } from "./brain/operator";

export { handleInput };   // Add this line

let AUTHORITY = true;
let pendingPlan: OperatorPlan | null = null;
let pendingPlanState:
  | "execution_plan"
  | "implementation_request"
  | "phase1_execution"
  | "phase1_complete"
  | "phase2_execution"
  | null = null;

const HELP_TEXT = [
  "Commands:",
  "  /authority off      Disable write authority",
  "  /authority on       Re-enable write authority",
  "  /help               Show available commands",
  "  autofix             Run Tier 1 safe maintenance fixes",
  "  exit                Quit Atlas",
  "",
  "Notes:",
  "  - Single-line requests are processed automatically",
  "  - Pasted multi-line blocks are grouped together",
  "  - Press Enter on a blank line to submit a multi-line block",
].join("\n");

const APPROVE_PHRASES = [
  "y",
  "yes",
  "approve",
  "do it",
  "go ahead",
  "implement it",
  "proceed",
];

const CANCEL_PHRASES = [
  "n",
  "no",
  "cancel",
  "stop",
  "never mind",
];

const SINGLE_LINE_DEBOUNCE_MS = 450;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

let inputBuffer: string[] = [];
let inputTimer: NodeJS.Timeout | null = null;
let multilineMode = false;
let processingInput = false;

printStartup();
printSystemStatusAndSuggestions();

rl.on("line", async (rawLine) => {
  const line = rawLine.replace(/\r$/, "");
  const trimmed = line.trim();

  if (processingInput) return;

  if (!hasBufferedInput() && isImmediateInput(trimmed)) {
    processingInput = true;
    try {
      await handleInput(trimmed);
    } finally {
      processingInput = false;
    }
    return;
  }

  if (trimmed === "") {
    if (!hasBufferedInput()) return;

    clearInputTimer();
    const combined = consumeBufferedInput();
    if (!combined) return;

    processingInput = true;
    try {
      await handleInput(combined);
    } finally {
      processingInput = false;
    }
    return;
  }

  inputBuffer.push(line);

  if (inputBuffer.length === 1) {
    clearInputTimer();
    inputTimer = setTimeout(async () => {
      if (processingInput || multilineMode || !hasBufferedInput()) return;

      const combined = consumeBufferedInput();
      if (!combined) return;

      processingInput = true;
      try {
        await handleInput(combined);
      } finally {
        processingInput = false;
      }
    }, SINGLE_LINE_DEBOUNCE_MS);

    return;
  }

  if (!multilineMode) {
    multilineMode = true;
    clearInputTimer();
    console.log("Atlas: Multiline input mode. Enter a blank line to submit.\n");
  }
});

rl.on("SIGINT", () => shutdown());
rl.on("close", () => process.exit(0));

function hasBufferedInput(): boolean {
  return inputBuffer.some((line) => line.trim().length > 0);
}

function clearInputTimer(): void {
  if (inputTimer) {
    clearTimeout(inputTimer);
    inputTimer = null;
  }
}

function consumeBufferedInput(): string {
  const combined = inputBuffer.join("\n").trim();
  inputBuffer = [];
  multilineMode = false;
  return combined;
}

async function handleInput(rawInput: string): Promise<void> {
  const input = rawInput.trim();
  const lower = input.toLowerCase();

  if (!input) return;

  if (input === "exit") {
    shutdown();
    return;
  }

  if (input === "/help") {
    console.log(HELP_TEXT + "\n");
    return;
  }

  if (input === "/authority on") {
    AUTHORITY = true;
    console.log("Atlas: Full authority enabled.\n");
    return;
  }

  if (input === "/authority off") {
    AUTHORITY = false;
    console.log("Atlas: Full authority disabled.\n");
    return;
  }

  if (pendingPlan && APPROVE_PHRASES.includes(lower)) {
    if (pendingPlanState === "implementation_request") {
      const phase1Plan = createPhaseOnePlan(pendingPlan);
      printProjectPlan("PHASE 1 PLAN", phase1Plan);
      console.log("Approve execution? y / n\n");
      pendingPlan = phase1Plan;
      pendingPlanState = "phase1_execution";
      return;
    }

    if (pendingPlanState === "phase1_complete") {
      const phase2Plan = createPhaseTwoPlan(pendingPlan);
      printProjectPlan("PHASE 2 PLAN", phase2Plan);
      console.log("Approve execution? y / n\n");
      pendingPlan = phase2Plan;
      pendingPlanState = "phase2_execution";
      return;
    }

    if (
      pendingPlanState === "execution_plan" ||
      pendingPlanState === "phase1_execution" ||
      pendingPlanState === "phase2_execution"
    ) {
      console.log(`\n${buildExecutionStartLine(pendingPlan)}\n`);
      await executePlan(pendingPlan);
      return;
    }
  }

  if (pendingPlan && CANCEL_PHRASES.includes(lower)) {
    console.log("Atlas: Plan cancelled.\n");
    pendingPlan = null;
    pendingPlanState = null;
    return;
  }

  if (isTerminalNoise(input)) {
    printTerminalNoiseSummary(input);
    return;
  }

  try {
    if (isDirectCommand(input)) {
      const result = await runAtlas(input, AUTHORITY);
      printResult(result);
      return;
    }

    const interpreted = interpretConversationalInput(input);

    if (interpreted.reply) {
      console.log(`${interpreted.reply}\n`);
    }

    if (!interpreted.actionableInput) {
      return;
    }

    const plan = createOperatorPlan(interpreted.actionableInput);
    const implementationPlan = isImplementationPlan(plan);

    // Chat-first default:
    // clear bounded requests execute quietly without plan spam
    if (!implementationPlan && shouldExecuteChatFirst(plan)) {
      console.log(`${buildExecutionStartLine(plan)}\n`);
      await executePlan(plan);
      return;
    }

    // Big/broad implementation work still uses plan + confirmation
    if (implementationPlan && plan.needsApproval) {
      printProjectPlan("IMPLEMENTATION PROJECT", plan);
      console.log("Approve phase 1? y / n\n");
      pendingPlan = plan;
      pendingPlanState = "implementation_request";
      return;
    }

    // Fallbacks
    if (plan.mode === "suggest") {
      printConversationalSuggestions(plan);
      return;
    }

    if (plan.mode === "plan_then_execute") {
      printProjectPlan("OPERATOR PLAN", plan);
      console.log("Approval needed: y / n\n");
      pendingPlan = plan;
      pendingPlanState = "execution_plan";
      return;
    }

    if (plan.mode === "direct_execute") {
      console.log(`${buildExecutionStartLine(plan)}\n`);
      await executePlan(plan);
      return;
    }
  } catch (err) {
    console.error("Atlas error:", err instanceof Error ? err.message : String(err));
    console.log("");
  }
}

function shouldExecuteChatFirst(plan: OperatorPlan): boolean {
  return plan.mode === "direct_execute" || plan.mode === "plan_then_execute";
}

async function executePlan(plan: OperatorPlan): Promise<void> {
  for (const cmd of plan.commands) {
    console.log(`> ${cmd}`);
    const result = await runAtlas(cmd, AUTHORITY);
    printResult(result);
  }

  if (plan.goal.includes("Phase 1")) {
    console.log("\n================ PHASE 1 FINDINGS ================\n");

    console.log("System Overview:");
    plan.files.forEach((f) => console.log(`- ${f}`));

    console.log("\nKey Observations:");
    console.log("- Relevant files inspected successfully");
    console.log("- System structure identified");
    console.log("- No changes made during discovery phase");

    console.log("\nNext Step:");
    console.log("→ Create bounded Phase 2 implementation plan");

    console.log("\nProceed to Phase 2? y / n\n");

    pendingPlan = plan;
    pendingPlanState = "phase1_complete";
    return;
  }

  pendingPlan = null;
  pendingPlanState = null;
}

function createPhaseOnePlan(plan: OperatorPlan): OperatorPlan {
  const scopedFiles = choosePhaseOneFiles(plan);
  const discoveryFocus = inferDiscoveryFocus(plan);
  const commands = buildPhaseOneCommands(scopedFiles);

  return {
    mode: "plan_then_execute",
    goal: `${plan.goal} — Phase 1`,
    summary: "Scoped Phase 1 discovery plan created from implementation project approval.",
    steps: [
      `Inspect relevant files: ${scopedFiles.join(", ")}`,
      `Identify current architecture for ${discoveryFocus}`,
      "Identify MVP boundary",
      "Identify exact file touch points for implementation",
      "Validate whether current system already has reusable patterns",
      "Keep scope constrained to discovery only — no broad feature patching yet",
    ],
    risks: [
      "Phase 1 is intentionally bounded and should not attempt full feature delivery",
      "Do not patch broad multi-file functionality until Phase 1 findings are reviewed",
      "Discovery should reduce implementation risk, not expand scope",
    ],
    files: scopedFiles,
    commands,
    confidence: "high",
    needsApproval: true,
    userMessage: `Phase 1 is scoped to discovery for ${discoveryFocus}.`,
  };
}

function createPhaseTwoPlan(plan: OperatorPlan): OperatorPlan {
  const files = dedupeAndLimit(plan.files, 3);
  const commands: string[] = [];
  const goalText = `${plan.goal} ${plan.summary} ${plan.userMessage}`.toLowerCase();

  if (
    goalText.includes("persistent chat history") ||
    goalText.includes("chat history") ||
    goalText.includes("history") ||
    goalText.includes("persistent")
  ) {
    commands.push(
      "inspect app/api/chat/route.ts",
      "update app/api/chat/route.ts add threadId and projectId fields to saved conversations and ensure they persist",
      "inspect app/api/lex-chat/route.ts",
      "update app/api/lex-chat/route.ts add ability to load conversations by threadId and return previous messages",
      "run build"
    );

    return {
      mode: "plan_then_execute",
      goal: `${stripPhaseSuffix(plan.goal)} — Phase 2`,
      summary: "Concrete implementation steps generated from Phase 1 findings.",
      steps: [
        "Inspect chat persistence routes",
        "Add minimal persistence fields for conversations",
        "Add minimal thread-based retrieval support",
        "Run build and verify",
      ],
      risks: [
        "Still heuristic-based — review changed files carefully",
        "Keep changes limited to persistence and retrieval only",
      ],
      files: ["app/api/chat/route.ts", "app/api/lex-chat/route.ts"],
      commands,
      confidence: "high",
      needsApproval: true,
      userMessage: "Phase 2 now includes concrete implementation steps for chat history persistence.",
    };
  }

  if (goalText.includes("auth")) {
    commands.push(
      "inspect app/api/auth/login/route.ts",
      "update app/api/auth/login/route.ts add session token return and basic validation logic",
      "inspect app/lex/page.tsx",
      "update app/lex/page.tsx restrict access based on authentication state",
      "run build"
    );

    return {
      mode: "plan_then_execute",
      goal: `${stripPhaseSuffix(plan.goal)} — Phase 2`,
      summary: "Concrete implementation steps generated from Phase 1 findings.",
      steps: [
        "Inspect auth route and Lex entry point",
        "Add minimal session/auth behavior",
        "Restrict Lex based on auth state",
        "Run build and verify",
      ],
      risks: [
        "Keep auth scope minimal",
        "Do not expand into full identity system yet",
      ],
      files: ["app/api/auth/login/route.ts", "app/lex/page.tsx"],
      commands,
      confidence: "high",
      needsApproval: true,
      userMessage: "Phase 2 now includes concrete implementation steps for Lex authentication.",
    };
  }

  if (goalText.includes("project") || goalText.includes("thread")) {
    commands.push(
      "inspect app/api/lex-chat/route.ts",
      "update app/api/lex-chat/route.ts add minimal threadId handling for saved conversations",
      "inspect app/lex/page.tsx",
      "update app/lex/page.tsx add minimal state support for current thread selection",
      "run build"
    );

    return {
      mode: "plan_then_execute",
      goal: `${stripPhaseSuffix(plan.goal)} — Phase 2`,
      summary: "Concrete implementation steps generated from Phase 1 findings.",
      steps: [
        "Inspect Lex API and UI files",
        "Add minimal thread persistence support",
        "Add minimal UI state for thread selection",
        "Run build and verify",
      ],
      risks: [
        "Keep scope to minimum viable persistence only",
        "Avoid building full project management UI yet",
      ],
      files: ["app/api/lex-chat/route.ts", "app/lex/page.tsx"],
      commands,
      confidence: "high",
      needsApproval: true,
      userMessage: "Phase 2 now includes concrete implementation steps for project/thread persistence.",
    };
  }

  for (const file of files.slice(0, 2)) {
    commands.push(
      `inspect ${file}`,
      `update ${file} implement minimal feature support based on phase 1 findings`
    );
  }
  commands.push("run build");

  return {
    mode: "plan_then_execute",
    goal: `${stripPhaseSuffix(plan.goal)} — Phase 2`,
    summary: "Concrete implementation steps generated from Phase 1 findings.",
    steps: [
      "Inspect relevant files",
      "Apply targeted updates",
      "Run build and verify",
    ],
    risks: [
      "Still heuristic-based — may require refinement",
      "Changes should remain minimal and scoped",
    ],
    files: files.slice(0, 2),
    commands,
    confidence: "high",
    needsApproval: true,
    userMessage: "Phase 2 now includes concrete implementation steps.",
  };
}

function choosePhaseOneFiles(plan: OperatorPlan): string[] {
  const goal = `${plan.goal} ${plan.summary} ${plan.userMessage}`.toLowerCase();
  const existing = Array.from(new Set(plan.files));

  if (goal.includes("persistent chat history") || goal.includes("chat history")) {
    return dedupeAndLimit(
      ["app/api/chat/route.ts", "app/api/lex-chat/route.ts", ...existing],
      3
    );
  }

  if (goal.includes("auth")) {
    return dedupeAndLimit(
      ["app/lex/page.tsx", "app/api/auth/login/route.ts", "app/api/portal/auth/route.ts", ...existing],
      3
    );
  }

  if (goal.includes("project") || goal.includes("thread")) {
    return dedupeAndLimit(
      ["app/lex/page.tsx", "app/api/lex-chat/route.ts", "lib/lex-config.ts", ...existing],
      3
    );
  }

  if (goal.includes("dashboard")) {
    return dedupeAndLimit(
      ["atlas/atlas.ts", "atlas/core/execution.ts", "app/mission-control/page.tsx", ...existing],
      3
    );
  }

  if (existing.length > 0) {
    return existing.slice(0, 3);
  }

  return ["app/page.tsx"];
}

function buildPhaseOneCommands(files: string[]): string[] {
  const commands: string[] = [];

  for (const file of files) {
    commands.push(`inspect ${file}`);
  }

  commands.push("run build");

  return commands;
}

function inferDiscoveryFocus(plan: OperatorPlan): string {
  const text = `${plan.goal} ${plan.summary} ${plan.userMessage}`.toLowerCase();

  if (text.includes("auth")) return "authentication flow";
  if (text.includes("project") || text.includes("thread")) return "project and thread lifecycle";
  if (text.includes("history") || text.includes("chat")) return "chat persistence flow";
  if (text.includes("dashboard")) return "dashboard architecture";

  return "implementation architecture";
}

function stripPhaseSuffix(goal: string): string {
  return goal.replace(/\s+—\s+Phase\s+\d+$/i, "");
}

function dedupeAndLimit(files: string[], limit: number): string[] {
  return Array.from(new Set(files)).slice(0, limit);
}

function isImplementationPlan(plan: OperatorPlan): boolean {
  return (
    plan.summary === "Implementation project detected" ||
    plan.userMessage.includes("This is an implementation project.")
  );
}

function buildExecutionStartLine(plan: OperatorPlan): string {
  const goal = plan.goal.toLowerCase();

  if (goal.includes("lex")) return "Got it — I’m working on Lex now.";
  if (goal.includes("rex")) return "Got it — I’m working on Rex now.";
  if (goal.includes("atlas")) return "Got it — I’m updating Atlas now.";
  if (goal.includes("build")) return "Got it — I’m running the build now.";

  return "Got it — I’m on it.";
}

function printProjectPlan(title: string, plan: OperatorPlan): void {
  console.log(`\n================ ${title} ================\n`);
  console.log(`Goal: ${plan.goal}`);
  console.log(`Summary: ${plan.summary}`);
  console.log(`Confidence: ${plan.confidence}`);
  console.log(`Action: ${plan.userMessage}\n`);

  if (plan.files.length > 0) {
    console.log("Files:");
    for (const file of plan.files) {
      console.log(`- ${file}`);
    }
    console.log("");
  }

  if (plan.steps.length > 0) {
    console.log("Steps:");
    plan.steps.forEach((step, idx) => console.log(`${idx + 1}. ${step}`));
    console.log("");
  }

  if (plan.risks.length > 0) {
    console.log("Risks:");
    plan.risks.forEach((risk) => console.log(`- ${risk}`));
    console.log("");
  }
}

function printConversationalSuggestions(plan: OperatorPlan): void {
  console.log("I’m not fully sure what you want yet.\n");
  if (plan.commands.length > 0) {
    console.log("Try one of these:");
    plan.commands.forEach((cmd) => console.log(`- ${cmd}`));
    console.log("");
  }
}

function printStartup(): void {
  console.log("Atlas CLI ready. Type a command:");
  console.log(HELP_TEXT);
  console.log("Atlas: Full authority enabled by default.");
  console.log("⚠️  Running in FULL AUTHORITY mode (auto-approved changes)\n");
}

function printSystemStatusAndSuggestions(): void {
  const mem = readMemory() as {
    lastBuild?: { status?: string };
    lastFailure?: { file?: string };
    lastRevert?: { files?: string[] };
    warnings?: string[];
    repoState?: { dirty?: boolean };
    temporaryRules?: string[];
  };

  console.log("================ SYSTEM STATUS ================\n");

  if (mem.lastBuild?.status === "success") {
    console.log("✅ Last build: success");
  } else if (mem.lastBuild?.status === "failed") {
    console.log("❌ Last build: failed");
  } else {
    console.log("ℹ️ Last build: unknown");
  }

  if (mem.lastFailure?.file) {
    console.log(`⚠️ Last failure file: ${mem.lastFailure.file}`);
  }

  if (mem.lastRevert?.files?.length) {
    console.log(`⚠️ Recent revert: ${mem.lastRevert.files.join(", ")}`);
  }

  if (mem.repoState?.dirty) {
    console.log("⚠️ Repo state: dirty");
  }

  if (mem.warnings?.length) {
    console.log(`⚠️ Active warnings: ${mem.warnings.length}`);
  }

  if (mem.temporaryRules?.length) {
    console.log(`⚠️ Temporary rules active: ${mem.temporaryRules.length}`);
  }

  console.log("");

  const suggestions = buildSuggestions(mem);

  if (suggestions.length > 0) {
    console.log("================ SUGGESTIONS ================\n");
    for (const s of suggestions) console.log(`💡 ${s}`);
    console.log("");
  }
}

function buildSuggestions(mem: any): string[] {
  const suggestions: string[] = [];

  const shouldAutofix =
    mem.repoState?.dirty ||
    mem.warnings?.length ||
    mem.temporaryRules?.length ||
    mem.lastRevert?.files?.length;

  if (mem.lastBuild?.status === "failed" && mem.lastFailure?.file) {
    suggestions.push(`Last build failed. Start with: inspect ${mem.lastFailure.file}`);
  }

  if (mem.lastRevert?.files?.length) {
    suggestions.push(`Recent revert detected: ${mem.lastRevert.files.join(", ")}`);
  }

  if (mem.repoState?.dirty) {
    suggestions.push("Repo is dirty. Commit before risky changes.");
  }

  if (mem.warnings?.length) {
    suggestions.push("Warnings present. Review before continuing.");
  }

  if (mem.temporaryRules?.length) {
    suggestions.push("Temporary rules active. Clean them up.");
  }

  if (shouldAutofix) {
    suggestions.push("Run: autofix");
  }

  if (suggestions.length === 0 && mem.lastBuild?.status === "success") {
    suggestions.push("System looks healthy. Continue.");
  }

  return suggestions;
}

function isDirectCommand(input: string): boolean {
  const lower = input.toLowerCase();

  return (
    lower.startsWith("inspect ") ||
    lower.startsWith("update ") ||
    lower.startsWith("run ") ||
    lower === "autofix"
  );
}

function isImmediateInput(input: string): boolean {
  const lower = input.toLowerCase();

  return (
    lower === "exit" ||
    lower === "/help" ||
    lower === "/authority on" ||
    lower === "/authority off" ||
    APPROVE_PHRASES.includes(lower) ||
    CANCEL_PHRASES.includes(lower) ||
    isDirectCommand(input)
  );
}

function isTerminalNoise(input: string): boolean {
  const trimmed = input.trim();

  if (!trimmed) return false;
  if (isDirectCommand(trimmed)) return false;
  if (isImmediateInput(trimmed)) return false;

  const patterns = [
    /^last login:/im,
    /^\w[\w.-]*@[\w.-]+.*[%#$>]\s?/m,
    /npm run build/i,
    /\bnext\.js\b/i,
    /\btypeerror:/i,
    /\berror:/i,
    /\bzsh:/i,
    /\bgrep\s+-r\b/i,
    /\bat .+:\d+:\d+/i,
    /\bnode\.js\b/i,
    /failed to compile/i,
    /build error occurred/i,
    /creating an optimized production build/i,
    /collecting page data/i,
    /generating static pages/i,
    /route \(app\)/i,
    /mode:\s+execute/i,
    /summary:\s+/i,
    /files targeted:\s+/i,
    /files changed:\s+/i,
    /build result:\s+/i,
    /commit hash:\s+/i,
    /push result:\s+/i,
    /what's next\?/i,
    /no such file or directory/i,
  ];

  return patterns.some((p) => p.test(trimmed));
}

function printTerminalNoiseSummary(input: string): void {
  console.log("\n================ TERMINAL / LOG INPUT DETECTED ================\n");
  console.log("Atlas: This looks like terminal output, a shell command, or a build log.");
  console.log("Atlas: Not treating it as an implementation request.\n");

  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (lines.length > 0) {
    console.log("Preview:");
    lines.forEach((line) => console.log(`- ${line}`));
    console.log("");
  }

  console.log("Suggestions:");
  console.log("- Ask Atlas to explain the terminal output");
  console.log("- Ask Atlas to fix the specific build/runtime/type error");
  console.log("- Paste a target file and request a concrete rewrite");
  console.log("");
}

type ConversationalInterpretation = {
  reply: string;
  actionableInput: string | null;
};

function interpretConversationalInput(input: string): ConversationalInterpretation {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "hey" || lower === "hi" || lower === "hello") {
    return {
      reply: "Hey. Tell me what you want to change, inspect, or build.",
      actionableInput: null,
    };
  }

  let cleaned = trimmed
    .replace(/^(hey|hi|hello)\s+(atlas[,!\s]*)?/i, "")
    .replace(/^(atlas[:,]?\s*)/i, "")
    .replace(/^(can you|could you|would you)\s+/i, "")
    .replace(/^(please)\s+/i, "")
    .replace(/^(i want to|i want|i need to|i need)\s+/i, "")
    .replace(/^(let's|lets)\s+/i, "")
    .trim();

  if (!cleaned) {
    return {
      reply: "Tell me the target and the action you want. Example: lex chatbot add saved threads.",
      actionableInput: null,
    };
  }

  if (cleaned.toLowerCase().includes("like chatgpt") && cleaned.toLowerCase().includes("lex")) {
    cleaned = "add saved projects and threads to lex like chatgpt";
  }

  if (
    cleaned.toLowerCase().includes("lex") &&
    cleaned.toLowerCase().includes("spacing")
  ) {
    cleaned = "fix lex ui spacing issues";
  }

  if (
    cleaned.toLowerCase().includes("rex") &&
    cleaned.toLowerCase().includes("spacing")
  ) {
    cleaned = "fix rex dashboard spacing issues";
  }

  const reply =
    cleaned !== trimmed
      ? `Understood. Treating that as: ${cleaned}`
      : "Understood.";

  return {
    reply,
    actionableInput: cleaned,
  };
}

function shutdown(): void {
  console.log("Atlas: Shutting down.");
  rl.close();
}

function printResult(result: AtlasResult): void {
  console.log("");
  console.log(`mode:            ${result.mode}`);
  console.log(`summary:         ${result.summary}`);
  console.log(`files targeted:  ${result.filesTargeted.join(", ") || "none"}`);
  console.log(`files changed:   ${result.filesChanged.join(", ") || "none"}`);
  console.log(`build result:    ${result.buildResult}`);
  console.log(`commit hash:     ${result.commitHash}`);
  console.log(`push result:     ${result.pushResult}`);
  console.log("");

  console.log("✅ 100% Complete");

  const bullets: string[] = [];

  if (result.filesChanged.length > 0) {
    bullets.push(`Updated ${result.filesChanged.length} file(s)`);
  } else if (result.filesTargeted.length > 0) {
    bullets.push(`Processed ${result.filesTargeted.length} file(s)`);
  } else {
    bullets.push("No files were changed");
  }

  if (result.buildResult === "success") {
    bullets.push("Build passed");
  } else if (result.buildResult === "failed") {
    bullets.push("Build failed");
  } else {
    bullets.push("Build not run");
  }

  if (result.commitHash && result.commitHash !== "none") {
    bullets.push(`Commit created: ${result.commitHash}`);
  }

  if (bullets.length > 0) {
    console.log("Completed:");
    bullets.forEach((b) => console.log(`- ${b}`));
    console.log("");
  }

  console.log("What's next?");
  if (result.buildResult === "failed") {
    console.log("- Inspect the failing file or error output");
    console.log("- Apply a bounded fix");
    console.log("- Run build again");
  } else if (result.filesChanged.length > 0) {
    console.log("- Review the change");
    console.log("- Test the affected flow");
    console.log("- Continue with the next task");
  } else {
    console.log("- Inspect a target file");
    console.log("- Run build");
    console.log("- Or give Atlas the next instruction");
  }

  console.log("");
}