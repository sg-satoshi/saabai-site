import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Lex, Australian Legal Research | Saabai" },
};

export default function LexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
