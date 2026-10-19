import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ConclusionsSchema } from "../lib/lex-answer-meta";

test("confidence schema has no array length limits (Anthropic structured output rejects them)", () => {
  const json = JSON.stringify(z.toJSONSchema(ConclusionsSchema));
  assert.ok(!/"maxItems"|"minItems"/.test(json), json);
});
