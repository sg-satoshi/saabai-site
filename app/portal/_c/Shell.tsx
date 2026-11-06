import Link from "next/link";
import SignOut from "./SignOut";

export type NavKey = "home" | "factfind" | "review";

export default function Shell({ id, active, orderRef, planName, name, children }: {
  id: string; active: NavKey; orderRef: string; planName: string; name: string; children: React.ReactNode;
}) {
  const initial = (name.trim()[0] || "S").toUpperCase();
  const item = (key: NavKey, href: string, label: string) => (
    <Link href={href} aria-current={active === key ? "page" : undefined}>{label}</Link>
  );
  return (
    <>
      <header className="bp-top">
        <div className="bp-top-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/saabai-lockup-dark.png" alt="Saabai.ai" width={145} height={46} decoding="async" />
          <div className="bp-top-r">
            <span className="mono ref">{orderRef} · {planName} Blueprint</span>
            <SignOut />
            <span className="bp-avatar" aria-hidden="true">{initial}</span>
          </div>
        </div>
      </header>
      <div className="bp-wrap">
        <aside>
          <nav className="bp-nav" aria-label="Portal">
            {item("home", `/portal/${id}`, "Home")}
            {item("factfind", `/portal/${id}/factfind`, "Fact-find")}
            {item("review", `/portal/${id}/review`, "Review and submit")}
          </nav>
          <div className="bp-help"><b>Stuck?</b><br />Reply to any Saabai email and a person answers.</div>
        </aside>
        <main id="main">{children}</main>
      </div>
    </>
  );
}
