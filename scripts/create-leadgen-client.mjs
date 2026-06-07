import { createClient } from "./lib/leadgen-config";

const client = await createClient({
  slug: "hello-saabai-demo",
  businessName: "Saabai Demo",
  niche: "AI Automation Services",
  description: "AI-powered business automation solutions for modern enterprises.",
  phone: "+61400000000",
  email: "hello@saabai.ai",
  serviceArea: "Australia wide",
  businessHours: "Mon-Fri 9am-5pm AEST",
  branding: {
    primaryColor: "#62C5D1",
    accentColor: "#C9A84C",
    widgetTitle: "Jack - AI Assistant",
    greeting: "G'day! How can I help you today?",
  },
  status: "active",
  subscription: {
    tier: "enterprise",
    status: "active",
  },
});

console.log("Created:", JSON.stringify({ id: client.id, slug: client.slug, email: client.email }, null, 2));
