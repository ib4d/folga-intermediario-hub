# ORI CRUIT HUB Permissions Matrix

This document mirrors `src/lib/permissions.ts` and describes the current v1 role model.

## Roles

| Role | Scope | User visibility | Management |
| --- | --- | --- | --- |
| Superadmin | Full system | All organization users | Can invite, change roles, and disable access for every role while preserving at least one active superadmin |
| Admin | Organization operations | Intermediario, Legal, and Logistica users | Can invite and manage Intermediario, Legal, and Logistica only |
| Intermediario | Own candidate intake | Intermediario users in the same organization | Cannot invite users or change roles |
| Legal | Legal review | Legal users in the same organization | Cannot invite users or change roles |
| Logistica | Arrivals and handoff | Logistica users in the same organization | Cannot invite users or change roles |

## Module Access

| Module | Superadmin | Admin | Intermediario | Legal | Logistica |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Candidates | Yes | Yes | Yes | Yes | Yes |
| Documents | Yes | Yes | Yes | Yes | No |
| Logistics | Yes | Yes | No | No | Yes |
| Legal | Yes | Yes | No | Yes | No |
| Settings | Yes | Yes | Yes | Yes | Yes |
| Billing | Yes | Yes | No | No | No |
| API Keys | Yes | Yes | No | No | No |
| Branding | Yes | Yes | No | No | No |

## Operational Rules

- Superadmin sees and manages the full organization.
- Admin never sees or manages Superadmin users.
- Admin cannot create or promote another Admin.
- Operational roles only see users in their same role range.
- The last active Superadmin cannot be demoted or disabled.
- Intermediario can create/import candidates, upload documents, request legal review, delete own-visible candidates, and generate registration links.
- Legal can review documents and make legal decisions.
- Logistica can schedule and update arrivals, and request legal review when operational follow-up requires it.

## Verification

Run:

```bash
npm run check:permissions
```

The script checks module access, role assignment, user visibility, and key operational permissions.
