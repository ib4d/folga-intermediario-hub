# Pilot Readiness Final Checklist

This is the short closing checklist for the current stage of ORI CRUIT HUB.

Its purpose is simple:

- confirm whether the app is ready for guided pilots now
- make residual risks explicit
- separate "pilot-ready" from "broader distribution-ready"

## Current label

Use this internally:

`Guided-pilot ready. Broader distribution readiness still in progress.`

Use this with prospects:

`ORI CRUIT HUB is live in production and ready for guided pilots, with OCR-assisted document review and manual validation built into the workflow.`

## 1. What must already be true for guided pilots

These items should be true before treating the platform as ready for live pilot
onboarding.

- [x] Production deploy path is repeatable from the VPS.
- [x] Runtime release can be verified after deploy.
- [x] Monitoring check passes on production.
- [x] Public smoke check passes on production.
- [x] `/api/health` returns `status=ok`.
- [x] Backup and restore drills have already passed.
- [x] SMTP is working in production.
- [x] Billing and expiry cron jobs are active.
- [x] OCR-assisted document review works in production.
- [x] Manual correction remains available in the document workflow.
- [x] Demo/sandbox tenant flow is operational.
- [x] Demo tenant can be audited and cleaned safely from the VPS.

## 2. What is functionally solid enough right now

These areas are strong enough for a guided pilot:

- candidate flow
- document upload flow
- OCR review plus manual correction flow
- legal follow-up flow
- logistics follow-up flow
- production deployment and rollback discipline
- backup, restore, and live health verification

## 3. Residual risks that still exist

These are real, but they do not block guided pilots if they are framed honestly.

1. OCR on noisy passport scans is not fully deterministic.
   - Impact: some fields still require manual operator confirmation.
   - Positioning rule: never promise zero-touch OCR.

2. Stripe/self-serve billing is not yet productized.
   - Impact: commercial rollout remains guided, not hands-off SaaS.
   - Positioning rule: sell guided pilots, not self-serve subscriptions.

3. Monitoring is sufficient, but still lightweight.
   - Impact: this is production-capable, but not a mature enterprise alerting stack.
   - Positioning rule: say monitored in production, not fully mature observability.

4. Demo quality still depends on sandbox discipline.
   - Impact: messy tenants can confuse the story if reused carelessly.
   - Operating rule: keep a clean sandbox and retire noisy ones deliberately.

## 4. Hard stop claims to avoid

Do not claim any of these yet:

- fully automatic passport OCR with no manual verification
- fully productized self-serve SaaS billing
- broad no-touch mass distribution readiness
- fully mature monitoring and alerting
- frictionless onboarding for every public path

## 5. Go / no-go gate before each live pilot session

Run these from the VPS repository root:

```bash
cd /opt/folga-intermediario-hub
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
docker compose -f docker-compose.prod.yml exec web npm run check:release
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
curl -fsS https://app.ori-craftlabs.com/api/health
docker compose -f docker-compose.prod.yml exec web npm run ops:tenant-audit -- --slug ori-demo-june-8w8j
```

Minimum expected result:

- checks pass
- runtime release matches expected release
- health returns `status=ok`
- demo tenant contains only demo-safe candidates and no unwanted real documents

## 6. Go / no-go gate before calling the app "distribution-ready"

Do not move beyond guided-pilot language until these are closed:

- [ ] OCR quality on noisy passports is tuned to the promised level.
- [ ] Stripe/customer portal rollout is finished for the chosen commercial motion.
- [ ] Monitoring/alerting is stronger than the current lightweight baseline.
- [ ] Public onboarding path is consistently low-friction.
- [ ] Commercial copy and CTA flow match the actual operating model.

## 7. Recommended current decision

Current decision:

`Go for guided pilots. Do not yet position as broad self-serve distribution-ready.`

That is the cleanest technically defensible position based on the production
state and the remaining open items.
