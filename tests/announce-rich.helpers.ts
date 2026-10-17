export { safeUrl, validateAnnouncement, toPublic, announcementValue } from "../lib/announce/core";
import { buildTest } from "../lib/announce/test";
import type { Announcement } from "../lib/announce/core";
export const buildTestSafe = (a: Announcement) => buildTest(a, "bar_vs_none", "call_click");
