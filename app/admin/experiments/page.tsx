import { redirect } from "next/navigation";

/** Short alias: /admin/experiments goes to the real dashboard (which enforces the admin login). */
export default function Alias() {
  redirect("/saabai-admin/experiments");
}
