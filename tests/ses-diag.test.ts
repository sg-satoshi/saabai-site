import { test } from "node:test";
import assert from "node:assert/strict";
import { sesEnvDiag } from "../lib/email/ses-diag";

test("sesEnvDiag reports only non-secret facts", () => {
  const secret = "abcdEFGHijklMNOPqrstUVWXyz0123456789+/ab";
  const out = sesEnvDiag({ AWS_SES_ACCESS_KEY_ID: "AKIAXXXXYYYYZZZZ1234\n", AWS_SES_SECRET_ACCESS_KEY: secret, AWS_SES_REGION: "ap-southeast-2", VERCEL_ENV: "production", VERCEL_DEPLOYMENT_ID: "dpl_x" } as unknown as NodeJS.ProcessEnv);
  assert.ok(!out.includes(secret.slice(0, 6)));
  assert.ok(!out.includes("XXXXYYYY"));
  assert.match(out, /id=AKIA\/len21\/ws/);
  assert.match(out, /secret=len40\/clean/);
  assert.match(out, /sess_tok=false aws_key_id=false vercel_env=production dpl=dpl_x/);
});
