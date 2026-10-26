/**
 * Lifestyle Money Management legal particulars.
 * Leave a field null until Nick supplies it. Null and blank values are omitted
 * from the public pages. Do not invent an entity name, ABN, ACL, credit
 * representative number, licensee or aggregator, or AFCA member number.
 */
export type LmmLegalIdentity = {
  entityName: string | null;
  abn: string | null;
  aclOrCreditRep: string | null;
  licenseeOrAggregator: string | null;
  afcaMemberNo: string | null;
};

export const LMM_LEGAL_IDENTITY: LmmLegalIdentity = {
  entityName: null, // TODO: legal entity name
  abn: null, // TODO: ABN
  aclOrCreditRep: null, // TODO: Australian Credit Licence or credit representative number
  licenseeOrAggregator: null, // TODO: licensee or aggregator name
  afcaMemberNo: null, // TODO: AFCA member number
};

export const LMM_SITE = {
  name: "Lifestyle Money Management",
  host: "lifestylemoneymanagement.com.au",
  url: "https://www.lifestylemoneymanagement.com.au",
  email: "nick@lifestylemoneymanagement.com.au",
  phoneDisplay: "1300 799 119",
  phoneTel: "1300799119",
  homePath: "/sites/lmm-site",
  privacyPath: "/sites/lmm-site/privacy",
  complaintsPath: "/sites/lmm-site/complaints",
} as const;

/** Confirmed from https://www.afca.org.au/about-afca/contact-us on 26 October 2026. */
export const LMM_AFCA = {
  name: "Australian Financial Complaints Authority",
  short: "AFCA",
  website: "https://www.afca.org.au",
  websiteDisplay: "www.afca.org.au",
  email: "info@afca.org.au",
  phoneDisplay: "1800 931 678",
  phoneTel: "1800931678",
  post: "GPO Box 3, Melbourne VIC 3001",
} as const;

/** Confirmed from https://www.oaic.gov.au/contact-us on 26 October 2026. The public contact page uses an online form, not a general inbox. */
export const LMM_OAIC = {
  name: "Office of the Australian Information Commissioner",
  short: "OAIC",
  website: "https://www.oaic.gov.au",
  websiteDisplay: "www.oaic.gov.au",
  contactUrl: "https://www.oaic.gov.au/contact-us",
  phoneDisplay: "1300 363 992",
  phoneTel: "1300363992",
  phoneHours: "Monday to Thursday, 10 am to 4 pm (AEST/AEDT)",
  post: "GPO Box 5288, Sydney NSW 2001",
} as const;

export const LMM_LEGAL_UPDATED = "26 October 2026";

const HOME_MARKER = "<!-- LMM-LEGAL-FOOTER -->";

