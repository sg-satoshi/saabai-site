import { after } from "next/server";

/**
 * Run work after the response is sent (so timing and errors never affect it).
 * Outside a Next.js request scope (tests, scripts) the task runs immediately.
 */
export function runAfterResponse(task: () => Promise<unknown>): void {
  const safe = () => task().then(() => undefined, () => undefined);
  try {
    after(safe);
  } catch {
    void safe();
  }
}
