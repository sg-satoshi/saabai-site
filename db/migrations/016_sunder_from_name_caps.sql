-- 016: SUNDER sender display name becomes "SUNDER Pickleball" (data only).
-- Apply by hand in the Supabase SQL editor. Safe to re-run. Sent history untouched.
update email_tenants set from_name = 'SUNDER Pickleball'
 where slug = 'sunder' and from_name in ('SUNDER', 'Sunder Pickleball');
-- Drafts and scheduled campaigns still on the old default follow the new one.
update email_campaigns c set from_name = 'SUNDER Pickleball'
  from email_tenants t
 where t.id = c.tenant_id and t.slug = 'sunder'
   and c.status in ('draft', 'scheduled')
   and c.from_name in ('SUNDER', 'Sunder Pickleball');
