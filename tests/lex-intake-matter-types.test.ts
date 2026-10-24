import test from "node:test";
import assert from "node:assert/strict";
import {
  LEX_INTAKE_MATTER_TYPES,
  LEX_INTAKE_MATTER_TYPE_DEFAULT,
  isLexIntakeMatterType,
} from "../lib/lex-intake-matter-types";

test("intake matter types include Tax and keep Property as default", () => {
  assert.equal(LEX_INTAKE_MATTER_TYPES[0], "Tax");
  assert.ok(LEX_INTAKE_MATTER_TYPES.includes("Tax"));
  assert.equal(LEX_INTAKE_MATTER_TYPE_DEFAULT, "Property");
  assert.ok(isLexIntakeMatterType("Tax"));
  assert.ok(isLexIntakeMatterType("Property"));
  assert.equal(isLexIntakeMatterType("Bogus"), false);
});
