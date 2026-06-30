import type { ReactNode } from "react";
import { NewsletterPopup } from "./_components/NewsletterPopup";

export default function WholesaleHomesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#f8f6f2]">
      {children}
      <NewsletterPopup />
    </div>
  );
}
