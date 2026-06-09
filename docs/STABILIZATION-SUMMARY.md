# Project Stabilization Summary: Folga Intermediario Hub

This document captures the state reached after the stabilization and production
hardening work executed across the app, the VPS deployment, and the operating
playbooks.

## Key achievements

### 1. Technical infrastructure

- **Production deploy path**: the Docker production flow is working on the VPS
  with `up -d --build`, `prisma migrate deploy`, and public smoke checks.
- **Type and lint discipline**: the repository is kept passing on
  `npm run lint` and `npx tsc --noEmit` while production fixes continue landing.
- **Runtime visibility**: `/api/health` now reports live version/release and
  operational metadata instead of a stale hard-coded release string.

### 2. Security and multi-tenancy

- **Tenant isolation**: core application queries are scoped for multi-tenant
  operation.
- **Auth and role guards**: protected modules keep layout and route-level
  enforcement in place.
- **Cron hardening**: cron endpoints are protected with
  `Authorization: Bearer <CRON_SECRET>` and the billing/expiry automations are
  active in production.

### 3. Operations hardening

- **Backups**: the VPS generates compressed PostgreSQL backups successfully.
- **Restore drill**: a non-destructive restore drill succeeds against a
  temporary database.
- **SMTP delivery**: production SMTP delivery has been tested successfully from
  inside the running `web` container.
- **Automation stability**: the document-expiry cron is idempotent for the same
  day, preventing duplicate notifications.
- **Platform visibility**: Platform Admin reflects live provider, cron, email,
  and release state.

### 4. Business modules

- **Dashboard and operational views**: role-oriented dashboards and operational
  pulses are live.
- **Candidates and documents**: manual review flows, OCR paths, and document
  state handling have been exercised.
- **Legal and logistics**: blocking conditions and readiness signals are wired
  into notifications and platform visibility.
- **Billing**: subscription-attention and plan-pressure automations are active
  and visible.

## Internal documentation

- [Route Map](./route-map.md)
- [Migration Safety Plan](./migration-safe-plan.md)
- [Operations Hardening Checklist](./OPERATIONS-HARDENING-CHECKLIST.md)
- [Deployment Guide](./deploy.md)
- [Production Strategy](./production-strategy.md)

---

**Status: PRODUCTION HARDENING CLOSED / DISTRIBUTION READINESS IN PROGRESS**  
*Date: June 9, 2026*
