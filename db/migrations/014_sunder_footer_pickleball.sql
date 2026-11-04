-- 014: SUNDER email footer says "SUNDER Pickleball waitlist".
update email_tenants
set why_text = 'you joined the SUNDER Pickleball waitlist and agreed to hear from us'
where slug = 'sunder'
  and why_text = 'you joined the SUNDER waitlist and agreed to hear from us';
