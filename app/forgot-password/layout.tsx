import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Reset your password | Saabai" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: "/forgot-password" },
  openGraph: { url: "/forgot-password", title: "Reset your password | Saabai" },
  twitter: { card: "summary", title: "Reset your password | Saabai" },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
