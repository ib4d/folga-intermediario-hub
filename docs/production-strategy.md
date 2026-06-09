# ORI CRUIT HUB - Hostinger VPS Production Strategy

This document is the strategic map for taking ORI CRUIT HUB from the current
local Docker setup to a public, recoverable Hostinger VPS deployment.

The deployment source of truth is:

- `docs/deploy.md`
- `Dockerfile`
- `docker-compose.prod.yml`
- `scripts/check-production-env.mjs`
- `docs/provider-migration.md`

## Current Product Direction

ORI CRUIT HUB is a multi-tenant recruitment operations SaaS for international
candidate workflows between LATAM and Poland. The product shell is ORI CRUIT
HUB, while each customer organization keeps its own name and operating identity
inside the platform.

Core app areas:

- Marketing and login/onboarding.
- Candidate pool and candidate detail operations.
- CSV/XLS/XLSX candidate import.
- Document center with Supabase Storage and Azure Document Intelligence OCR.
- Legal review queue.
- Logistics/arrival scheduling.
- Billing/payment tracking for the initial 400 PLN status.
- Settings, invitations, API keys, notifications, and audit logs.

Current technical stack:

- Next.js 16.2.4 App Router with React 19.
- TypeScript.
- Prisma 5.22 and PostgreSQL.
- NextAuth 5 beta.
- Supabase Storage for candidate documents.
- Azure Document Intelligence plus local OCR helpers.
- Direct SMTP delivery for invitations and transactional email.
- Docker Compose for app + database.

Provider policy:

- `StorageProvider`: Supabase Storage now, Cloudflare R2 later.
- `EmailProvider`: SMTP Hostinger now, Resend/Brevo later.
- `OCRProvider`: Azure Document Intelligence now, Google Document AI or hybrid
  fallback later.
- `JobProvider`: inline execution now, PostgreSQL outbox or Redis/BullMQ later.
- Provider changes must happen behind interfaces first; production provider
  swaps happen only after backup, smoke tests, and rollback steps are prepared.

## Phase 1 - Production v1 on Hostinger

The first public deployment should stay intentionally simple:

- One Hostinger VPS.
- Docker Compose with two services:
  - `web`: ORI CRUIT HUB Next.js standalone server.
  - `db`: PostgreSQL 15 with a persistent Docker volume.
- App bound only to `127.0.0.1:3000`.
- PostgreSQL kept internal to the Docker network.
- Nginx + Certbot, or Hostinger-supported Nginx Proxy Manager, handling HTTPS.
- Hostinger firewall exposing only SSH, HTTP, and HTTPS.
- Supabase remains the file storage provider for v1.
- Azure Document Intelligence remains the OCR provider for v1.
- SMTP must be configured before inviting real users.

Do not add Redis, n8n, Grafana, OpenClaw, code-server, or self-hosted Supabase
to the first production release. They are useful later, but they increase
operations risk before the core app is proven in production.

Hostinger references:

- Docker VPS template:
  https://www.hostinger.com/support/8306612-how-to-use-the-docker-vps-template
- Nginx Proxy Manager:
  https://www.hostinger.com/support/how-to-set-up-nginx-proxy-manager-using-hostinger-docker-manager/
- Certbot SSL:
  https://www.hostinger.com/support/6865487-how-to-install-ssl-on-vps-using-certbot-at-hostinger/
- VPS firewall:
  https://www.hostinger.com/support/8172641-how-to-use-vps-firewall

## Production Guardrails

Database:

- Use `prisma migrate deploy` only.
- Never use `prisma db push`, reset, or destructive migration commands in
  production.
- Take a PostgreSQL backup before deploying changes that affect data.
- Test restoring a backup before treating the system as distribution-ready.

Runtime:

- Use Node 22 in Docker. The current dependency set requires it.
- Use Next.js standalone output from `.next-prod`.
- Start the production container with `node server.js`.
- Run `scripts/check-production-env.mjs` before the server starts.
- Fail startup if required secrets are missing, too short, or still look like
  placeholders.
