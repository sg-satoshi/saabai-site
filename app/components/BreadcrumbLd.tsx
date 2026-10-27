import JsonLd from "./JsonLd";
import { breadcrumbSchema } from "@/lib/seo-meta";

export default function BreadcrumbLd({ name, path }: { name: string; path: string }) {
  return <JsonLd data={breadcrumbSchema([{ name, path }])} />;
}
