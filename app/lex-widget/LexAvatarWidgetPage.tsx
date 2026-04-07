"use client";

/**
 * Thin client wrapper that renders LexAvatarWidget as a full iframe page.
 * Receives clientId from the server page component via props.
 */

import LexAvatarWidget from "../components/LexAvatarWidget";

export default function LexAvatarWidgetPage({ clientId }: { clientId: string }) {
  return <LexAvatarWidget clientId={clientId} />;
}
