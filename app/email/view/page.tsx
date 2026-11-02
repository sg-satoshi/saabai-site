import { viewByToken } from "../../../lib/email/ops";

export const metadata = { title: "View email | SUNDER", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const email = t ? await viewByToken(t).catch(() => null) : null;
  if (!email) {
    return <main style={{ fontFamily: "Arial, sans-serif", padding: 32 }}><h1>This email is not available.</h1><p>The link may be incomplete.</p></main>;
  }
  return <main dangerouslySetInnerHTML={{ __html: email.html }} />;
}
