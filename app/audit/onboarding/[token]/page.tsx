import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Blueprint search onboarding",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OnboardingClient token={token} />;
}
