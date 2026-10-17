import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { portalEnabled } from "../../lib/portal-blueprint/flag";
import "./portal.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Saabai Blueprint portal",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  if (!portalEnabled()) notFound();
  return <div className="bp">{children}</div>;
}
