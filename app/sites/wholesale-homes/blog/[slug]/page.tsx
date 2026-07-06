import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { ChatWidget } from "../../_components/ChatWidget";
import { articles } from "../_data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return { title: "Article Not Found" };
  return {
    title: article.title + " | Wholesale Homes Australia",
    description: article.metaDesc,
    alternates: { canonical: "https://www.wholesalehomes.com.au/blog/" + slug },
    openGraph: {
      title: article.title,
      description: article.metaDesc,
      url: "https://www.wholesalehomes.com.au/blog/" + slug,
      type: "article",
      publishedTime: new Date(article.date).toISOString(),
      images: [{ url: "https://www.wholesalehomes.com.au" + article.image }],
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2]">
        <article className="mx-auto max-w-3xl px-6 py-12 md:py-20 lg:px-0">
          {/* Back link */}
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline md:text-sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to all articles
          </Link>

          {/* Header */}
          <header className="mt-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#0891b2]/10 px-3 py-1 text-[10px] font-semibold text-[#0891b2] uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C]">
              {article.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#5C6670]">
              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {article.author}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {article.date}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {article.readTime}</span>
            </div>
          </header>

          {/* Featured image */}
          <div className="mt-8 overflow-hidden rounded-2xl bg-[#f5f2eb]">
            <img src={article.image} alt={article.alt} className="w-full aspect-[2/1] object-cover" />
          </div>

          {/* Content */}
          <div className="mt-10 prose prose-sm md:prose-base max-w-none prose-headings:text-[#1A2B3C] prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-[#5C6670] prose-p:leading-relaxed prose-a:text-[#0891b2] prose-strong:text-[#1A2B3C] prose-table:text-sm">
            {article.content.split("\n").map((line, i) => {
              if (line.startsWith("## ")) {
                return <h2 key={i} className="mt-10 mb-4 text-xl font-semibold md:text-2xl">{line.slice(3)}</h2>;
              }
              if (line.startsWith("### ")) {
                return <h3 key={i} className="mt-8 mb-3 text-lg font-semibold">{line.slice(4)}</h3>;
              }
              if (line.startsWith("| ") && line.endsWith("|")) {
                // Simple table handling
                if (line.includes("---")) return null;
                const cells = line.split("|").filter(Boolean).map(c => c.trim());
                if (!line.includes(":-")) {
                  return (
                    <tr key={i}>
                      {cells.map((c, j) => <td key={j} className="border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm">{c}</td>)}
                    </tr>
                  );
                }
                return null;
              }
              if (line.startsWith("**") && line.endsWith("**")) {
                return <p key={i} className="mt-6 mb-2 font-semibold">{line.slice(2, -2)}</p>;
              }
              if (line.trim() === "") return <div key={i} className="h-4" />;
              if (line.startsWith("- ")) {
                return <li key={i} className="text-sm md:text-base text-[#5C6670] ml-4">{line.slice(2)}</li>;
              }
              return <p key={i} className="text-sm md:text-base leading-relaxed text-[#5C6670]">{line}</p>;
            })}
          </div>

          {/* Author CTA */}
          <div className="mt-12 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2]">Ready to take the next step?</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-[#1A2B3C]">Speak with Nick about available packages</h3>
            <p className="mt-2 text-sm text-[#5C6670]">
              Book a free 20-minute discovery call to discuss your goals, budget, and the best wholesale packages for your situation.
            </p>
            <a
              href="/contact"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1]"
            >
              Book Discovery Call
            </a>
          </div>
        </article>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
