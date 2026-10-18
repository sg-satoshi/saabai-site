# Chatbot platform: notes for stage 3

## Who sees what (decided, not built yet)
- **Client logins see only their own site's chatbot.** Every client-facing read and write is tenant-scoped: the site slug comes from the signed client session (never from the request body or URL), and the API refuses any slug that is not that client's.
- **Admin sees every site**, with the search box on `/saabai-admin/chatbots` (name, slug or domain) already in place.
- Client area scope (when built): simple view of their own bot only. Skin options, knowledge, on/off for their own site. No plan, cap override or other sites. Admin-only editing stays the rule for release 1, so the client editor is a later release.
- Needs a test that a client session for site A cannot read or change site B (slug in body, in query, and via the admin endpoints).

## ON/OFF control
Design Option A (status pill with dot) is the shared `app/saabai-admin/ui/OnOff.tsx`. Spec: `/workspace/design/toggle/SPEC.md`.
