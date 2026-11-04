-- SUNDER: remove the unconfirmed 12-month warranty claim from the welcome-2 email (Shane, 4 Nov 2026).
-- Apply by hand in the Supabase SQL editor. Do not auto-apply on deploy.
update email_templates et
set body_text = replace(et.body_text, 'Power, spin and control, and a 12-month warranty on the core and edge.', 'Power, spin and control.'),
    html      = replace(et.html,      'Power, spin and control, and a 12-month warranty on the core and edge.', 'Power, spin and control.')
from email_tenants t
where et.tenant_id = t.id and t.slug = 'sunder' and et.name = 'welcome-2';