function text(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Public name. An unset entity stays the trading name, Lifestyle Money Management. */
export function lmmPublicName(id: LmmLegalIdentity = LMM_LEGAL_IDENTITY): string {
  return text(id.entityName) ?? LMM_SITE.name;
}

/** Only the particulars that have been filled in. Empty when every field is unset. */
export function lmmLicensingLine(id: LmmLegalIdentity = LMM_LEGAL_IDENTITY): string {
  const parts: string[] = [];
  const entity = text(id.entityName);
  const abn = text(id.abn);
  const brand = LMM_SITE.name;
  if (entity && entity !== brand) {
    parts.push(abn ? `${brand} is the trading name of ${entity} (ABN ${abn}).` : `${brand} is the trading name of ${entity}.`);
  } else if (abn) {
    parts.push(`${brand} (ABN ${abn}).`);
  }
  const acl = text(id.aclOrCreditRep);
  const licensee = text(id.licenseeOrAggregator);
  if (acl && licensee) parts.push(`Credit assistance is provided under ${acl}, authorised through ${licensee}.`);
  else if (acl) parts.push(`Credit assistance is provided under ${acl}.`);
  else if (licensee) parts.push(`Credit assistance is authorised through ${licensee}.`);
  const member = text(id.afcaMemberNo);
  if (member) parts.push(`AFCA member number: ${member}.`);
  return parts.join(" ");
}

function licensingHtml(): string {
  const line = lmmLicensingLine();
  return line ? `<p>${esc(line)}</p>` : "";
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function link(href: string, label: string, domainPath?: string): string {
  const path = domainPath ? ` data-lmm-path="${esc(domainPath)}"` : "";
  return `<a href="${esc(href)}"${path}>${esc(label)}</a>`;
}

function homeLogo(): string {
  return `<a href="${esc(LMM_SITE.homePath)}" data-lmm-path="/" aria-label="${esc(LMM_SITE.name)} home"><img src="/clients/lmm-site/assets/lmm-logo-reversed-dark.svg" alt="${esc(LMM_SITE.name)}" width="420" height="276"></a>`;
}

function external(href: string, label: string): string {
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}

function mail(address: string): string {
  return `<a href="mailto:${esc(address)}">${esc(address)}</a>`;
}

function tel(phoneTel: string, label: string): string {
  return `<a href="tel:${esc(phoneTel)}">${esc(label)}</a>`;
}

export function lmmHomeLegalBlock(): string {
  const line = lmmLicensingLine();
  const licence = line ? `\n      <p>${esc(line)}</p>` : "";
  return `<div class="container footer-legal" data-lmm-legal="1">${licence}
      <nav aria-label="Legal">
        ${link(LMM_SITE.privacyPath, "Privacy Policy", "/privacy")}
        ${link(LMM_SITE.complaintsPath, "Complaints", "/complaints")}
      </nav>
    </div>`;
}

const PATH_SCRIPT = `<script id="lmm-legal-paths">
(function () {
  var host = location.hostname.toLowerCase().replace(/^www\\./, "");
  if (host !== ${JSON.stringify(LMM_SITE.host)}) return;
  document.querySelectorAll("[data-lmm-path]").forEach(function (el) {
    var path = el.getAttribute("data-lmm-path");
    if (path) el.setAttribute("href", path);
  });
})();
</script>`;

const FOOTER_CSS = `<style data-lmm-legal-css>
.footer-legal { margin-top: 22px; display: grid; gap: 12px; }
.footer-legal p { margin: 0; max-width: 78ch; font-size: 0.86rem; line-height: 1.55; color: #c8d0da; }
.footer-legal nav { display: flex; flex-wrap: wrap; gap: 8px 18px; }
.footer-legal a { color: #E5C690; text-decoration: underline; text-underline-offset: 3px; }
.footer-legal a:hover { color: #fff; }
</style>`;

/** Insert the licensing line and legal links. Also drop any leftover draft testimonials. */
export function prepareLmmHomeHtml(html: string): string {
  let out = html.replace(/<!-- Testimonials hidden for now:[\s\S]*?-->\s*/g, "");
  out = out.replace(/<section id="testimonials"[\s\S]*?<\/section>\s*/g, "");
  if (!out.includes('data-lmm-legal="1"')) {
    const block = lmmHomeLegalBlock();
    if (out.includes(HOME_MARKER)) out = out.replace(HOME_MARKER, block);
    else if (out.includes('<div class="container footer-bottom">')) {
      out = out.replace('<div class="container footer-bottom">', `${block}\n    <div class="container footer-bottom">`);
    }
  }
  if (!out.includes("data-lmm-legal-css") && !out.includes(".footer-legal {")) {
    out = out.includes("</head>") ? out.replace("</head>", `${FOOTER_CSS}</head>`) : `${FOOTER_CSS}${out}`;
  }
  if (!out.includes('id="lmm-legal-paths"') && out.includes("</body>")) {
    out = out.replace("</body>", `${PATH_SCRIPT}\n</body>`);
  }
  return out;
}

function contactLines(): string {
  return `<ul>
<li>Email ${mail(LMM_SITE.email)}</li>
<li>Phone ${tel(LMM_SITE.phoneTel, LMM_SITE.phoneDisplay)}</li>
</ul>`;
}

function oaicBlock(): string {
  return `<p>Office of the Australian Information Commissioner (OAIC)</p>
<ul>
<li>Website: ${external(LMM_OAIC.website, LMM_OAIC.websiteDisplay)}</li>
<li>Privacy complaints and enquiries: ${external(LMM_OAIC.contactUrl, "OAIC contact form")}</li>
<li>Phone: ${tel(LMM_OAIC.phoneTel, LMM_OAIC.phoneDisplay)} (${esc(LMM_OAIC.phoneHours)})</li>
<li>Post: ${esc(LMM_OAIC.post)}</li>
</ul>`;
}

function afcaBlock(): string {
  const member = text(LMM_LEGAL_IDENTITY.afcaMemberNo);
  const memberLine = member ? `<p>Our AFCA member number is ${esc(member)}.</p>` : "";
  return `<p>${esc(LMM_AFCA.name)} (AFCA)</p>
<ul>
<li>Website: ${external(LMM_AFCA.website, LMM_AFCA.websiteDisplay)}</li>
<li>Email: ${mail(LMM_AFCA.email)}</li>
<li>Phone: ${tel(LMM_AFCA.phoneTel, LMM_AFCA.phoneDisplay)} (free call from an Australian landline)</li>
<li>Post: Australian Financial Complaints Authority, ${esc(LMM_AFCA.post)}</li>
</ul>
<p>AFCA's service is free for consumers. Time limits apply.</p>${memberLine}`;
}

function licenseeShareItem(): string {
  const name = text(LMM_LEGAL_IDENTITY.licenseeOrAggregator);
  if (name) return `<li>our licensee or aggregator, ${esc(name)}</li>`;
  return `<li>our licensee or aggregator, where they are involved in arranging the credit</li>`;
}

function privacyBody(): string {
  const home = link(LMM_SITE.homePath, lmmPublicName(), "/");
  const complaints = link(LMM_SITE.complaintsPath, "Complaints", "/complaints");
  return `
<p class="lede">Last updated: ${esc(LMM_LEGAL_UPDATED)}</p>
<p>This policy explains how ${home} handles personal information and credit-related information. It is written in plain English. It is not legal advice.</p>
<h2>Who this policy covers</h2>
<p>${esc(lmmPublicName())} provides finance and credit assistance, including mortgage broking. Nick Foale is the Managing Director. He is a licensed finance broker based in Adelaide, with close to 30 years in finance.</p>
${licensingHtml()}
<p>This policy covers information collected through ${external(LMM_SITE.url, LMM_SITE.host)}, by phone, by email, and when you ask us to help with a finance or credit application.</p>
<h2>The laws that apply</h2>
<p>We handle personal information under the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).</p>
<p>When we help you apply for credit, we may collect, use and disclose credit information and credit eligibility information. That part of our work is covered by Part IIIA of the Privacy Act and the registered Credit Reporting Privacy Code (the CR code), as those rules apply to a finance broker who collects credit-related information and passes it on to arrange credit. We are not a credit reporting body, and we do not sell personal information or credit information.</p>
<h2>Personal information we collect</h2>
<p>What we collect depends on what you ask us to do.</p>
<p>From the website enquiry form we collect:</p>
<ul>
<li>your name</li>
<li>your email address</li>
<li>your phone number, if you give one</li>
<li>the investment stage you select</li>
<li>what you say you are trying to achieve</li>
</ul>
<p>We email that enquiry to Nick so he can reply. Please do not put bank details, tax file numbers, identity document numbers or passwords in the form.</p>
<p>From the Zara chatbot we collect the messages you type, and the technical details needed to run the chat. The chat transcript is also stored in your browser until you clear it. Your light or dark theme choice is stored in your browser as well. Zara gives general information only. Do not type bank details, tax file numbers, identity documents or passwords into the chat.</p>
<p>If you call, email or meet with us, we keep what you tell us and what we need to answer you.</p>
<p>If you ask us to go ahead with a finance or credit application, we may also collect your date of birth, address, residency, employment, income, expenses, assets, liabilities, the credit you want, and copies of documents a lender asks for. We will not ask for those documents through the public website form or the chatbot.</p>
<p>Our website host may record technical logs, such as an IP address, browser type and the pages requested, to keep the site secure and working. We do not use that log to build a marketing profile.</p>
<h2>Credit information</h2>
<p>If you ask us to help with a credit application, we may collect credit information and credit eligibility information about you. That can include:</p>
<ul>
<li>the type of credit and the amount you want</li>
<li>credit accounts, limits and repayment history that a credit report contains</li>
<li>defaults, serious credit infringements, court proceedings and bankruptcy information that a credit report contains</li>
<li>information about other applications for credit</li>
</ul>
<p>A lender, or we, may obtain a credit report from a credit reporting body (such as Equifax, illion or Experian) where you have asked us to help with an application and Part IIIA allows that check. We use the report to help arrange the credit you asked for. We do not use it for unrelated marketing.</p>
<p>You can ask a credit reporting body for its own policy on how it handles credit reporting information, and you can ask it to correct information it holds.</p>
<h2>Why we collect it</h2>
<p>We collect, hold, use and disclose personal information and, where it applies, credit information so that we can:</p>
<ul>
<li>answer your enquiry and arrange a strategy call with Nick</li>
<li>understand your situation well enough to see whether we can help</li>
<li>provide credit assistance and prepare or lodge an application you have asked us to make</li>
<li>check that a credit product may be suitable, as the credit laws require</li>
<li>deal with lenders, an aggregator and other people you authorise</li>
<li>meet record-keeping, licensing, identity and responsible-lending duties</li>
<li>handle a complaint and respond to a regulator, AFCA or a court if we must</li>
<li>run, secure and improve this website</li>
</ul>
<p>If we want to use information for a new purpose, we will rely on a purpose you would reasonably expect, your consent, or another permission in the Privacy Act or Part IIIA. You can ask us not to send you marketing. Asking us not to send marketing does not stop us contacting you about an application or a complaint.</p>
<h2>Who we share it with</h2>
<p>We share personal information, and credit information where the law allows, only as needed for the purposes above. Recipients can include:</p>
<ul>
<li>lenders and other credit providers you ask us to approach</li>
${licenseeShareItem()}
<li>credit reporting bodies, when a credit check is part of an application you have asked us to help with</li>
<li>people you authorise, such as an accountant, solicitor, conveyancer or referrer</li>
<li>service providers who help us operate, including email delivery, website hosting, the chatbot platform, information technology support, and professional advisers</li>
<li>AFCA, ASIC, the OAIC, a court or another authority, if the law requires it or we need to in order to deal with a complaint</li>
</ul>
<p>The website enquiry is emailed to Nick at ${mail(LMM_SITE.email)}. Chat messages are processed by our chatbot platform so Zara can reply.</p>
<p>We do not sell your information. We do not give a credit reporting body information about you unless Part IIIA allows it.</p>
<h2>Overseas disclosure</h2>
<p>Some of our service providers store or process information outside Australia. Website hosting and the chatbot service may do this in the United States or another country. Where Australian Privacy Principle 8 applies, we take reasonable steps so the overseas recipient handles the information in line with the APPs. If we cannot do that, we will only disclose the information where the Privacy Act allows it, which may include telling you the country and getting your consent before we send it.</p>
<p>Chat replies are generated by an AI provider, which may process the messages in the United States. Saabai stores a copy of the conversation in Japan (Tokyo) and deletes it after 90 days, unless it is linked to an enquiry that is still being handled. The first chat message says that Zara is an AI assistant.</p>
<p>Credit information is disclosed overseas only where Part IIIA and the CR code allow it.</p>
<h2>How we keep it secure</h2>
<p>We take reasonable steps to protect personal information and credit information from misuse, interference, loss, and unauthorised access, change or disclosure. Those steps include limiting access to people who need it for their work, and using service providers who provide their own security controls.</p>
<p>Email and a public website are not a safe way to send identity documents, tax file numbers or bank details. No method of sending information over the internet is completely secure.</p>
<p>When we no longer need information for a purpose the law allows, and we are not required to keep it, we take reasonable steps to destroy it or to de-identify it.</p>
<h2>Access and correction</h2>
<p>You can ask us for access to the personal information we hold about you, and you can ask us to correct it if it is inaccurate, out of date, incomplete, irrelevant or misleading. The same idea applies to credit information we hold, alongside the specific correction rights in Part IIIA and the CR code.</p>
<p>Contact Nick using the details below. We may need to confirm you are the person the information is about before we release it. We aim to respond within 30 days. If we refuse access or a correction, we will tell you why, unless the law says we cannot, and we will tell you how to complain.</p>
<p>If a credit reporting body holds a report about you, you can also ask that body for access or a correction. We can help you identify which body was used when we were the ones who obtained the report.</p>
<h2>How to complain</h2>
<p>If you are unhappy with how we have handled your personal information or credit information, contact us first. We will follow the steps on our ${complaints} page. We will acknowledge your complaint within 1 business day and give you a final response within 30 calendar days.</p>
<p>If you are not satisfied with our response, or if we do not respond in time, you can complain to the OAIC. You can also go to AFCA about a complaint that is about our credit assistance. AFCA's details are on the Complaints page.</p>
<h2>Contact the OAIC</h2>
${oaicBlock()}
<h2>Contact us about privacy</h2>
${contactLines()}
<p>Please ask for Nick Foale, Managing Director, and say that your enquiry is about privacy.</p>`;
}

function complaintsBody(): string {
  const complaintsIntro = link(LMM_SITE.privacyPath, "Privacy Policy", "/privacy");
  return `
<p class="lede">Last updated: ${esc(LMM_LEGAL_UPDATED)}</p>
<p>This page is our internal dispute resolution process for complaints about Lifestyle Money Management, including credit assistance. It follows ASIC Regulatory Guide 271. Making a complaint is free.</p>
<h2>Talk to us first</h2>
<p>Contact Nick Foale, Managing Director.</p>
${contactLines()}
<p>You can complain by email or by phone. You do not have to fill in a special form. Tell us what happened, when it happened, what you would like us to do, and the best way to reach you. If you have a reference number or papers that help explain it, include those.</p>
<h2>What we will do</h2>
<ul>
<li>We will acknowledge your complaint within 1 business day of receiving it.</li>
<li>We will look at what happened, keep a record, and tell you if we need something more from you.</li>
<li>We will give you a final response within 30 calendar days of receiving the complaint. Where we can resolve it sooner, we will.</li>
</ul>
<p>The final response will be in writing. It will state the outcome, the reasons for that outcome, and that you can go to the Australian Financial Complaints Authority (AFCA) if you are not satisfied. You can also go to AFCA if we do not give you a final response within 30 calendar days.</p>
<p>If we need more than 30 calendar days, we will tell you why before that time is up, and we will tell you that you can go to AFCA.</p>
<h2>Australian Financial Complaints Authority</h2>
<p>If your complaint is not resolved, you can take it to AFCA. AFCA is an independent external dispute resolution scheme.</p>
${afcaBlock()}
<p>If an issue has not been resolved to your satisfaction, you can lodge a complaint with AFCA. AFCA provides fair and independent financial services complaint resolution that is free to consumers.</p>
<h2>Privacy complaints</h2>
<p>If your complaint is about privacy or about credit reporting information, contact us first using the details above. Our ${complaintsIntro} explains what we collect and who we share it with.</p>
<p>If you are not satisfied with our response, you can complain to the OAIC.</p>
${oaicBlock()}
<h2>Who provides the credit assistance</h2>
<p>${esc(lmmPublicName())} provides the credit assistance.</p>
${licensingHtml()}`;
}

function documentHtml(opts: { title: string; description: string; path: string; body: string }): string {
  const canonical = `${LMM_SITE.url}${opts.path}`;
  return `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(opts.title)} | ${esc(LMM_SITE.name)}</title>
  <meta name="description" content="${esc(opts.description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="icon" href="/clients/lmm-site/assets/lmm-icon-full-colour-light.svg" type="image/svg+xml">
  <meta name="theme-color" content="#101F34">
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f6f3ec; color: #101F34; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    a { color: #0b5d55; }
    .wrap { width: min(100% - 32px, 820px); margin: 0 auto; }
    header { background: #101F34; border-bottom: 3px solid #B48C54; }
    .bar { width: min(100% - 32px, 980px); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; }
    .bar img { height: 56px; width: auto; display: block; }
    .bar nav { display: flex; flex-wrap: wrap; gap: 8px 16px; }
    .bar nav a { color: #E5C690; text-decoration: none; font-size: 0.95rem; }
    .bar nav a:hover { color: #fff; }
    main { padding: 36px 0 64px; }
    h1 { font-size: clamp(1.8rem, 3vw, 2.4rem); line-height: 1.15; margin: 0 0 8px; }
    h2 { font-size: 1.25rem; margin: 28px 0 8px; }
    p, li { font-size: 1.02rem; }
    .lede { color: #5c6b7a; margin-top: 0; }
    ul { padding-left: 1.2rem; }
    footer { background: #101F34; color: #c8d0da; border-top: 3px solid #B48C54; padding: 28px 0 36px; }
    footer p { margin: 0 0 12px; max-width: 78ch; font-size: 0.92rem; }
    footer nav { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 16px; }
    footer nav a, footer .powered-by a { color: #E5C690; }
    .powered-by { font-size: 0.8rem; }
    @media (max-width: 640px) { .bar { align-items: flex-start; flex-direction: column; } .bar img { height: 48px; } }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      ${homeLogo()}
      <nav aria-label="Legal">
        ${link(LMM_SITE.homePath, "Home", "/")}
        ${link(LMM_SITE.privacyPath, "Privacy Policy", "/privacy")}
        ${link(LMM_SITE.complaintsPath, "Complaints", "/complaints")}
      </nav>
    </div>
  </header>
  <main>
    <article class="wrap">
      <h1>${esc(opts.title)}</h1>
      ${opts.body}
    </article>
  </main>
  <footer>
    <div class="wrap">
      ${licensingHtml()}
      <nav aria-label="Legal">
        ${link(LMM_SITE.homePath, "Home", "/")}
        ${link(LMM_SITE.privacyPath, "Privacy Policy", "/privacy")}
        ${link(LMM_SITE.complaintsPath, "Complaints", "/complaints")}
      </nav>
      <div class="powered-by"><a href="https://www.saabai.ai" target="_blank" rel="noopener">Powered by Saabai.ai</a></div>
    </div>
  </footer>
  ${PATH_SCRIPT}
</body>
</html>`;
}

export type LmmLegalPage = "privacy" | "complaints";

export function lmmLegalDocument(page: LmmLegalPage): string {
  if (page === "privacy") {
    return documentHtml({
      title: "Privacy Policy",
      description: "How Lifestyle Money Management collects, uses and shares personal information and credit information, and how to complain.",
      path: "/privacy",
      body: privacyBody(),
    });
  }
  return documentHtml({
    title: "Complaints",
    description: "How to complain to Lifestyle Money Management, our response times, and how to go to AFCA or the OAIC.",
    path: "/complaints",
    body: complaintsBody(),
  });
}
