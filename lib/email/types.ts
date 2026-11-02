export type SeriesStepView = {
  position: number;
  delayDays: number;
  subject: string;
  body: string;
};

export type CampaignView = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  unsubscribed: number;
};

export type EmailAdminSnapshot = {
  ok: true;
  paused: boolean;
  fromName: string;
  fromEmail: string;
  configSet: string | null;
  sesTenantName: string | null;
  counts: { subscribed: number; pending: number; unsubscribed: number; suppressed: number };
  sent30: number;
  unsub30: number;
  series: { status: "active" | "paused"; steps: SeriesStepView[]; enrolled: number; active: number; completed: number; exited: number };
  campaigns: CampaignView[];
};
