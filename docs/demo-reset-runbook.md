# Demo Reset Runbook

This runbook is the short operator version for preparing a fresh ORI CRUIT HUB
demo or sandbox tenant before a guided pilot, sales walkthrough, or recording.

Use this when you want a clean, narratively safe environment without touching
real customer data.

## Current operating rule

Do not try to "clean up" a messy old demo tenant right before a presentation.

The safe routine today is:

1. create a fresh demo tenant
2. verify the seeded flow
3. use that tenant for the next cycle
4. retire the old one later, calmly

## When to use this

Use this runbook before:

- a guided sales demo
- a supported pilot handoff
- a training walkthrough
- screenshots or recorded product narration

## 1. Confirm production is healthy

Run these on the VPS from the repository root:

```bash
cd /opt/folga-intermediario-hub
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
docker compose -f docker-compose.prod.yml exec web npm run check:release
```

Expected result:

- monitoring check passed
- smoke check passed
- release check passed

## 2. Create a fresh sandbox

In the browser:

1. Open `/demo?lang=es`
2. Click `Comenzar demo`
3. Sign in if asked
4. Complete the guided demo onboarding
5. Use a clear non-live organization name such as:
   - `ORI Demo June`
   - `Sandbox Sales Poland`
   - `Partner Review Demo`

## 3. Verify seeded content

After the sandbox is created, confirm these areas load correctly:

- Dashboard
- Candidates
- Documents
- Legal
- Logistics
- Notifications

Minimum narrative check:

1. one candidate can be opened
2. one document workflow is visible
3. legal status is represented
4. logistics status is represented

## 4. Confirm you are in the right tenant

Before starting the demo, verify:

- the top bar organization label shows the sandbox name
- the candidate names are fictitious or demo-safe
- there is no real customer information in the visible flow
- the release shown by the system matches the current production deploy

## 5. Operator phrasing for OCR

Current approved phrasing:

`Document upload and OCR-assisted review are active in production. Manual correction remains part of the workflow for some scans.`

Do not claim:

- zero-touch passport OCR
- no-manual-verification document processing
- fully productized self-serve onboarding for every public path

## 6. After the session

If the sandbox worked well:

- keep it for the current audience or campaign
- note its name for reuse during the same short cycle

If the sandbox became noisy or confusing:

- create a new one for the next important session
- do not try to repair it live in front of the audience

## 7. Retiring old demo tenants

Current practice is manual and deliberate.

Only retire an old sandbox when you are sure it is no longer needed for:

- screenshots
- recordings
- pilot follow-ups
- comparison against earlier demos

Useful VPS commands from the repository root:

```bash
docker compose -f docker-compose.prod.yml exec web npm run ops:tenant-audit
docker compose -f docker-compose.prod.yml exec web npm run ops:tenant-audit -- --slug ori-demo-june-8w8j
docker compose -f docker-compose.prod.yml exec web npm run ops:tenant-prune -- --slug ori-demo-june-8w8j --delete-candidate CANDIDATE_ID --dry-run
docker compose -f docker-compose.prod.yml exec web npm run ops:tenant-prune -- --slug ori-demo-june-8w8j --delete-candidate CANDIDATE_ID --confirm-delete
```

The prune command is candidate-scoped on purpose. It does not delete an entire
organization, and it requires `--confirm-delete` to execute.

## 8. Current status

`Guided-demo ready with fresh-sandbox discipline.`
