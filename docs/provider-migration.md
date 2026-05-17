# ORI CRUIT HUB Provider Migration Strategy

This document keeps the app revenue-first while making provider migration safe.
The rule is simple: introduce an internal interface first, migrate the provider
second, and only migrate when production value or cost justifies it.

## Current v1 Providers

| Capability | Interface | Current provider | Later provider |
| --- | --- | --- | --- |
| Candidate document storage | `StorageProvider` | Supabase Storage | Cloudflare R2 |
| Transactional email | `EmailProvider` | SMTP Hostinger | Resend |
| OCR/document intelligence | `OCRProvider` | Azure Document Intelligence | Google Document AI or hybrid fallback |
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

## Acceptance Checks

- `/api/health` reports the active provider names.
- Uploading and deleting a document works without callers importing Supabase.
- Invitations and outreach send through `EmailProvider`.
- OCR callers use `OCRProvider`, not Azure directly.
- Events go through `JobProvider`, currently inline.
