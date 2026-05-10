import { saveDirectoryUser } from "../lib/user-directory";

async function createAdmin() {
  const user = {
    id: "shane-goldberg",
    name: "Shane Goldberg",
    email: "shane@saabai.ai",
    password: "Saabai2026!",
    role: "admin" as const,
    dashboardUrl: "/saabai-admin",
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await saveDirectoryUser(user);
  console.log("Admin user created successfully!");
  console.log("Email: shane@saabai.ai");
  console.log("Password: Saabai2026!");
}

createAdmin().catch(console.error);
