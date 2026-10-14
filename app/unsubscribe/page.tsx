import UnsubscribeForm from "./UnsubscribeForm";
import "../components/growth/public.css";

export const metadata = { title: "Unsubscribe | Saabai", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e = "", t = "" } = await searchParams;
  return (
    <main className="gp">
      <div className="gp-card">
        <div className="gp-eyebrow">Saabai</div>
        <h1>Unsubscribe from marketing</h1>
        <p>{e ? <>We&apos;ll stop marketing emails and SMS to <b>{e}</b>. You&apos;ll still get receipts and service messages about anything you&apos;ve bought.</> : "This link is missing details. Reply to any email from us and we'll sort it."}</p>
        {e && t && <UnsubscribeForm e={e} t={t} />}
      </div>
    </main>
  );
}
