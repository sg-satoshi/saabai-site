import Image from "next/image";

const footerLinks = [
  { label: "Services", href: "/services" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Process", href: "/process" },
  { label: "FAQ", href: "/faq" },
  { label: "About", href: "/about" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shanegoldberg-ai" },
];

const serviceAreaLinks = [
  { label: "Brisbane", href: "/brisbane" },
  { label: "Gold Coast", href: "/gold-coast" },
  { label: "Sydney", href: "/sydney" },
  { label: "Melbourne", href: "/melbourne" },
  { label: "Perth", href: "/perth" },
  { label: "Adelaide", href: "/adelaide" },
  { label: "Canberra", href: "/canberra" },
  { label: "Darwin", href: "/darwin" },
  { label: "Hobart", href: "/hobart" },
];

export default function Footer() {
  return (
    <footer className="border-t border-saabai-border py-10 px-8 pr-24">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 flex-wrap">
          <a href="/" className="shrink-0">
            <Image
              src="/brand/saabai-logo-full.png"
              alt="Saabai.ai"
              width={120}
              height={40}
              style={{ height: 32, width: "auto" }}
            />
          </a>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {footerLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs text-saabai-text-dim hover:text-saabai-text transition-colors tracking-wide"
              >
                {label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-saabai-text-dim tracking-wide shrink-0">
            © {new Date().getFullYear()} Saabai.ai. All rights reserved.
          </p>
        </div>

        <div className="border-t border-saabai-border pt-6">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-3 text-center sm:text-left">
            Service Areas
          </p>
          <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2">
            {serviceAreaLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
