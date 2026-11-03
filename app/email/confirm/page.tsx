import { readEmailToken } from "../../../lib/email/tokens";
import ConfirmNow from "./ConfirmNow";
import { SunderError } from "./SunderPages";
import "./sunder-confirm.css";

export const metadata = { title: "Confirm your email | SUNDER", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const parsed = readEmailToken(t, process.env.SAABAI_SESSION_SECRET || "", "confirm");
  return <main>{parsed ? <ConfirmNow token={t} /> : <SunderError />}</main>;
}
