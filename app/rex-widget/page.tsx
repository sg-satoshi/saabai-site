"use client";

import PeterAvatarWidget from "../components/PeterAvatarWidget";

// This page is loaded inside a transparent full-screen iframe on plasticonline.com.au.
// The body is transparent so only the widget launcher + chat window are visible.
// Clicks pass through transparent areas back to the parent page.
export default function RexWidgetPage() {
  return (
    // pointer-events: none on the outer shell — transparent areas pass clicks through to the parent page.
    // The widget's own fixed-positioned elements (launcher, chat window) handle their own pointer events.
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      <PeterAvatarWidget />
    </div>
  );
}
