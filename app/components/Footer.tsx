import Image from "next/image";

const footerLinks = [
  { label: "Services", href: "/services" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Process", href: "/process" },
  { label: "FAQ", href: "/faq" },
  { label: "About", href: "/about" },
];

export default function Footer() {
  return (
    <footer className="border-t border-saabai-border py-10 px-8 pr-24">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 flex-wrap">
        <a href="/" className="shrink-0">
          <Image
            src="/brand/saabai-logo.png"
            alt="Saabai.ai"
            width={100}
            height={28}
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
    </footer>
  );
}
