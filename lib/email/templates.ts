import {
  EMAIL_BRAND,
  escapeHtml,
  renderBrandedEmail,
  type BrandedEmail,
} from "./branded-layout";

function firstName(name?: string | null): string {
  const n = (name || "").trim().split(/\s+/)[0];
  return n || "there";
}

function p(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">${html}</p>`;
}

function muted(html: string): string {
  return `<p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:#5f6580;">${html}</p>`;
}

function codeBox(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;"><tr><td align="center" style="background:#f4f5f9;border:1px solid #dfe2ea;border-radius:12px;padding:18px;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5f6580;font-weight:600;">Your 6-digit code</p>
    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:28px;letter-spacing:8px;font-weight:700;color:#0b092e;">${escapeHtml(code)}</p>
  </td></tr></table>`;
}

/** Portal magic link (+ optional code). */
export function portalMagicLinkEmail(opts: {
  name?: string;
  link: string;
  code?: string | null;
}): BrandedEmail {
  const first = escapeHtml(firstName(opts.name));
  const codeBlock = opts.code
    ? `${muted("Prefer typing? Use this one-time code on the sign-in page.")}${codeBox(opts.code)}`
    : "";
  return renderBrandedEmail({
    subject: "Your Saabai portal sign-in link",
    preheader: "One tap to open your Client Portal. Link expires in 15 minutes.",
    eyebrow: "Client Portal",
    title: "Your sign-in link is ready",
    bodyHtml: [
      p(`Hi ${first},`),
      p("Tap the button below to open your Saabai Client Portal. No password theatre. The link works once and expires in 15 minutes."),
      codeBlock,
      muted("If you did not ask for this, ignore the email. Someone probably mistyped an address."),
    ].join(""),
    cta: { href: opts.link, label: "Open your portal" },
    textBody: [
      `Hi ${firstName(opts.name)},`,
      "",
      "Tap the link below to open your Saabai Client Portal. The link works once and expires in 15 minutes.",
      opts.code ? `Or enter this code: ${opts.code}` : "",
      "",
      "If you did not ask for this, you can ignore the email.",
    ].filter(Boolean),
  });
}

/** Confirmation to the person who requested portal access. */
export function accessRequestConfirmationEmail(opts: {
  name: string;
  autoApproved?: boolean;
}): BrandedEmail {
  const first = escapeHtml(firstName(opts.name));
  if (opts.autoApproved) {
    return renderBrandedEmail({
      subject: "You're in: Saabai Client Portal access",
      preheader: "Your portal access is ready. Sign in with your work email.",
      eyebrow: "Client Portal",
      title: "You're cleared for takeoff",
      bodyHtml: [
        p(`Hi ${first},`),
        p("Good news. Your email matched an order on file, so portal access is already approved. Sign in with your work email. We will send a magic link. No password to babysit."),
        p("Inside you can check your website, care plan, invoices and requests. We keep it calm and useful."),
      ].join(""),
      cta: { href: EMAIL_BRAND.portalUrl, label: "Open your portal" },
      textBody: [
        `Hi ${firstName(opts.name)},`,
        "",
        "Your email matched an order on file, so portal access is approved. Sign in at the Client Portal with your work email for a magic link.",
        "",
        `Portal: ${EMAIL_BRAND.portalUrl}`,
      ],
    });
  }
  return renderBrandedEmail({
    subject: "We got your Saabai portal access request",
    preheader: "Thanks. We usually reply within 1 business day.",
    eyebrow: "Client Portal",
    title: "Request received",
    bodyHtml: [
      p(`Hi ${first},`),
      p("Thanks for requesting Client Portal access. We usually reply within 1 business day. If your email matches an order, we often approve it sooner."),
      p("When you are in, sign in with your work email. Magic link, optional 6-digit code, zero password drama."),
    ].join(""),
    cta: { href: EMAIL_BRAND.portalUrl, label: "Go to sign in" },
    textBody: [
      `Hi ${firstName(opts.name)},`,
      "",
      "Thanks for requesting Client Portal access. We usually reply within 1 business day.",
      "",
      `Sign in: ${EMAIL_BRAND.portalUrl}`,
    ],
  });
}

/** Admin alert for a new portal access request. */
export function accessRequestAdminEmail(opts: {
  name: string;
  email: string;
  company?: string;
  about?: string;
  note?: string;
  autoApproved: boolean;
}): BrandedEmail {
  const details = [
    `<tr><td style="padding:6px 0;color:#5f6580;width:120px;">Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(opts.name)}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#5f6580;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(opts.email)}" style="color:#0e7482;">${escapeHtml(opts.email)}</a></td></tr>`,
    opts.company ? `<tr><td style="padding:6px 0;color:#5f6580;">Company</td><td style="padding:6px 0;">${escapeHtml(opts.company)}</td></tr>` : "",
    opts.about ? `<tr><td style="padding:6px 0;color:#5f6580;">About</td><td style="padding:6px 0;">${escapeHtml(opts.about)}</td></tr>` : "",
    opts.note ? `<tr><td style="padding:6px 0;color:#5f6580;">Note</td><td style="padding:6px 0;">${escapeHtml(opts.note)}</td></tr>` : "",
  ].join("");
  return renderBrandedEmail({
    subject: opts.autoApproved
      ? `Portal auto-approved: ${opts.name.slice(0, 80)}`
      : `Portal access request: ${opts.name.slice(0, 80)}`,
    preheader: opts.autoApproved ? "Auto-approved from a matching order." : "New Client Portal access request.",
    eyebrow: "Admin",
    title: opts.autoApproved ? "Portal auto-approved" : "New access request",
    bodyHtml: [
      p(
        opts.autoApproved
          ? "This email matched an order, so access was approved automatically."
          : "Someone asked for Client Portal access. Review it when you have a minute.",
      ),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">${details}</table>`,
    ].join(""),
    cta: {
      href: "https://www.saabai.ai/saabai-admin/requests",
      label: "Open Client Requests",
    },
    textBody: [
      opts.autoApproved ? "Portal auto-approved." : "New portal access request.",
      `Name: ${opts.name}`,
      `Email: ${opts.email}`,
      opts.company ? `Company: ${opts.company}` : "",
      "https://www.saabai.ai/saabai-admin/requests",
    ].filter(Boolean),
  });
}

