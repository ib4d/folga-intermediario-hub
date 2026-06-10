# Operations Hardening Checklist

This checklist captures the production operations work that has already been
validated on the Hostinger VPS for ORI CRUIT HUB, plus the remaining items that
belong to distribution readiness rather than bare-minimum survival.

## Closed in production

- [x] `docker compose -f docker-compose.prod.yml up -d --build` completes on the VPS.
- [x] `npx prisma migrate deploy` runs successfully in production.
- [x] `npm run check:smoke` passes against the public domain.
- [x] `/api/health` reports a healthy database connection.
- [x] `/api/health` exposes live runtime metadata (`version`, `release`,
      `cronConfigured`, `smtpConfigured`, `email`, `jobs`).
- [x] `APP_RELEASE` is wired into `docker-compose.prod.yml` and visible from the
      deployed runtime.
- [x] OCR provider is running in automatic `tesseract` mode on the VPS.
- [x] Local VPS-backed document storage is reachable and reported by provider
      status.
- [x] `CRON_SECRET` is enforced through the `Authorization: Bearer ...` header.
- [x] `/api/cron/check-expiring` no longer duplicates notifications when it runs
      repeatedly on the same day.
- [x] `/api/cron/check-billing` is live and returns `200 OK` with automation
      summary payloads.
- [x] Backup script produces compressed PostgreSQL dumps on the VPS.
- [x] Restore drill succeeds against a temporary database without damaging the
      live database.
- [x] Daily cron entries exist for backup, document expiry scan, and billing
      automation scan.
- [x] SMTP production delivery test succeeds from inside the `web` container.
- [x] Platform Admin exposes a live operational status view instead of only
      static text.

## Normal update ritual

Run this on the VPS after pushing production-bound changes:

```bash
cd /opt/folga-intermediario-hub
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
curl https://app.ori-craftlabs.com/api/health
```

## Recommended verification after deploy

```bash
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
curl -i -H "Authorization: Bearer YOUR_CRON_SECRET" https://app.ori-craftlabs.com/api/cron/check-expiring
curl -i -H "Authorization: Bearer YOUR_CRON_SECRET" https://app.ori-craftlabs.com/api/cron/check-billing
docker compose -f docker-compose.prod.yml exec web npm run check:smtp -- your-email@example.com
```

## Still open before broader distribution

These are not blockers for a hardened private production deployment, but they
remain open for a cleaner public SaaS rollout:

- [ ] Rotate any secret that may have been exposed during setup iterations.
- [ ] Set `SMTP_TEST_RECIPIENT` in VPS `.env` for repeatable hardening checks.
- [ ] Add lightweight monitoring or alerting beyond manual health checks.
- [x] Add basic rate limiting for public auth, registration, and operational
      status endpoints.
- [ ] Finish GDPR/export/delete operating procedures.
- [ ] Prepare a clean demo or sandbox tenant.
- [ ] Complete Stripe/customer portal rollout when commercial billing goes live.
- [ ] Finalize public launch copy and onboarding flow.

## Suggested current stage label

`Production hardening closed. Distribution readiness in progress.`
