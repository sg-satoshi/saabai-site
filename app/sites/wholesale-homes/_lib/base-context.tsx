"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The URL prefix for Wholesale pages on the current host: "" on
 * wholesalehomes.com.au, "/sites/wholesale-homes" on saabai.ai / previews.
 * Computed on the server from the Host header (see wholesaleBasePath) and
 * handed down, so server and client render the same links.
 */
const WhBaseContext = createContext<string>("");

export function WhBaseProvider({ base, children }: { base: string; children: ReactNode }) {
  return <WhBaseContext.Provider value={base}>{children}</WhBaseContext.Provider>;
}

export function useWhBase(): string {
  return useContext(WhBaseContext);
}
