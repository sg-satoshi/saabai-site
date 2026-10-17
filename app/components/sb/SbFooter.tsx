const serviceAreaLinks = [
  { label: "Gold Coast", href: "/gold-coast" },
];

export default function SbFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <img src="/brand/saabai-logo.png" alt="Saabai" style={{ height: 36, width: "auto" }} />
            <p className="dim" style={{ marginTop: 12, maxWidth: 300, fontSize: 14 }}>
              Websites and AI systems that run your business for you. Built in Australia.
            </p>
          </div>
          <div>
            <h4>Offers</h4>
            <a href="/websites">Web Solutions</a>
            <a href="/blueprint">Saabai Blueprint</a>
            <a href="/score">Free AI score</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="/case-studies">Work</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/faq">FAQ</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
          <div>
            <h4>Products</h4>
            <a href="/lex">Lex</a>
            <a href="/case-studies">Rex</a>
          </div>
        </div>
        <div className="areas">
          <h4>Service areas</h4>
          <nav>
            {serviceAreaLinks.map(({ label, href }) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="legal">
          <span>© 2026 Saabai. ABN 71 889 082 572. Merrimac QLD 4226. Prices in AUD. GST not applicable.</span>
          <a href="mailto:hello@saabai.ai">hello@saabai.ai</a>
        </div>
      </div>
    </footer>
  );
}
