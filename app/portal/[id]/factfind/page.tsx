import { redirect } from "next/navigation";
import Shell from "../../_c/Shell";
import { loadPortalPage } from "../../_c/load";
import FactFindPortal from "./FactFindPortal";

export default async function FactFindPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s } = await searchParams;
  const { snap, ref, plan } = await loadPortalPage(id);
  if (snap.locked) redirect(`/portal/${id}/submitted`);
  const start = snap.sections.some((x) => x.id === s) ? s! : snap.progress.firstUnfinishedSectionId ?? snap.sections[0].id;
  return (
    <Shell id={id} active="factfind" orderRef={ref} planName={plan} name={(snap.contactName || "").split(/\s+/)[0]}>
      <FactFindPortal initial={snap} startSection={start} />
    </Shell>
  );
}
