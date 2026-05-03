# Multi-Tenant Security Strategy

## Context
FOLGA Hub is a multi-tenant application where multiple organizations share the same database and infrastructure. Data isolation is paramount.

## 1. Identity & Access Management (IAM)
- **Session-Based Isolation**: Upon login, the user's `organizationId` is embedded in the JWT and session.
- **Helper functions**: `requireTenant()` and `getCurrentTenant()` are the only ways to access organization context. They never trust parameters from the URL or body for scoping.
- **RBAC**: Roles (ADMIN, LEGAL, etc.) are verified within the context of a `Membership`. A user might be an ADMIN in one organization and an INTERMEDIARIO in another.

## 2. Query Scoping
- **Prisma Middle-Layer**: Every query to `candidate`, `document`, `auditLog`, etc., MUST include `{ organizationId: session.user.organizationId }` in the `where` clause.
- **Server Actions**: All server actions begin with `const tenant = await requireTenant()`.

## 3. Storage Security
- **Path Isolation**: Files in Supabase Storage are stored using paths prefixed by `candidateId`. Candidates are already scoped to an organization.
- **Access Control**: RLS (Row Level Security) or application-level signed URLs should be used. Currently, the application verifies organization ownership before serving document metadata.

## 4. API Security
- **Hashed Keys**: API keys are hashed using SHA-256. Only the hash is stored in the database.
- **Revocation**: Keys can be revoked instantly by setting `revokedAt`.
- **Throttling**: (Recommended) Rate limiting should be applied to API endpoints to prevent abuse.

## 5. Audit Logging
- **Immutable Logs**: Every sensitive action (candidate creation, status change, document deletion) creates an `AuditLog` entry.
- **Tenant Scoping**: Audit logs are themselves scoped to the organization, allowing admins to see what happened within their own tenant without seeing other tenants' logs.
