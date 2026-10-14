const serviceAreaLinks = [
  { label: "Gold Coast", href: "/gold-coast" },
  { label: "Brisbane", href: "/brisbane" },
  { label: "Sydney", href: "/sydney" },
  { label: "Melbourne", href: "/melbourne" },
  { label: "Perth", href: "/perth" },
  { label: "Adelaide", href: "/adelaide" },
  { label: "Canberra", href: "/canberra" },
  { label: "Hobart", href: "/hobart" },
  { label: "Darwin", href: "/darwin" },
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
            <a href="mailto:hello@saabai.ai">Contact</a>
            <a href="/faq">FAQ</a>
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
          <span>© 2026 Saabai. All prices in AUD and include GST.</span>
          <a href="mailto:hello@saabai.ai">hello@saabai.ai</a>
        </div>
      </div>
    </footer>
  );
}
