import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

// Same editorial type system as the client portal, so the login gateway
// feels continuous with the members-only experience it leads into.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "Client Login | Access Your Wholesale Homes Portal",
  description:
    "Secure client portal for Wholesale Homes Australia buyers. Track your house and land package, view documents, and manage your purchase. Registered client access only.",
  alternates: { canonical: `${PAGE_URL}/client-login` },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Client Login | Wholesale Homes Australia",
    url: `${PAGE_URL}/client-login`,
  },
};

export default function ClientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} ${manrope.variable}`} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
