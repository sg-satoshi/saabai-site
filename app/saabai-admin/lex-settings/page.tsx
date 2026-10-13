import { requireAdmin } from "../../../lib/require-admin";
import LexSettingsClient from "./LexSettingsClient";

export const metadata = { title: "Lex — LLM Settings | Saabai Admin" };

export default async function LexSettingsPage() {
  await requireAdmin("/saabai-admin/lex-settings");
  return <LexSettingsClient />;
}
