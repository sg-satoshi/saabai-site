import UnsubNow from "./UnsubNow";
import "../../components/growth/public.css";

export const metadata = { title: "Unsubscribe | SUNDER", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  return (
    <main className="gp">
      <div className="gp-card">
        <div className="gp-eyebrow">SUNDER</div>
        <h1>Unsubscribe</h1>
        {t ? <UnsubNow token={t} /> : <p>This link is missing details. Use the unsubscribe link in the email.</p>}
      </div>
    </main>
  );
}
