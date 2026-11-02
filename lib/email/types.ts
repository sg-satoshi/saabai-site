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
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
};

export type EmailAdminSnapshot = {
  ok: true;
  paused: boolean;
  fromName: string;
  fromEmail: string;
  configSet: string | null;
  sesTenantName: string | null;
  counts: { subscribed: number; pending: number; unsubscribed: number; suppressed: number };
  series: { status: "active" | "paused"; steps: SeriesStepView[] };
  campaigns: CampaignView[];
};
