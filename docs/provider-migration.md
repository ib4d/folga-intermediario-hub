# ORI CRUIT HUB Provider Migration Strategy

This document keeps the app revenue-first while making provider migration safe.
The rule is simple: introduce an internal interface first, migrate the provider
second, and only migrate when production value or cost justifies it.

## Current v1 Providers

| Capability | Interface | Current provider | Later provider |
| --- | --- | --- | --- |
| Candidate document storage | `StorageProvider` | Supabase Storage | Cloudflare R2 |
| Transactional email | `EmailProvider` | SMTP Hostinger | Resend |
| OCR/document intelligence | `OCRProvider` | Azure Document Intelligence or `manual` safe mode | Google Document AI or hybrid fallback |
| Async/background jobs | `JobProvider` | Inline execution | PostgreSQL outbox, then Redis/BullMQ |

The first production release keeps the current providers. Redis, n8n, Grafana,
OpenClaw, and self-hosted Supabase stay out of production v1.

## Migration Rules

- Do not move files from Supabase to R2 until upload, public URL generation,
  deletion, and rollback are tested through `StorageProvider`.
- Do not replace SMTP with Resend/Brevo until invitations and transactional
  delivery are tested through `EmailProvider`.
- Do not replace Azure OCR until the alternative extracts passport, PESEL, and
  Karta Pobytu fields with equal or better reliability.
- If Azure becomes unavailable before the replacement is ready, switch to
  `OCR_PROVIDER=manual` so the app keeps accepting uploads and routes them to
  manual review without breaking the document workflow.
- Do not introduce Redis/BullMQ until document OCR or notifications are slow
  enough to require real background processing.
- Do not use n8n for core app correctness. Use it later for integrations and
  customer-specific automation.

## Revenue-First Sequence

1. Stabilize core workflows: candidate import, OCR upload, OCR review, legal,
   logistics, payment, invitations, and role permissions.
2. Ship distribution basics: marketing site, demo tenant, EN/PL UI, security
   page, pricing, onboarding, and customer-facing docs.
3. Add provider alternatives behind the interfaces without changing user flows.
4. Migrate one provider at a time with backup, smoke tests, and rollback notes.

## OCR Fallback Policy

There are now two safe OCR runtime modes for production:

- `OCR_PROVIDER=azure`
  - Full automatic OCR flow.
  - Requires `AZURE_DI_ENDPOINT` and `AZURE_DI_KEY`.
- `OCR_PROVIDER=manual`
  - Documents still upload and persist.
  - OCR extraction is skipped intentionally.
  - The app must show manual review messaging instead of pretending OCR worked.

Use `manual` mode when:

- Azure subscription or quota expired.
- The provider is temporarily unavailable.
- We are preparing the next OCR provider and need the app to stay operational.

The next migration step should be:

1. keep the app alive on `manual`,
2. introduce `GoogleDocumentAIProvider` behind `OCRProvider`,
3. switch production only after field extraction for passport, PESEL, and
   Karta Pobytu is validated end to end.

## Acceptance Checks

- `/api/health` reports the active provider names.
- Uploading and deleting a document works without callers importing Supabase.
- Invitations and outreach send through `EmailProvider`.
- OCR callers use `OCRProvider`, not Azure directly.
- Events go through `JobProvider`, currently inline.
