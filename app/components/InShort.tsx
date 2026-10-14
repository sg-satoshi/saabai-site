export default function InShort({ children }: { children: React.ReactNode }) {
  return (
    <aside aria-label="In short" className="relative max-w-2xl mx-auto my-11 md:my-14 text-left rounded-2xl border border-saabai-border-accent bg-saabai-surface/80 backdrop-blur-sm pl-7 pr-[22px] py-6 md:pl-9 md:pr-8 md:py-7 shadow-[0_0_40px_var(--saabai-glow-mid)] before:absolute before:left-0 before:top-6 before:bottom-6 before:w-[3px] before:rounded-full before:bg-saabai-teal">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-saabai-teal mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal" />In short
      </p>
      <div className="text-base text-saabai-text-muted leading-[1.7] [&_strong]:font-semibold [&_strong]:text-saabai-teal [&_strong]:whitespace-nowrap [&_a]:text-saabai-teal [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </aside>
  );
}
