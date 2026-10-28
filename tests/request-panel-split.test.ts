import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOTTOM_MIN,
  HANDLE_PX,
  PANEL_DEFAULT,
  PANEL_MIN,
  SPLIT_STEP,
  TOP_MIN,
  clampPanelWidth,
  clampSplit,
  loadPanelWidth,
  loadSplit,
  moveSplit,
  persistPanelWidth,
  persistSplit,
  splitEnd,
  splitHome,
  REPLY_DEFAULT,
  REPLY_MIN,
  TABS_PX,
  THREAD_MIN,
  THREAD_RATIO,
  clampReply,
  defaultReply,
  defaultTop,
  loadReply,
  moveReply,
  persistReply,
  replyEnd,
  replyHome,
  threadHeight,
} from "../app/saabai-admin/requests/split";

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

test("split keeps both sections above their minimums", () => {
  const panel = 900;
  assert.equal(clampSplit(40, panel), TOP_MIN);
  assert.equal(clampSplit(400, panel), 400);
  assert.equal(clampSplit(5000, panel), panel - HANDLE_PX - BOTTOM_MIN);
  assert.equal(clampSplit(Number.NaN, panel), TOP_MIN);
  assert.equal(moveSplit(400, panel, SPLIT_STEP), 424);
  assert.equal(moveSplit(400, panel, -SPLIT_STEP), 376);
  assert.equal(splitHome(panel), TOP_MIN);
  assert.equal(splitEnd(panel), panel - HANDLE_PX - BOTTOM_MIN);
});

test("a short panel does not invent space", () => {
  assert.equal(clampSplit(400, 200), TOP_MIN);
  assert.equal(clampSplit(400, 100), 100 - HANDLE_PX);
});

test("split persistence clamps on load and clears on reset", () => {
  const store = memory();
  assert.equal(loadSplit(store, 900), null);
  persistSplit(store, 400);
  assert.equal(loadSplit(store, 900), 400);
  persistSplit(store, 900);
  assert.equal(loadSplit(store, 900), 900 - HANDLE_PX - BOTTOM_MIN);
  assert.equal(loadSplit(store, 400), TOP_MIN);
  store.setItem("mc.requests.split", "nope");
  assert.equal(loadSplit(store, 900), null);
  persistSplit(store, null);
  assert.equal(store.getItem("mc.requests.split"), null);
});

test("panel width stays between 420px and 60 percent of the viewport", () => {
  assert.equal(clampPanelWidth(200, 1400), PANEL_MIN);
  assert.equal(clampPanelWidth(500, 1400), 500);
  assert.equal(clampPanelWidth(2000, 1000), 600);
  assert.equal(clampPanelWidth(PANEL_DEFAULT, 500), PANEL_MIN);
  const store = memory();
  assert.equal(loadPanelWidth(store, 1400), PANEL_DEFAULT);
  persistPanelWidth(store, 900);
  assert.equal(loadPanelWidth(store, 1400), 840);
  persistPanelWidth(store, null);
  assert.equal(loadPanelWidth(store, 1400), PANEL_DEFAULT);
});

test("the default header leaves the thread at least 45 percent of an 800px panel", () => {
  const panel = 800;
  const top = defaultTop(panel);
  assert.ok(top >= TOP_MIN);
  assert.ok(top <= panel - HANDLE_PX - BOTTOM_MIN);
  assert.ok(threadHeight(panel, top) >= Math.round(panel * THREAD_RATIO));
});

test("the reply box stays between 110px and the space above a 160px thread", () => {
  const bottom = 500;
  assert.equal(clampReply(40, bottom), REPLY_MIN);
  assert.equal(clampReply(REPLY_DEFAULT, bottom), REPLY_DEFAULT);
  assert.equal(clampReply(5000, bottom), bottom - TABS_PX - HANDLE_PX - THREAD_MIN);
  assert.equal(moveReply(150, bottom, 24), 174);
  assert.equal(moveReply(150, bottom, -24), 126);
  assert.equal(replyHome(bottom), REPLY_MIN);
  assert.equal(replyEnd(bottom), bottom - TABS_PX - HANDLE_PX - THREAD_MIN);
  assert.equal(defaultReply(bottom), REPLY_DEFAULT);
  assert.equal(clampReply(200, 120), 120 - TABS_PX - HANDLE_PX);
});

test("reply split persistence clamps on load and clears on reset", () => {
  const store = memory();
  assert.equal(loadReply(store, 500), REPLY_DEFAULT);
  persistReply(store, 240);
  assert.equal(loadReply(store, 500), 240);
  assert.equal(loadReply(store, 280), REPLY_MIN);
  store.setItem("mc.requests.replySplit", "nope");
  assert.equal(loadReply(store, 500), REPLY_DEFAULT);
  persistReply(store, null);
  assert.equal(store.getItem("mc.requests.replySplit"), null);
});
