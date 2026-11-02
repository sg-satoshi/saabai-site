"use client";

import { useEffect, useState } from "react";

/** One click from the email: this page POSTs immediately. GET itself changes nothing. */
export default function UnsubNow({ token }: { token: string }) {
  const [state, setState] = useState<"working" | "done" | "bad">("working");

  useEffect(() => {
    let live = true;
    fetch("/api/email/unsubscribe?t=" + encodeURIComponent(token), { method: "POST" })
      .then((r) => { if (live) setState(r.ok ? "done" : "bad"); })
      .catch(() => { if (live) setState("bad"); });
    return () => { live = false; };
  }, [token]);

  if (state === "done") return <p><b>Done.</b> You won't get marketing email from us. This takes effect straight away.</p>;
  if (state === "bad") return <p>That link didn't work. Open the latest email and use the unsubscribe link again.</p>;
  return <p>Unsubscribing…</p>;
}
