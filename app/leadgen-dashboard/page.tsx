import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";
import { getAllLeadGenClients, generateSlug, saveLeadGenClient, type LeadGenClient } from "../../lib/leadgen-clients";
import CustomizeForm from "./CustomizeForm";

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

  const email = (session as any).email || "demo@saabai.ai";
  
  let clients = await getAllLeadGenClients();
  let client = clients.find(c => c.email === email);

  if (!client) {
    client = {
      id: crypto.randomUUID(),
      email,
      businessName: "Demo Plumbing",
      slug: generateSlug("Demo Plumbing"),
      tier: "starter",
      createdAt: new Date().toISOString(),
      active: true,
    };
    await saveLeadGenClient(client);
  }

  const embedScript = `<script src="https://www.saabai.ai/api/leadgen/widget?slug=${client.slug}"></script>`;

  return (
    <div className="min-h-screen bg-[#0e2554] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">LeadGen Dashboard</h1>
        <p className="text-white/60 mb-8">Welcome back, {email}</p>

        {/* Embed Widget Section */}
        <div className="bg-[#0b092e] border border-white/10 rounded-3xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Embed Widget</h2>
              <p className="text-white/60 mt-1">Copy and paste this script into your website</p>
            </div>
            <div className="text-xs px-3 py-1 rounded-full bg-[#62C5D1]/10 text-[#62C5D1] border border-[#62C5D1]/30">
              {client.tier.toUpperCase()}
            </div>
          </div>

          <div className="bg-black/60 rounded-2xl p-6 font-mono text-sm text-[#62C5D1] border border-white/10 mb-4">
            {embedScript}
          </div>

          <button 
            onClick={() => navigator.clipboard.writeText(embedScript)}
            className="px-6 py-3 bg-[#62C5D1] text-[#0b092e] font-semibold rounded-2xl hover:bg-white transition"
          >
            Copy Embed Code
          </button>

          <p className="text-xs text-white/50 mt-4">
            This script is unique to your account. Do not share it.
          </p>
        </div>

        {/* Customize Section */}
        <div className="bg-[#0b092e] border border-white/10 rounded-3xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Customize</h2>
          <CustomizeForm 
            initialBusinessName={client.businessName} 
            onUpdate={async (newName) => {
              'use server';
              client.businessName = newName;
              client.slug = generateSlug(newName);
              await saveLeadGenClient(client);
            }} 
          />
        </div>

        {/* Account Info */}
        <div className="bg-[#0b092e] border border-white/10 rounded-3xl p-8">
          <h3 className="font-semibold mb-4">Account Details</h3>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-white/50">Business</div>
              <div>{client.businessName}</div>
            </div>
            <div>
              <div className="text-white/50">Slug</div>
              <div className="font-mono text-[#62C5D1]">{client.slug}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
