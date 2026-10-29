"use client";

import { useEffect } from "react";
import { CONVERTED_KEY, markFlag } from "@/lib/exit-popup";

/** Marks this browser as converted (purchase or lead sent), so the exit pop-up never shows again. Renders nothing. */
export default function MarkConverted() {
  useEffect(() => {
    try { markFlag(localStorage, CONVERTED_KEY); } catch { /* storage blocked */ }
  }, []);
  return null;
}
