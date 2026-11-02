-- Rename the SUNDER sender display name to Sunder Pickleball (data only).
-- Apply by hand in the Supabase SQL editor after 009. Safe to re-run.
update email_tenants set from_name = 'Sunder Pickleball'
 where slug = 'sunder' and from_name = 'SUNDER';
update email_campaigns c set from_name = 'Sunder Pickleball'
  from email_tenants t
 where t.id = c.tenant_id and t.slug = 'sunder' and c.from_name = 'SUNDER';
-- email_series has no from_name; series sends read email_tenants.from_name.
