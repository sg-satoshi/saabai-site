/**
 * Read a password for a CLI script without echoing it: from piped stdin when
 * not a TTY, otherwise via a hidden prompt. Never put passwords on the command
 * line (they end up in shell history and process lists).
 */
export async function readPassword(prompt: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const c of stdin) chunks.push(Buffer.from(c));
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }
  process.stderr.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve) => {
    let value = "";
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n" || c === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stderr.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u0003") { process.stderr.write("\n"); process.exit(130); }
        if (c === "\u007f" || c === "\b") { value = value.slice(0, -1); continue; }
        value += c;
      }
    };
    stdin.on("data", onData);
  });
}
