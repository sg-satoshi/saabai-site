import test from "node:test";
import assert from "node:assert/strict";
import { portalPageFromSearchParam, PORTAL_REQUESTS_HREF } from "../lib/portal-pages";

test("portal deep link: requests and upgrades resolve; unknown falls back to overview", () => {
  assert.equal(portalPageFromSearchParam("requests"), "requests");
  assert.equal(portalPageFromSearchParam("upgrades"), "upgrades");
  assert.equal(portalPageFromSearchParam("nope"), "overview");
  assert.equal(portalPageFromSearchParam(null), "overview");
  assert.equal(PORTAL_REQUESTS_HREF, "/client-portal?page=requests");
});
