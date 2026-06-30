import type { ReactNode } from "react";
import { NewsletterPopup } from "./_components/NewsletterPopup";

export default function WholesaleHomesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <NewsletterPopup />
    </>
  );
}
