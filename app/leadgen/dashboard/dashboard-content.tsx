/**
 * Saabai LeadGen — Dashboard Content
 *
 * Client component that uses useSearchParams. Wrapped by page.tsx in Suspense.
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Lead {
  id: string;
  clientSlug: string;
  name: string;
  phone: string;
  email?: string;
  service: string;
  address?: string;
  urgency: "emergency" | "soon" | "quote";
  message?: string;
  createdAt: number;
  notified: boolean;
}

interface Client {
  id: string;
  slug: string;
  businessName: string;
  niche: string;
  email: string;
  phone: string;
}

function UrgencyBadge({ u }: { u: string }) {
  const colors: Record<string, string> = {
    emergency: "bg-red-900/50 text-red-300 border-red-700",
    soon: "bg-amber-900/50 text-amber-300 border-amber-700",
    quote: "bg-blue-900/50 text-blue-300 border-blue-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[u] || colors.quote}`}>
      {u}
    </span>
  );
}

export default function DashboardContent() {
  const searchParams = useSearchParams();
  const secret = searchParams.get("secret");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!secret) {
      setError("Dashboard requires a secret key. Add ?secret=your-secret to the URL.");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const clientsRes = await fetch(`/api/leadgen/config?secret=${secret}`);
        if (!clientsRes.ok) throw new Error("Failed to load clients");
        const clientsData = await clientsRes.json();
        setClients(clientsData.clients || []);

        const allLeads: Lead[] = [];
        for (const client of clientsData.clients || []) {
          const res = await fetch(`/api/leadgen/leads?slug=${client.slug}&secret=${secret}`);
          if (res.ok) {
            const data = await res.json();
            allLeads.push(...(data.leads || []));
          }
        }
        allLeads.sort((a, b) => b.createdAt - a.createdAt);
        setLeads(allLeads);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
      setLoading(false);
    }
    load();
  }, [secret]);

  const filteredLeads = selectedSlug === "all"
    ? leads
    : leads.filter((l) => l.clientSlug === selectedSlug);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-xl font-bold mb-2">Access Required</h1>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-[family-name:var(--font-geist-sans)]">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Saabai LeadGen</h1>
            <p className="text-xs text-gray-500">Lead Capture Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300"
            >
              <option value="all">All Clients ({leads.length} leads)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.businessName} ({leads.filter((l) => l.clientSlug === c.slug).length})
                </option>
              ))}
            </select>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-gray-500 hover:text-white px-3 py-1.5 border border-gray-700 rounded-lg"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-saabai-gold border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-lg font-semibold mb-2">No leads yet</h2>
            <p className="text-gray-500 text-sm">
              Visit the{" "}
              <a href="/leadgen" className="text-saabai-gold underline">demo page</a>{" "}
              and test the widget. Captured leads will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{lead.name}</h3>
                      <UrgencyBadge u={lead.urgency} />
                    </div>
                    <p className="text-sm text-saabai-gold">
                      <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{new Date(lead.createdAt).toLocaleString("en-AU")}</div>
                    <div className="mt-1">
                      <span className="text-gray-600">{lead.clientSlug}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Service</span>
                    <p>{lead.service}</p>
                  </div>
                  {lead.address && (
                    <div>
                      <span className="text-gray-500 text-xs">Address</span>
                      <p>{lead.address}</p>
                    </div>
                  )}
                  {lead.email && (
                    <div>
                      <span className="text-gray-500 text-xs">Email</span>
                      <p>{lead.email}</p>
                    </div>
                  )}
                  {lead.message && (
                    <div className="col-span-2">
                      <span className="text-gray-500 text-xs">Notes</span>
                      <p>{lead.message}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
