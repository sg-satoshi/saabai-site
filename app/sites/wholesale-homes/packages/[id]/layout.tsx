import type { Metadata } from "next";
import { getPublicPackage } from "../../_data/packages";

const SITE_URL = "https://www.wholesalehomes.com.au";

type Props = { params: Promise<{ id: string }> };

// Search-engine and social metadata for the public package pages. No prices,
// yields or other members-only figures (pricing is behind the members login).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pkg = getPublicPackage(id);
  if (!pkg) {
    return { title: "Package Not Found" };
  }

  const title = `${pkg.name} in ${pkg.suburb}, ${pkg.state} | House & Land Package | Wholesale Homes`;
  const description = `${pkg.beds}-bedroom, ${pkg.baths}-bathroom home on ${pkg.landSize}m² in ${pkg.estate}, ${pkg.suburb} ${pkg.state}, by ${pkg.builder}. Members see wholesale pricing: sign in or register for access.`;
  const url = `${SITE_URL}/packages/${pkg.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: pkg.image, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: pkg.image },
  };
}

export default function PackageDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
