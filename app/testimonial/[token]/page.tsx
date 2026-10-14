import { findTestimonialByToken } from "@/lib/growth/growth2";
import TestimonialForm from "./TestimonialForm";
import "../../components/growth/public.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Blueprint feedback | Saabai", robots: { index: false, follow: false } };

export default async function TestimonialPage({ params }: { params: Promise<{ token: string }> }) {
  const t = await findTestimonialByToken((await params).token).catch(() => null);
  const done = t && ["received", "approved", "published"].includes(t.status);
  return (
    <main className="gp">
      <div className="gp-card">
        <div className="gp-eyebrow">Saabai Blueprint</div>
        {!t && <><h1>This link has expired</h1><p>Reply to Shane&apos;s email and he&apos;ll send a fresh one.</p></>}
        {done && <><h1>Thanks, we got it</h1><p>Your feedback is in. It genuinely helps.</p></>}
        {t && !done && (
          <>
            <h1>How did the Blueprint land{t.name ? `, ${t.name.split(" ")[0]}` : ""}?</h1>
            <p>One rating and a sentence or two. You choose whether we can share it.</p>
            <TestimonialForm token={(await params).token} />
          </>
        )}
      </div>
    </main>
  );
}
