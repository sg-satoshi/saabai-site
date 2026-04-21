import fs from "fs";
import path from "path";
import { PROJECT_ROOT } from "../core/utils";

const MEMORY_PATH = path.join(PROJECT_ROOT, "atlas/system/memory.json");

export function readMemory() {
  if (!fs.existsSync(MEMORY_PATH)) return {};
  return JSON.parse(fs.readFileSync(MEMORY_PATH, "utf-8"));
}

export function updateMemory(patch: any) {
  const current = readMemory();
  const next = deepMerge(current, patch);
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(next, null, 2));
}

function deepMerge(target: any, source: any) {
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}