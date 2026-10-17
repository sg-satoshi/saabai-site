import { redirect } from "next/navigation";
import FactFindClient from "./FactFindClient";
import { getEngagementByToken } from "../../../../lib/audit-store";
import { portalAllowed } from "../../../../lib/portal-blueprint/flag";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saabai Blueprint Questionnaire",
  robots: { index: false, follow: false },
};

export default async function FactFindPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Portal flag on for this buyer: the old emailed link now leads into the portal sign-in.
  const eng = await getEngagementByToken(token);
  if (eng && portalAllowed(eng.contactEmail)) redirect("/portal/login?from=legacy");
  return <FactFindClient token={token} />;
}
