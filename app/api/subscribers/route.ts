import { getSubscribers, getSubscriberCount } from "../../../lib/subscribers";

export const runtime = "nodejs";

export async function GET() {
  const [subscribers, count] = await Promise.all([
    getSubscribers(500),
    getSubscriberCount(),
  ]);
  // Most recent first
  subscribers.sort((a, b) => b.subscribedAt.localeCompare(a.subscribedAt));
  return Response.json({ subscribers, count });
}
