import readline from "readline";
import { runAtlas, AtlasResult } from "./core/execution";

let AUTHORITY = false;

const EXEC_OPTS_HELP = "Commands: /authority on | /authority off | exit";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Atlas CLI ready. Type a command:");
console.log(EXEC_OPTS_HELP);

rl.on("line", async (rawInput) => {
  const input = rawInput.trim();

  if (!input) return;

  if (input === "exit") {
    console.log("Atlas: Shutting down.");
    rl.close();
    process.exit(0);
  }

  if (input === "/authority on") {
    AUTHORITY = true;
    console.log("Atlas: Full authority enabled.");
    return;
  }

  if (input === "/authority off") {
    AUTHORITY = false;
    console.log("Atlas: Full authority disabled.");
    return;
  }

  if (input === "/help") {
    console.log(EXEC_OPTS_HELP);
    return;
  }

  try {
    const result = await runAtlas(input, AUTHORITY);
    printResult(result);
  } catch (err) {
    console.error("Atlas error:", err instanceof Error ? err.message : String(err));
  }
});

rl.on("close", () => {
  process.exit(0);
});

function printResult(result: AtlasResult): void {
  console.log("");
  console.log(`mode:            ${result.mode}`);
  console.log(`summary:         ${result.summary}`);
  console.log(`files targeted:  ${result.filesTargeted.length ? result.filesTargeted.join(", ") : "none"}`);
  console.log(`files changed:   ${result.filesChanged.length ? result.filesChanged.join(", ") : "none"}`);
  console.log(`build result:    ${result.buildResult}`);
  console.log(`commit hash:     ${result.commitHash}`);
  console.log(`push result:     ${result.pushResult}`);
  console.log("");
}