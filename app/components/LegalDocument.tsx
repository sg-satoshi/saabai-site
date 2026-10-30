import Nav from "./Nav";
import SbFooter from "./sb/SbFooter";
import { NAP } from "@/lib/seo-entity";
import "./sb/sb.css";

export type LegalSection = { heading: string; body: string; id?: string };

/**
 * Shared layout for saabai.ai legal pages. Clause blocks stay inside
 * .card.legal so they do not inherit the 96px page-band padding on .sb section.
 */
export default function LegalDocument({
  title,
  lede,
  sections,
  links = [],
}: {
  title: string;
  lede: string;
  sections: LegalSection[];
  links?: { href: string; label: string }[];
}) {
  return (
    <div className="sb">
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 760, paddingTop: 72, paddingBottom: 96 }}>
          <span className="eyebrow">Saabai</span>
          <h1 style={{ marginTop: 16 }}>{title}</h1>
          <p className="dim" style={{ marginTop: 14, fontSize: 15 }}>{lede}</p>

          <div className="card legal" style={{ marginTop: 32, display: "grid", gap: 28 }}>
            {sections.map((s) => (
              <section key={s.heading} id={s.id} style={{ minWidth: 0, padding: 0 }}>
                <h3>{s.heading}</h3>
                <p style={{ marginTop: 8, overflowWrap: "break-word" }}>{s.body}</p>
              </section>
            ))}
          </div>

          <p className="dim" style={{ marginTop: 28, fontSize: 14 }}>
            {NAP.name}, ABN {NAP.abn}, {NAP.addressLine}. {NAP.email}
            {links.length > 0 ? (
              <>
                .{" "}
                {links.map((link, i) => (
                  <span key={link.href}>
                    {i > 0 ? " · " : null}
                    <a href={link.href} style={{ color: "var(--teal)", textDecoration: "underline" }}>{link.label}</a>
                  </span>
                ))}
              </>
            ) : null}
          </p>
        </div>
      </div>
      <SbFooter />
    </div>
  );
}
