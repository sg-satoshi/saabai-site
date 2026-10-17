import { Inter } from "next/font/google";
import "./sb-footer.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

const OFFERS = [
  { label: "Web Solutions", href: "/websites" },
  { label: "Saabai Blueprint", href: "/blueprint" },
  { label: "Free AI score", href: "/score" },
];

const COMPANY = [
  { label: "Work", href: "/case-studies" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const PRODUCTS = [
  { label: "Lex", href: "/lex" },
  { label: "Rex", href: "/case-studies" },
];

function Column({
  id,
  title,
  links,
  className,
}: {
  id: string;
  title: string;
  links: { label: string; href: string }[];
  className?: string;
}) {
  return (
    <nav className={className ? `col ${className}` : "col"} aria-labelledby={id}>
      <h4 id={id}>{title}</h4>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SbFooter() {
  return (
    <footer className={`sb-footer ${inter.className}`} aria-label="Site footer">
      <div className="wrap">
        <div className="cols">
          <div className="brand">
            <a href="/" aria-label="Saabai home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/saabai-logo.png" alt="Saabai.ai" width={132} height={36} />
            </a>
            <p>Websites and AI systems that run your business for you. Built in Australia.</p>
          </div>
          <div className="stack">
            <Column id="f-offers" title="Offers" links={OFFERS} />
            <Column id="f-products" title="Products" links={PRODUCTS} className="m-products" />
          </div>
          <Column id="f-company" title="Company" links={COMPANY} className="m-company" />
        </div>
        <div className="areas">
          <h4>Service areas</h4>
          <p>Gold Coast, Brisbane and Queensland, with clients Australia-wide online</p>
          <nav aria-label="Service areas">
            <a className="pill" href="/gold-coast">Gold Coast</a>
            <a className="pill" href="/brisbane">Brisbane</a>
          </nav>
        </div>
        <div className="legal">
          <span>© 2026 Saabai. ABN 71 889 082 572. Merrimac QLD 4226. Prices in AUD. GST not applicable.</span>
        </div>
      </div>
    </footer>
  );
}
