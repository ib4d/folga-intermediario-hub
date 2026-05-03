# Migration Safety Plan

This document outlines the strict guidelines for database migrations in the Folga Intermediario Hub multi-tenant production environment.

## 1. Core Principle: Non-Destructive Migrations
All schema changes must be completely non-destructive to existing data. This is critical for maintaining data integrity for all tenants.

*   **NEVER `DROP TABLE`**: Tables must only be dropped if they have been completely unused for at least 30 days and are verified empty.
*   **NEVER `DROP COLUMN`**: Deprecated columns should be marked as `@ignore` in Prisma or simply unused in application code. They should be dropped at the database level only during scheduled, low-impact maintenance windows after full data migration.
*   **`ADD COLUMN` Safety**: New columns must either be optional (`?`) or have a `@default()` value so existing rows do not violate `NOT NULL` constraints.

## 2. Multi-Tenancy Rules
*   **No Global Uniqueness on PII**: Fields like `email`, `phone`, or `passportNumber` on the `Candidate` model must **never** have a global `@unique` constraint. If uniqueness is required, it must be a composite constraint scoped to the tenant: `@@unique([organizationId, email])`.
*   **Strict Relational Scoping**: Every core model (`Candidate`, `Document`, `LogisticsEvent`, `Outreach`, etc.) must have an `organizationId` foreign key relating back to the `Organization`.

## 3. Handling Enums
When adding new values to Enums (e.g., `CandidateStatus`, `Role`, `LocationStatus`), use raw SQL with `ALTER TYPE ... ADD VALUE` instead of relying on Prisma's drop-and-recreate behavior in standard migrations, which can lock the database.
```sql
ALTER TYPE "CandidateStatus" ADD VALUE IF NOT EXISTS 'EN_POLONIA';
```

## 4. Current Schema State
*   Global `Candidate.email` uniqueness has been correctly removed.
*   The baseline migration (`20260503000000_baseline_multitenant_schema`) has been established using `IF NOT EXISTS` to align Prisma state without data loss.

*Any future deviations from these rules require sign-off from the technical lead.*
