"use client";

// "Run the numbers" handoff — when a client picks a package from the
// dashboard or a package detail page and wants to model it, we stash the
// property here and route them to a calculator, which consumes (and clears)
// it on mount so it only ever applies once, never silently overriding a
// scenario the client is later editing on their own.

import { saveJSON } from "./portal";

const SELECTED_PROPERTY_KEY = "wh_selected_property";

export type SelectedProperty = {
  id: string;
  name: string;
  price: number;
  state?: string;
  suburb?: string;
};

export function setSelectedProperty(p: SelectedProperty): void {
  saveJSON(SELECTED_PROPERTY_KEY, p);
}

/** Reads the selected property, if any, and clears it — a one-time consume. */
export function consumeSelectedProperty(): SelectedProperty | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SELECTED_PROPERTY_KEY);
    if (!raw) return null;
    localStorage.removeItem(SELECTED_PROPERTY_KEY);
    return JSON.parse(raw) as SelectedProperty;
  } catch {
    return null;
  }
}
