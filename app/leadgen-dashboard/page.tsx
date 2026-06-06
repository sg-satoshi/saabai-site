import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";

export default async function LeadGenDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) {
    redirect("/login?redirect=/leadgen-dashboard");
  }

  const session = await verifySessionToken(token);
  if (!session) {
    redirect("/login?redirect=/leadgen-dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0e2554] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">LeadGen Dashboard</h1>
      
      <div className="max-w-4xl">
        <div className="bg-[#0b092e] border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">Embed Widget</h2>
          <p className="text-white/70 mb-6">Your unique embed code will appear here once your account is set up.</p>
          
          <div className="bg-black/40 p-4 rounded-xl font-mono text-sm text-[#62C5D1]">
            Coming in next build step...
          </div>
        </div>
      </div>
    </div>
  );
}
