import { test } from "node:test";
import assert from "node:assert/strict";
import { parseModelSpec } from "../lib/chat-config";

test("trims a trailing newline and spaces from model env values", () => {
  assert.deepEqual(parseModelSpec("xai:grok-4.3\n", "anthropic:x"), { provider: "xai", modelId: "grok-4.3", value: "xai:grok-4.3" });
  assert.equal(parseModelSpec("  xai : grok-4.3 \r\n", "anthropic:x").modelId, "grok-4.3");
  assert.equal(parseModelSpec("  xai : grok-4.3 \r\n", "anthropic:x").provider, "xai");
});

test("blank or whitespace-only values use the fallback", () => {
  assert.equal(parseModelSpec(undefined, "anthropic:claude-haiku-4-5").modelId, "claude-haiku-4-5");
  assert.equal(parseModelSpec("\n  ", "anthropic:claude-haiku-4-5").provider, "anthropic");
});

test("no provider prefix means anthropic", () => {
  assert.deepEqual(parseModelSpec("claude-sonnet-4-6\n", "x"), { provider: "anthropic", modelId: "claude-sonnet-4-6", value: "claude-sonnet-4-6" });
});
