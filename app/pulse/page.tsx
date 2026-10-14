import { redirect } from "next/navigation";

// Pulse now lives in Mission Control under Marketing > Pulse.
export default function PulseRedirect() {
  redirect("/saabai-admin/marketing/pulse");
}
