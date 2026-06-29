import type { Metadata } from "next";
import { packages } from "../../_data/packages";

const SITE_URL = "https://www.wholesalehomes.com.au";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pkg = packages.find((p) => p.id === id);
  if (!pkg) {
    return { title: "Package Not Found" };
  }

  const title = `${pkg.name} in ${pkg.suburb}, ${pkg.state} | House & Land from $${formatForTitle(pkg.wholesalePrice)}`;
  const description = `${pkg.beds}-bedroom, ${pkg.baths}-bathroom home on ${pkg.landSize}m² in ${pkg.estate}, ${pkg.suburb}. ${pkg.description.slice(0, 120)} Wholesale price: $${formatForTitle(pkg.wholesalePrice)}.`;
  const url = `${SITE_URL}/packages/${pkg.id}`;
  const image = `/sites/wholesale-homes/package-${packages.indexOf(pkg) + 1}.jpg`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: image,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image,
    },
  };
}

function formatForTitle(price: number): string {
  if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
  return `${Math.round(price / 1000)}K`;
}

export default function PackageDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
