import type { Metadata } from "next";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { publicPageMeta } from "@/lib/seo-pages";
import JsonLd from "../../components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo-meta";
import { ORG_ID, SITE_URL } from "@/lib/seo-entity";

export const metadata: Metadata = publicPageMeta.rexCase;

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "A custom AI sales agent for a national plastics supplier",
  description: publicPageMeta.rexCase.description,
  url: `${SITE_URL}/case-studies/rex-plastics-online`,
  mainEntityOfPage: `${SITE_URL}/case-studies/rex-plastics-online`,
  author: { "@type": "Organization", name: "Saabai", url: SITE_URL },
  publisher: { "@id": ORG_ID },
};

export default function RexPlasticsCaseStudy() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema([{ name: "Rex case study", path: "/case-studies/rex-plastics-online" }])} />
      <Nav />

      <section className="relative pt-52 pb-20 px-6 max-w-5xl mx-auto overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)",
          }}
        />
        <div className="relative flex flex-wrap items-center gap-3 mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-teal uppercase">
            Trade &amp; Retail Supply
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            AI Sales Agent
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saabai-surface border border-saabai-border text-[11px] font-semibold tracking-[0.12em] text-saabai-teal uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal inline-block" />
            Custom build
          </span>
        </div>

        <h1 className="relative text-5xl md:text-6xl lg:text-[72px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          A custom AI sales agent
          <br />
          <span className="text-gradient">for a national plastics supplier</span>
        </h1>
        <p className="relative text-lg text-saabai-text-muted max-w-2xl leading-relaxed">
          Name withheld on request. This page describes what the agent does.
          It does not publish result figures.
        </p>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">
              Company
            </p>
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              National Plastics Supplier
            </h2>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              A large national plastics supplier serving trade and retail
              customers across Australia. Name withheld on request.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">
              Engagement
            </p>
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              AI sales agent: &ldquo;Rex&rdquo;
            </h2>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              A custom AI sales agent on the supplier&apos;s website. It answers
              product questions at any hour, prices cut-to-size jobs from the
              supplier&apos;s own product data, captures leads, and emails those
              leads to the sales team. There is no published price. Custom
              agents are quoted to the job.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-5">
          What it does
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 leading-snug">
          Product questions, cut-to-size pricing, and lead capture.
        </h2>
        <p className="text-base text-saabai-text-muted max-w-3xl mb-16 leading-relaxed">
          Quoting on this site is custom work, scoped for this supplier. It is
          not included in the website care plans, and it is not a 24/7 quoting
          product you can buy off the page.
        </p>

        <div className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden">
          <div className="bg-saabai-surface p-10 relative">
            <h3 className="text-base font-semibold mb-3 tracking-tight">
              Product questions
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Visitors can ask about products, sizes and materials. The agent
              answers from the supplier&apos;s catalogue. Answering at any hour
              is the chat itself, not a promise about staff follow-up.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 relative">
            <h3 className="text-base font-semibold mb-3 tracking-tight">
              Cut-to-size pricing
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              The agent prices cut-to-size jobs from the supplier&apos;s own
              product data. That pricing was built for this client. A quoting
              tool for another business is quoted separately.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 relative">
            <h3 className="text-base font-semibold mb-3 tracking-tight">
              Leads to the sales team
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              The agent can capture a lead and email it to the sales team.
              This is a custom alert for this client. Enquiry alerts are not
              included on the published website plans.
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-40 px-6 text-center border-t border-saabai-border overflow-hidden">
        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          A similar agent for your business
        </p>
        <h2 className="relative text-4xl md:text-5xl font-semibold tracking-[-0.02em] mb-7 max-w-3xl mx-auto leading-[1.08]">
          Custom agents are quoted to the job.
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          A Blueprint is optional, from $497. Website care plans are sold on
          their own. If you book a build within 30 days of receiving a
          Blueprint, the fee comes off that build invoice.
        </p>
        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide"
          >
            Book a free 30 minute call
          </a>
          <a
            href="/blueprint"
            className="inline-flex items-center min-h-[44px] text-sm text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
          >
            See the Blueprint →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
