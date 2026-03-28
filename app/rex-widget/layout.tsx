export const metadata = { title: "Rex — PlasticOnline AI" };

export default function RexWidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Override the global body background so the iframe is transparent */}
      <style>{`
        html, body {
          background: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
      {children}
    </>
  );
}