/** Customer Blueprint order confirmation. */
export function blueprintOrderCustomerEmail(opts: {
  name?: string;
  tierName: string;
  paidLabel: string;
  delivery: string;
  priceLabel: string;
  factFindUrl?: string | null;
  includesCall?: boolean;
  calendlyUrl?: string;
}): BrandedEmail {
  const first = escapeHtml(firstName(opts.name));
  const call = opts.includesCall && opts.calendlyUrl
    ? p(`Your ${escapeHtml(opts.tierName)} Blueprint includes a walkthrough call. <a href="${escapeHtml(opts.calendlyUrl)}" style="color:#0e7482;font-weight:600;">Pick a time that suits you</a>.`)
    : "";
  return renderBrandedEmail({
    subject: `Your Saabai ${opts.tierName} Blueprint: next steps`,
    preheader: "Order confirmed. Your fact-find is the next move.",
    eyebrow: `${opts.tierName} Blueprint`,
    title: "You're in. Let's build your Blueprint.",
    bodyHtml: [
      p(`Hi ${first},`),
      p(`Thank you for your order (${escapeHtml(opts.paidLabel)}). Your invoice is on its way. Next up: a short fact-find about your team, tools and busiest tasks. About 15 minutes, then we get to work.`),
      call,
      p(`Your Blueprint arrives within ${escapeHtml(opts.delivery)} of the fact-find. Book any Saabai build within 30 days of delivery and the full ${escapeHtml(opts.priceLabel)} is credited. Nice.`),
    ].join(""),
    cta: opts.factFindUrl
      ? { href: opts.factFindUrl, label: "Start my fact-find" }
      : { href: `mailto:${EMAIL_BRAND.supportEmail}`, label: "Email Shane" },
    footnote: opts.factFindUrl
      ? undefined
      : "We usually reply within 1 business day with your private fact-find link.",
    textBody: [
      `Hi ${firstName(opts.name)},`,
      "",
      `Thank you for your ${opts.tierName} Blueprint order (${opts.paidLabel}).`,
      opts.factFindUrl ? `Start your fact-find: ${opts.factFindUrl}` : "We usually reply within 1 business day with your fact-find link.",
      "",
      `Delivery: within ${opts.delivery} of the fact-find. Build credit: full ${opts.priceLabel} within 30 days of delivery.`,
    ],
  });
}

