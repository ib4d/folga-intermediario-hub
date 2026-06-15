# Release Readiness Snapshot - 2026-06

This snapshot is meant to keep the current production state easy to explain,
without mixing already-closed hardening work with active polish items.

## Ready now

- Multi-tenant production deployment is live on the VPS.
- Public domain, HTTPS, and reverse proxy are operating.
- Health endpoint is live and exposes runtime release metadata.
- Backup and restore drills have passed.
- Cron automation for expiring documents and billing checks is live.
- SMTP production delivery has been validated from the container.
- Demo/sandbox tenant flow is operational.
- Document upload works in production.
- Local OCR provider is running in automatic `tesseract` mode.
- Document review modal and manual correction flow work in production.

## Not blocking private production

These items do not block current VPS operation, but they are still open before
calling the product broadly distribution-ready:

- OCR extraction quality on noisy passport images needs more tuning.
- Stripe/customer portal rollout still needs final commercialization pass.
- Monitoring is still mostly active-check based rather than alert-driven.
- Self-serve onboarding still needs one explicit low-friction distribution pass.

## Practical operating position

Use this wording internally:

`Private production ready. Distribution readiness in progress. OCR fine-tuning remains an additional stage, not a deployment blocker.`

## Demo guidance for now

For demos or pilot usage:

- show upload and OCR as working
- keep manual review in the narrative
- avoid claiming field extraction is fully closed for every passport scan quality
- treat OCR as operator-assist rather than zero-touch automation until the
  tuning stage is complete
- use the guided pilot operator runbook and release-aligned deploy path
