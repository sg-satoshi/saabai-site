# Access model (roles, areas, scope) and how it extends

Release 1 covers **internal admin accounts**. The data model and enforcement layer are built so clients, team members, contractors, partners and API keys can be added later without a migration or a rewrite.

## What exists now

Stored on a directory user (`saabai:users`, field `access`; `role` is `admin`, `staff` or `user`):

| Field | Meaning |
|---|---|
| `role` (on the user) | `admin` = full admin (legacy default, no `access` needed). `staff` = restricted admin; power comes only from `access`. `user` = portal client (unchanged). |
| `access.role` | `viewer` (read-only, any granted area) or `custom` (read or write per area) |
| `access.areas` | `coupons, products, chatbots, experiments, orders, customers, announcements, billing, users` each `read` or `write`; missing = none |
| `access.kind` | `internal` today; `client`, `contractor`, `partner`, `service` reserved |
| `access.scope` | `{ tenantId?, siteIds? }` reserved, stored but not yet enforced |
| `access.expiresAt` | ISO date, enforced now: past = no access |
| `access.disabled` / `revokedAt` | instant kill, checked on every request |
| `lastLoginAt` (on the user) | stamped at sign-in |

Caps in `MAX_LEVEL`: `users` is never grantable, `billing` is read only. Everything not in `AREA_PREFIXES` (impersonation, sell/charge, audits, deploy, growth, any new route) is **admin only by default**.

## Enforcement (one place)

* `lib/access.ts`: pure `decide()` and `gate()` (access plus the 2FA rule). No I/O.
* `proxy.ts` `staffGate()`: every admin page and every `ADMIN_API` request. Full admins pass unchanged. Restricted staff are decided by `gate()`. Approved requests get an HMAC header (`x-saabai-acl`) that only the server can mint.
* `isAdminSession()` is unchanged in meaning for callers: true for **full** admins only (and now false when disabled/expired). Restricted staff are never admin there, so any handler not deliberately migrated stays admin only.
* `isAdminOrGranted()` (`lib/auth-acl.ts`): used only by handlers whose area is grantable. It accepts a full admin, or restricted staff carrying a valid proxy header.
* `requireAdmin(path)` (pages): same `gate()` decision, as defence in depth.
* Restricted accounts must have TOTP enrolled. Until then they only reach `/saabai-admin/security` and `/api/admin/2fa`. They cannot use trusted-device skip or the `SAABAI_ADMIN_2FA_DISABLE` break-glass.
* Audit: every admin write (allowed or denied) goes to Redis list `saabai:admin-audit` (capped at 2000): actor id, email, role, method, path (no query string), area, result. No bodies, no secrets.

## Extension path

1. **Team members** (staff who are not owners): already supported, they are `staff` accounts. Add presets (e.g. "Support", "Marketer") as UI shortcuts over `areas`.
2. **Clients (tenant scoped)**: add `kind: "client"` with `scope.siteIds`/`tenantId`. A client area map (their own chatbot, orders, requests) is a second prefix table (`/client-portal/*`, `/api/portal/*`) decided by the same `decide()`. Add one rule: when `scope` is set, handlers must filter by `scope.siteIds` (helper `scopeAllows(grant, siteId)` to add next to `decide`). Existing portal sessions keep working until moved over.
3. **Contractors and partners**: same as staff with `expiresAt` set and short sessions. `expiresAt` is already enforced on every request.
4. **API keys for outside tools**: a `service` principal stored in a separate hash (`saabai:api-keys`, only a SHA-256 of the key stored, shown once), same `access` block, `Authorization: Bearer` resolved in the proxy to a grant and run through `gate()` (no 2FA step, so require `expiresAt`, IP/rate limits and per-key audit). Revoke = set `revokedAt` (instant).
5. **Moving the check into more handlers**: swap `isAdminSession` for `isAdminOrGranted` per area as areas open up, and add the area to `AREA_PREFIXES`. Forgetting to do so fails closed.
