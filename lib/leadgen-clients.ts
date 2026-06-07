import { put, list } from "@vercel/blob";

export type LeadGenClient = {
  id: string;
  email: string;
  businessName: string;
  slug: string;
  tier: "starter" | "pro" | "enterprise";
  createdAt: string;
  active: boolean;
};

const BLOB_PATH = "leadgen/clients.json";

export async function getAllLeadGenClients(): Promise<LeadGenClient[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) return [];
    
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveLeadGenClient(client: LeadGenClient): Promise<void> {
  const clients = await getAllLeadGenClients();
  const existingIndex = clients.findIndex(c => c.id === client.id);
  
  if (existingIndex >= 0) {
    clients[existingIndex] = client;
  } else {
    clients.push(client);
  }

  await put(BLOB_PATH, JSON.stringify(clients, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export function generateSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) + "-" + Math.random().toString(36).slice(2, 8);
}
