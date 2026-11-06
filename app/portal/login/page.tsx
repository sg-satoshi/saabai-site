import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <LoginForm notice={sp.notice === "setting-up" ? "setting-up" : sp.from === "legacy" ? "legacy" : sp.error === "expired" ? "expired" : null} />;
}
