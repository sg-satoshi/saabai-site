import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rex Analytics · Real-Time Monitoring",
  description: "Real-time monitoring dashboard for Rex lead generation metrics",
};

export default function RexAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
