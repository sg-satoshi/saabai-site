import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BO Consulting | Blue-Collar Recruitment & Labour Hire Australia",
  description:
    "Australia's specialist blue-collar workforce recruitment partner. Permanent placement, labour hire, and workforce solutions across Construction, Mining, Manufacturing, Transport and more. 1,000+ placements, 95% retention rate.",
  keywords: [
    "blue collar recruitment Australia",
    "labour hire Australia",
    "construction recruitment",
    "mining recruitment",
    "manufacturing recruitment",
    "workforce solutions Australia",
    "permanent recruitment agency",
    "skilled workers Australia",
    "trade recruitment",
    "transport recruitment",
  ],
  authors: [{ name: "BO Consulting" }],
  creator: "BO Consulting",
  publisher: "BO Consulting",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://www.boconsulting.com.au",
    siteName: "BO Consulting",
    title: "BO Consulting | Blue-Collar Recruitment & Labour Hire Australia",
    description:
      "Australia's specialist blue-collar workforce recruitment partner. Connecting businesses with skilled workers across Construction, Mining, Manufacturing, Transport, Civil, Trades, Warehousing and Logistics.",
    images: [
      {
        url: "/sites/bo-consultancy/logo.png",
        width: 813,
        height: 272,
        alt: "BO Consulting – Blue-Collar Recruitment Australia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BO Consulting | Blue-Collar Recruitment & Labour Hire Australia",
    description:
      "Australia's specialist blue-collar workforce recruitment partner. 1,000+ placements, 95% retention rate, 48hr average turnaround.",
    images: ["/sites/bo-consultancy/logo.png"],
  },
  alternates: {
    canonical: "https://www.boconsulting.com.au",
  },
};

export default function BOConsultancyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EmploymentAgency",
            name: "BO Consulting",
            url: "https://www.boconsulting.com.au",
            logo: "https://www.boconsulting.com.au/sites/bo-consultancy/logo.png",
            description:
              "Australia's specialist blue-collar workforce recruitment partner. Permanent placement, labour hire and workforce solutions across Construction, Mining, Manufacturing, Transport, Civil, Trades, Warehousing and Logistics.",
            email: "info@boconsulting.com.au",
            areaServed: {
              "@type": "Country",
              name: "Australia",
            },
            serviceType: [
              "Permanent Recruitment",
              "Labour Hire",
              "Executive Search",
              "Volume Recruitment",
              "Workforce Planning",
              "Recruitment Process Outsourcing",
            ],
            knowsAbout: [
              "Construction Recruitment",
              "Mining Recruitment",
              "Manufacturing Recruitment",
              "Warehousing Recruitment",
              "Transport Recruitment",
              "Civil Recruitment",
              "Trades Recruitment",
              "Logistics Recruitment",
            ],
            openingHours: "Mo-Fr 09:00-17:00",
            sameAs: [],
          }),
        }}
      />
      {children}
    </>
  );
}
