import type { ReactNode } from "react";

export function Section({ children, className = "", bleed = false }: { children: ReactNode; className?: string; bleed?: boolean }) {
  return (
    <section className={`py-20 md:py-28 ${className}`}>
      {bleed ? children : <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">{children}</div>}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0891b2]">{children}</p>;
}

export function SectionTitle({
  eyebrow, title, intro, align = "left", as = "h2",
}: {
  eyebrow?: string; title: string; intro?: string; align?: "left" | "center"; as?: "h1" | "h2";
}) {
  const Heading = as;
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Heading className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
        {title}
      </Heading>
      {intro && <p className="mt-5 text-base leading-relaxed text-[#5C6670] md:text-lg">{intro}</p>}
    </div>
  );
}
