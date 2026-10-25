import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { creditPreviewEnabled, isCreditPreviewState, type CreditPreviewState } from "../../../lib/blueprint-credit";
import { CreditPreview } from "./CreditPreview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blueprint credit preview",
  robots: { index: false, follow: false },
};

/**
 * Static demo of the credit rail. Served on local dev and Vercel preview only.
 * It does not read or write client data, and it has no lead form.
 */
export default async function CreditPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; chrome?: string }>;
}) {
  if (!creditPreviewEnabled()) notFound();
  const query = await searchParams;
  if (query.state === "expired") {
    redirect(`/client-portal/credit-preview?state=hidden${query.chrome === "0" ? "&chrome=0" : ""}`);
  }
  const state: CreditPreviewState = isCreditPreviewState(query.state) ? query.state : "fresh";
  return <CreditPreview state={state} chrome={query.chrome !== "0"} />;
}
