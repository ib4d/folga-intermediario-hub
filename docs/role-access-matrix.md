# ORI CRUIT HUB Role Access Matrix

This document is the operational source of truth for v1 role visibility.

## Hierarchy

1. `SUPERADMIN`: platform and organization owner. Can see and manage everything.
2. `ADMIN`: organization operator. Can manage all roles below admin, but cannot see or manage superadmins.
3. `LEGAL`: legal reviewer. Can see legal work and document evidence needed for decisions.
4. `LOGISTICA`: arrival/logistics operator. Can see logistics and candidate readiness data needed for arrival coordination.
5. `INTERMEDIARIO`: candidate owner. Can create and manage only their own candidate pipeline.

## Module Access

| Module | SUPERADMIN | ADMIN | INTERMEDIARIO | LEGAL | LOGISTICA |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Candidates | Yes | Yes | Own scope | Org legal scope | Org logistics scope |
| Documents | Yes | Yes | Own scope | Org review scope | No sidebar access |
| Legal | Yes | Yes | No | Yes | No |
| Logistics | Yes | Yes | No | No | Yes |
| Settings | Yes | Yes | Same-role visibility | Same-role visibility | Same-role visibility |
| Billing | Yes | Yes | No | No | No |
| API Keys | Yes | Yes | No | No | No |
| Branding | Yes | Yes | No | No | No |

## Critical Actions

| Action | Allowed Roles | Notes |
| --- | --- | --- |
| Create candidate | SUPERADMIN, ADMIN, INTERMEDIARIO | Intermediario creates into own scope. |
| Import CSV/XLS/XLSX candidates | SUPERADMIN, ADMIN, INTERMEDIARIO | Subject to plan limits. |
| Upload candidate documents | SUPERADMIN, ADMIN, INTERMEDIARIO | Legal reviews; logistics does not mutate documents. |
| Delete candidate | SUPERADMIN, ADMIN, INTERMEDIARIO | Intermediario can delete only visible owned candidates. |
| Generate registration link | SUPERADMIN, ADMIN, INTERMEDIARIO | Links are operational intake tools. |
| Request legal review | SUPERADMIN, ADMIN, INTERMEDIARIO, LOGISTICA by visibility | Request endpoint remains scoped by tenant and ownership. |
| Review OCR / verify documents | SUPERADMIN, ADMIN, LEGAL | Legal can decide, not upload/delete source files. |
| Legal decision | SUPERADMIN, ADMIN, LEGAL | Changes are persisted and audited. |
| Logistics scheduling | SUPERADMIN, ADMIN, LOGISTICA | Only approved or operationally eligible candidates should appear. |
| Invite user | SUPERADMIN, ADMIN | Admin cannot invite or manage superadmins. |
| Change user role/access | SUPERADMIN, ADMIN | Admin only manages roles below admin. |

## Current Enforcement Points

- `src/lib/permissions.ts` is the canonical place for role/module/action guards.
- `npm run check:permissions` verifies the v1 role matrix and critical action guards.
- Sidebar hides inaccessible modules by role.
- Legal and logistics pages use centralized role guards before loading data.
- Billing, branding and API settings are server-gated and backed by server actions.
- Candidate list hides create/import/delete controls where not allowed.
- Candidate/document actions also enforce permissions server-side.
- OCR review and document verification are limited to `SUPERADMIN`, `ADMIN` and `LEGAL`.
- Legal review requests are limited to authorized operational roles and remain tenant/ownership scoped.
- Logistics mutations are limited to `SUPERADMIN`, `ADMIN` and `LOGISTICA`.
- Member visibility is filtered server-side in settings.
- Tenant scope remains applied to candidate/document lists and detail pages.

## Distribution Notes

This matrix is intentionally conservative for v1. It protects operational value before adding reseller/client portals. Future distribution roles should be added as new explicit roles or permissions, not by widening existing operational roles.
