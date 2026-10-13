import FactFindClient from "./FactFindClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saabai Blueprint Questionnaire | Saabai",
  robots: { index: false, follow: false },
};

export default async function FactFindPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <FactFindClient token={token} />;
}
