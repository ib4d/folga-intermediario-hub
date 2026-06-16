# Guided Pilot Operator Runbook

This runbook is the short practical path for running ORI CRUIT HUB in its
current supported commercial mode:

- guided demos
- guided pilot onboarding
- supported operator rollout

It is not a self-serve SaaS launch runbook. It assumes an operator is present.

## Current stage

Use this sentence internally:

`Private production ready. Distribution readiness in progress. Guided pilots are operational now.`

Use this sentence with prospects:

`ORI CRUIT HUB is live in production and ready for guided pilots, with OCR-assisted document review and manual validation built into the workflow.`

## 1. Before any live demo or pilot handoff

From the VPS repository root:

```bash
cd /opt/folga-intermediario-hub
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
docker compose -f docker-compose.prod.yml exec web npm run check:release
curl https://app.ori-craftlabs.com/api/health
```

Expected:

- monitoring passes
- smoke passes
- release check passes
- `/api/health` reports `status=ok`

## 2. Before showing the product

Confirm:

1. the correct demo or sandbox tenant is active
2. the visible candidate names are demo-safe
3. there is at least one narratable end-to-end flow
4. release/provider status matches the current deploy

## 3. Minimum story to show

For a safe guided session, show:

1. candidate creation or candidate list
2. document upload
3. OCR-assisted review with manual correction visible
4. legal state or follow-up signal
5. logistics state or arrival readiness signal

## 4. Approved operator phrasing

Use:

- `Document upload and OCR-assisted review are active in production.`
- `Operators keep the final review step when scan quality or compliance requires it.`
- `The platform is production-deployed and already supports guided pilots.`

Avoid:

- `fully automatic passport OCR`
- `no-manual-verification workflow`
- `fully productized self-serve SaaS`
- `broad no-touch mass distribution`

## 5. If a session gets noisy

Do not try to repair a messy demo tenant live.

Instead:

1. stop the narrative cleanly
2. switch to a fresher sandbox if available
3. create a fresh sandbox for the next session
4. retire the old one later

## 6. After a deploy

Preferred path:

```bash
cd /opt/folga-intermediario-hub
git pull origin main
bash ./scripts/deploy-prod.sh
```

This path:

- syncs release metadata
- rebuilds the image
- restarts containers
- runs monitoring and release checks

## 7. What remains outside this runbook

These items are real, but they belong to the next stage rather than blocking
guided pilots now:

- OCR field-quality tuning on noisy passport scans
- stronger alerting maturity beyond the current lightweight uptime monitor
- more productized Stripe/customer portal rollout
- smoother self-serve onboarding

## 8. Current operating label

`Guided-pilot ready with operator-assisted OCR review.`
