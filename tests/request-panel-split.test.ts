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
  persistSplit(store, 640);
  assert.equal(loadSplit(store, 900), 640);
  assert.equal(loadSplit(store, 400), 400 - HANDLE_PX - BOTTOM_MIN);
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
