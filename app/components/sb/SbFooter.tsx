import localFont from "next/font/local";
import { NAP } from "@/lib/seo-entity";
import "./sb-footer.css";

const inter = localFont({ src: "../../fonts/inter-latin-wght-normal.woff2", weight: "100 900" });

const OFFERS = [
  { label: "Web Solutions", href: "/websites" },
  { label: "Saabai Blueprint", href: "/blueprint" },
  { label: "Free AI score", href: "/score" },
  { label: "Pricing", href: "/pricing" },
];

const COMPANY = [
  { label: "Work", href: "/case-studies" },
  { label: "Use cases", href: "/use-cases" },
  { label: "Process", href: "/process" },
  { label: "Calculator", href: "/calculator" },
  { label: "Insights", href: "/insights" },
  { label: "AI News", href: "/ai-news" },
  { label: "Compare", href: "/compare" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const PRODUCTS = [
  { label: "Lex", href: "/legal" },
  { label: "Law firms", href: "/ai-chatbot-law-firms" },
  { label: "AI receptionist", href: "/ai-receptionist-gold-coast" },
  { label: "Custom AI agents", href: "/custom-ai-agents" },
  { label: "SEO and AI search", href: "/seo-ai-search" },
  { label: "Rex", href: "/case-studies/national-plastics-supplier" },
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
              <img src="/brand/saabai-logo.png" alt={NAP.name} width={132} height={36} />
            </a>
            <p>Websites and AI systems that run your business for you. Built in Australia.</p>
            <p>
              <a href={`mailto:${NAP.email}`}>{NAP.email}</a>
            </p>
            <p>{NAP.addressLine}</p>
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
            <a className="pill" href="/ai-chatbot-developer-queensland">Queensland chatbots</a>
          </nav>
        </div>
        <div className="legal">
          <span>
            © 2026 {NAP.name}. ABN {NAP.abn}. {NAP.addressLine}.{" "}
            <a href={`mailto:${NAP.email}`}>{NAP.email}</a>. Prices in AUD. GST not applicable.
          </span>
        </div>
      </div>
    </footer>
  );
}
