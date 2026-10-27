"use client";

import { useEffect } from "react";
import { setChatOpen } from "@/lib/conversation-activity";

/** Publish a text widget's open state on the shared interrupt hold. */
export function useChatOpen(id: string, open: boolean) {
  useEffect(() => {
    setChatOpen(id, open);
    return () => setChatOpen(id, false);
  }, [id, open]);
}
