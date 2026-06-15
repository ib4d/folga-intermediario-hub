# Distribution Readiness Checklist

This checklist is the practical bridge between "private production works" and
"we can confidently run pilots and commercial demos without improvising."

It is intentionally operational. The goal is to help decide whether ORI CRUIT
HUB is ready for:

- guided sales demos
- supported pilot customers
- broader self-serve distribution later

## Current stage wording

Use this internally:

`Private production ready. Distribution readiness in progress.`

Use this with pilot prospects:

`The platform is production-deployed and operational for guided pilots. Some OCR field extraction cases still use manual review as part of the workflow.`

## A. Required for guided pilots

These should be true before onboarding a real pilot customer.

- [x] Public production domain is live over HTTPS.
- [x] Production deploy path is repeatable from the VPS.
- [x] `npm run check:smoke` passes on the live domain.
- [x] `npm run check:release` confirms runtime release alignment.
- [x] `/api/health` reports `status=ok`.
- [x] Database backup and restore drills have passed.
- [x] SMTP invitations and transactional email work in production.
- [x] Demo/sandbox tenant flow is available.
- [x] Billing and expiry cron automations are active.
- [x] Candidate, legal, logistics, and documents areas load in production.
- [x] Document upload works in production.
- [x] OCR-assisted review works with manual correction available.
- [x] Platform Admin shows release/provider/runtime status.

## B. Allowed pilot positioning

These claims are acceptable today:

- [x] "The platform replaces fragmented Excel + WhatsApp candidate operations."
- [x] "You can run candidates, documents, legal follow-up, and logistics in one system."
- [x] "Document upload and OCR-assisted review are active in production."
- [x] "Manual correction is built into the document workflow."
- [x] "The system is already deployed and monitored in production."
- [x] "Backups, restore drills, SMTP, and cron routines are already in place."

## C. Claims to avoid for now

Do not position these as fully closed yet:

- [ ] "Passport OCR is fully automatic with no manual verification needed."
- [ ] "Billing/subscription rollout is fully productized for self-serve SaaS."
- [ ] "Monitoring and alerting are fully mature."
- [ ] "Public onboarding is completely frictionless for every entry path."
- [ ] "The platform is already ready for broad no-touch mass distribution."

## D. Pilot operator checklist

Before each guided demo or pilot handoff:

1. Confirm the live release:
   - `docker compose -f docker-compose.prod.yml exec web npm run check:release`
2. Confirm monitoring:
   - `docker compose -f docker-compose.prod.yml exec web npm run check:monitoring`
3. Confirm public smoke:
   - `docker compose -f docker-compose.prod.yml exec web npm run check:smoke`
4. Confirm the demo/sandbox tenant is the one being shown.
5. Confirm at least one candidate flow can be narrated end to end:
   - candidate creation
   - document upload
   - OCR/manual review
   - legal state
   - logistics state

## E. Remaining work before broader distribution

These are the highest-value open items for a more commercial release:

- [ ] Finish OCR field-quality tuning on noisy passport scans.
- [x] Tighten the public conversion funnel from landing -> demo -> login -> onboarding.
- [ ] Finalize Stripe/customer portal rollout.
- [ ] Add one lightweight external uptime/alerting monitor.
- [x] Decide the final pilot offer and commercial CTA narrative.
- [x] Add a short operator-facing runbook for demo reset / fresh sandbox setup.
- [x] Add a guided pilot operator runbook for deploy/demo/pilot handoff discipline.

## F. Exit criteria for "distribution-ready"

Move from "distribution readiness in progress" to "distribution-ready for
pilots" when:

- release/deploy checks are routine and uneventful
- guided demo flow is stable and narratively clean
- pilot onboarding can happen without developer intervention
- OCR limitations are honestly framed and operationally acceptable
- billing path for the chosen pilot/commercial motion is explicit

Move from "pilot-ready" to "broader distribution-ready" only after:

- Stripe/self-serve path is stable
- monitoring/alerting is stronger than manual checks alone
- onboarding and demo entry paths are consistently low-friction
- OCR quality and operator expectations are aligned with what is promised
