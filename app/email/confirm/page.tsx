import { readEmailToken } from "../../../lib/email/tokens";
import ConfirmNow, { ConfirmView } from "./ConfirmNow";
import { SunderError } from "./SunderPages";
import "./sunder-confirm.css";

export const metadata = { title: "Confirm your email | SUNDER", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; s?: string }> }) {
  const { t = "", s = "" } = await searchParams;
  // Landing after the no-JS form POST (303). Display only; the confirm already happened server side.
  if (!t && (s === "confirmed" || s === "already" || s === "unsubscribed")) return <main><ConfirmView state={s} /></main>;
  const parsed = readEmailToken(t, process.env.SAABAI_SESSION_SECRET || "", "confirm");
  return <main>{parsed ? <ConfirmNow token={t} /> : <SunderError />}</main>;
}
