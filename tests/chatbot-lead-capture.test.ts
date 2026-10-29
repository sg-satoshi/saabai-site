import { test } from "node:test";
import assert from "node:assert/strict";
import { leadCaptureEnabled, parseLead, routeLead } from "../lib/chatbot/lead-capture";

test("flag off by default", () => {
  assert.equal(leadCaptureEnabled({}), false);
  assert.equal(leadCaptureEnabled({ CHATBOT_LEAD_CAPTURE_ENABLED: "1" }), true);
});
test("parseLead validates", () => {
  assert.equal(parseLead("b", { email: "x@y.com" }), "Consent required");
  assert.equal(parseLead("b", { consent: true }), "Email or phone required");
  assert.equal(parseLead("b", { email: "bad", consent: true }), "Invalid email");
  const l = parseLead("b", { email: " A@B.com ", consent: true, name: " Jo " }, 5);
  assert.deepEqual(l, { botId: "b", name: "Jo", email: "a@b.com", phone: undefined, message: undefined, consent: true, capturedAt: 5 });
});
test("routeLead never sends", () => {
  const l = parseLead("b", { phone: "0400 000 000", consent: true }) as any;
  assert.equal(routeLead(l, {}), "off");
  assert.equal(routeLead(l, { CHATBOT_LEAD_CAPTURE_ENABLED: "1" }), "store");
});