- Treat Docker/Linux builds as the deployment proof. On Windows development
  machines, local `next build` can fail with `EPERM` while renaming Next.js
  build artifacts if another process or security tool holds a file handle. That
  is a local workstation issue; Hostinger readiness should be judged by the
  Docker production build and container smoke test.

Security:

- `AUTH_URL` and `NEXTAUTH_URL` must be the HTTPS production domain.
- `AUTH_SECRET`, `NEXTAUTH_SECRET`, and `CRON_SECRET` must be long random values.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed with a `NEXT_PUBLIC_` prefix.
- `CRON_SECRET` protects `/api/cron/check-expiring` and `/api/cron/check-billing`
  through the `Authorization: Bearer ...` header.
- Demo seed is blocked in production unless `ALLOW_DEMO_SEED=true` is set
  intentionally for a first bootstrap.

Email:

- SMTP is required for production invitations.
- The app must only claim that an invitation email was sent when SMTP delivery
  was actually attempted successfully.
- If SMTP fails, the UI should show manual temporary credentials instead of a
  false success message.

Storage and OCR:

- Supabase bucket must exist before production testing.
- Azure Document Intelligence credentials must be valid before OCR workflows are
  considered production-ready.
- Candidate imports and OCR uploads must be tested after every production
  deployment.

## Phase 2 - Distribution Readiness

Only after Phase 1 is stable:

- Public marketing root at `ori-craftlabs.com` with problem, solution, demo,
  screenshots, pricing, security/GDPR, and clear B2B conversion copy.
- Demo/sandbox tenant with safe fictitious data and a guided OCR -> legal ->
  logistics flow.
- Stripe subscriptions and customer billing portal.
- Multi-language UI: Spanish first, then Polish and English, later Ukrainian.
- Tenant onboarding without developer assistance.
- Customer-facing plan limits and billing enforcement.
- Automated backups and restore drills.
- Monitoring dashboards and alerting.
- Rate limiting and abuse protection for public APIs and uploads.
- White-label branding controls per organization.
- Data retention, GDPR/privacy review, and customer export/delete procedures.

## Phase 3 - Automation Ecosystem

After production and distribution basics are stable, expand into:

- Cloudflare R2 only after `StorageProvider` tests cover upload, URL generation,
  deletion, and rollback.
- Resend for transactional email only after `EmailProvider` tests cover
  invitations, errors, and manual credential fallback.
- n8n for recruitment workflow automation.
- Grafana/Prometheus or lighter Hostinger-compatible monitoring.
- OpenClaw or assistant tooling for operator support.
- Redis or a queue only when the app has a real background-job workload.
- Self-hosted Supabase only if there is a strong cost, compliance, or control
  reason to replace Supabase Storage.

## Deployment Acceptance Criteria

The app is ready for the first Hostinger public deployment when:

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx prisma validate` passes.
- `npm run build` passes on Linux or in Docker. If Windows local build hits
  `EPERM`, verify with the Docker production build instead.
- `docker compose -f docker-compose.prod.yml build` passes.
- `docker compose -f docker-compose.prod.yml up -d` starts `web` and `db`.
- `docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy`
  succeeds.
- `curl http://127.0.0.1:3000/api/health` returns healthy locally on the VPS.
- HTTPS works on the public domain.
- Manual browser checks pass for `/`, `/login`, `/dashboard`, `/candidatos`,
  `/candidatos/[id]`, `/documentos`, `/legal`, `/logistica`, and `/ajustes`.
- Candidate spreadsheet import creates or updates records correctly.
- OCR batch upload creates one candidate per real person and persists documents.
- Document expiry values render without server errors.
- The 400 PLN payment toggle persists.
- Invitations either send through SMTP or show manual credentials honestly.
- `npm run check:hardening` can exercise SMTP too when `SMTP_TEST_RECIPIENT` is
  configured intentionally.

## Current Readiness

Approximate status:

- First private Hostinger deployment: 80-85% once Docker Desktop/VPS is
  available for final `up -d`, migration, and health smoke testing.
- Public SaaS distribution: 60-65%.

The next hardening work should focus on Docker proof, production environment
checks, backups, cron, SMTP, and the candidate/document workflows before adding
Stripe or the larger automation ecosystem.