/** Admin Blueprint sale notification. */
export function blueprintOrderAdminEmail(opts: {
  tierName: string;
  paidLabel: string;
  name?: string;
  email?: string;
  phone?: string;
  business: string;
  website?: string;
  abn?: string;
  billingAddress?: string;
  stripeUrl: string;
  sessionId: string;
  engagementId?: string | null;
  factFindUrl?: string | null;
}): BrandedEmail {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#5f6580;width:140px;">${escapeHtml(k)}</td><td style="padding:6px 0;">${v}</td></tr>`;
  return renderBrandedEmail({
    subject: `New ${opts.tierName} Blueprint order: ${opts.name || opts.business}`,
    preheader: `${opts.tierName} · ${opts.paidLabel}`,
    eyebrow: "New Blueprint order",
    title: `${opts.tierName} · ${opts.paidLabel}`,
    bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">
      ${row("Full name", escapeHtml(opts.name || "MISSING"))}
      ${row("Email", opts.email ? `<a href="mailto:${escapeHtml(opts.email)}" style="color:#0e7482;">${escapeHtml(opts.email)}</a>` : "-")}
      ${row("Phone", escapeHtml(opts.phone || "-"))}
      ${row("Business", escapeHtml(opts.business))}
      ${row("Website", escapeHtml(opts.website || "-"))}
      ${row("ABN", escapeHtml(opts.abn || "-"))}
      ${row("Address", escapeHtml(opts.billingAddress || "-"))}
      ${row("Stripe", `<a href="${escapeHtml(opts.stripeUrl)}" style="color:#0e7482;">${escapeHtml(opts.sessionId)}</a>`)}
      ${row("Engagement", escapeHtml(opts.engagementId || "NOT CREATED"))}
      ${row("Fact-find", opts.factFindUrl ? `<a href="${escapeHtml(opts.factFindUrl)}" style="color:#0e7482;">Open</a>` : "-")}
    </table>`,
    cta: { href: "https://www.saabai.ai/saabai-admin/orders", label: "Open orders" },
    textBody: [
      `New ${opts.tierName} Blueprint order (${opts.paidLabel})`,
      `Name: ${opts.name || "-"}`,
      `Email: ${opts.email || "-"}`,
      `Business: ${opts.business}`,
      opts.stripeUrl,
    ],
  });
}

/** Generic admin sale notification. */
export function adminSaleNotificationEmail(opts: {
  productName: string;
  customerName?: string | null;
  customerEmail?: string | null;
  amountLabel?: string | null;
  detailLines?: string[];
  adminUrl?: string;
}): BrandedEmail {
  const lines = (opts.detailLines || [])
    .map((l) => `<li style="margin:0 0 6px;">${escapeHtml(l)}</li>`)
    .join("");
  return renderBrandedEmail({
    subject: `New sale: ${opts.productName}`,
    preheader: opts.amountLabel || "A payment just landed.",
    eyebrow: "Sales",
    title: `New sale: ${opts.productName}`,
    bodyHtml: [
      p("Ka-ching (professionally). A payment came through."),
      p(
        [
          opts.customerName ? `<strong>${escapeHtml(opts.customerName)}</strong>` : "A customer",
          opts.customerEmail
            ? ` (<a href="mailto:${escapeHtml(opts.customerEmail)}" style="color:#0e7482;">${escapeHtml(opts.customerEmail)}</a>)`
            : "",
          opts.amountLabel ? ` · ${escapeHtml(opts.amountLabel)}` : "",
        ].join(""),
      ),
      lines ? `<ul style="margin:0 0 14px;padding-left:18px;color:#13152a;">${lines}</ul>` : "",
    ].join(""),
    cta: {
      href: opts.adminUrl || "https://www.saabai.ai/saabai-admin/orders",
      label: "Open admin",
    },
    textBody: [
      `New sale: ${opts.productName}`,
      opts.customerName ? `Customer: ${opts.customerName}` : "",
      opts.customerEmail ? `Email: ${opts.customerEmail}` : "",
      opts.amountLabel || "",
      ...(opts.detailLines || []),
    ].filter(Boolean),
  });
}

/** Portal invite / welcome for a customer (magic link CTA). */
export function portalWelcomeInviteEmail(opts: {
  name: string;
  business?: string;
  link: string;
}): BrandedEmail {
  const first = escapeHtml(firstName(opts.name));
  const biz = opts.business ? ` for ${escapeHtml(opts.business)}` : "";
  return renderBrandedEmail({
    subject: "Your Saabai portal is ready",
    preheader: "Sign in with your email. No password. Website, care plan, invoices and requests in one place.",
    eyebrow: "Client Portal",
    title: "Your Saabai portal is ready",
    bodyHtml: [
      p(`Hi ${first},`),
      p(`Your Client Portal${biz} is live. Sign in with your work email. We email you a secure link (and an optional 6-digit code). No password to invent, forget, or write on a sticky note.`),
      p("Inside you can:"),
      `<ul style="margin:0 0 16px;padding-left:20px;color:#13152a;font-size:15px;line-height:1.65;">
        <li style="margin:0 0 6px;">See your website status</li>
        <li style="margin:0 0 6px;">Check your care plan</li>
        <li style="margin:0 0 6px;">Review invoices (Owner and Billing can pay)</li>
        <li style="margin:0 0 6px;">Send requests and track replies</li>
      </ul>`,
      muted("Button not cooperating? Open saabai.ai/client-portal and enter the same email."),
    ].join(""),
    cta: { href: opts.link, label: "Open your portal" },
    textBody: [
      `Hi ${firstName(opts.name)},`,
      "",
      `Your Saabai Client Portal${opts.business ? ` for ${opts.business}` : ""} is ready.`,
      "Sign in with your work email. You get a secure link (and an optional 6-digit code). No password.",
      "",
      "What you can see:",
      "- Website status",
      "- Care plan",
      "- Invoices (Owner and Billing can pay)",
      "- Requests and replies",
      "",
      "Or go to https://www.saabai.ai/client-portal and enter your email.",
    ],
  });
}

export function accountReadyEmail(opts: {
  name: string;
  email: string;
  setPasswordLink: string;
  /** Optional lead sentence, e.g. "Thanks for signing up for Website Care. ..." (plain text, escaped). */
  intro?: string;
}): BrandedEmail {
  const first = escapeHtml(firstName(opts.name));
  const intro = opts.intro ? escapeHtml(opts.intro) : "Your client account is ready.";
  return renderBrandedEmail({
    subject: "Your Saabai account is ready",
    preheader: "Set your password (or use a magic link next time).",
    eyebrow: "Account",
    title: "Your account is ready",
    bodyHtml: [
      p(`Hi ${first},`),
      p(`${intro} Login email: <strong>${escapeHtml(opts.email)}</strong>. Choose a password with the button below. The link works once and expires in 72 hours.`),
      muted('Prefer not to use a password? On the sign-in page you can choose "Email me a sign-in link" any time.'),
    ].join(""),
    cta: { href: opts.setPasswordLink, label: "Set your password" },
    textBody: [
      `Hi ${firstName(opts.name)},`,
      "",
      `${opts.intro ?? "Your Saabai account is ready."} Login: ${opts.email}`,
      `Set your password: ${opts.setPasswordLink}`,
      "",
      "Or use Email me a sign-in link on the sign-in page.",
    ],
  });
}

export function passwordResetEmail(opts: { name: string; resetLink: string }): BrandedEmail {
  const first = escapeHtml(firstName(opts.name));
  return renderBrandedEmail({
    subject: "Reset your Saabai password",
    preheader: "One-time link. Expires in 1 hour.",
    eyebrow: "Account",
    title: "Reset your password",
    bodyHtml: [
      p(`Hi ${first},`),
      p("We received a request to reset your Saabai password. The link below works once and expires in 1 hour."),
      muted("If you did not ask for this, ignore the email. Your password stays put."),
    ].join(""),
    cta: { href: opts.resetLink, label: "Choose a new password" },
    textBody: [
      `Hi ${firstName(opts.name)},`,
      "",
      `Reset your password: ${opts.resetLink}`,
      "",
      "If you did not ask for this, ignore the email.",
    ],
  });
}
