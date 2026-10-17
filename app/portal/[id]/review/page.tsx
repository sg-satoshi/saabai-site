import { redirect } from "next/navigation";
import Shell from "../../_c/Shell";
import { loadPortalPage } from "../../_c/load";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { snap, ref, plan } = await loadPortalPage(id);
  if (snap.locked) redirect(`/portal/${id}/submitted`);
  return (
    <Shell id={id} active="review" orderRef={ref} planName={plan} name={(snap.contactName || "").split(/\s+/)[0]}>
      <ReviewClient snap={snap} />
    </Shell>
  );
}
