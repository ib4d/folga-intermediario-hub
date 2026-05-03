# ANTIGRAVITY MASTER PROMPT — FOLGA HUB FULL APP RECOVERY, AUDIT & STABILIZATION

You are a senior full-stack architect and QA engineer with 20+ years of experience.

Repository:
https://github.com/a-bol3/folga-intermediario-hub

The app is a multi-tenant ATS/SaaS for international recruitment with:

* Marketing website
* Auth
* Dashboard
* Candidate management
* Public candidate registration
* Document upload
* OCR
* Legal panel
* Logistics panel
* Notifications
* Exports/reports
* Billing/limits
* Automation/workflows
* AI agents
* Platform admin

Your task is to **repair the entire application**, not just silence TypeScript.

---

# ABSOLUTE RULES

1. Do NOT reset the database.
2. Do NOT delete existing migrations unless explicitly justified.
3. Preserve data.
4. Do NOT return snippets.
5. Return complete modified files.
6. Fix build errors first, then runtime errors.
7. Do not add new features before stabilizing existing ones.
8. Every fix must be testable.
9. Every route must be manually accessible and documented.
10. If a feature is unfinished, add safe fallback UI instead of crashing.

---

# PHASE 0 — BASELINE DIAGNOSTIC

Run:

```bash
npm install
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run build
npm run lint
```

Create:

```txt
docs/current-diagnostic.md
```

Include:

* exact terminal results
* broken files
* broken routes
* Prisma schema issues
* missing env variables
* unsafe migrations
* pages that crash
* APIs that fail
* features that are placeholder only

---

# PHASE 1 — CRITICAL BUILD FIXES

Goal: app builds successfully.

Fix all TypeScript errors in:

```txt
src/agents/*
src/core/*
src/lib/automation/*
src/app/actions/*
src/app/api/*
src/app/**/page.tsx
tests/**
```

Required fixes:

* Prisma.JsonValue / Prisma.InputJsonValue mismatches
* unsafe `unknown`
* unsafe `any`
* broken imports
* missing enums
* invalid route params
* invalid server/client component usage
* invalid Next.js 16 patterns
* broken `next lint` script if incompatible

After fixes:

```bash
npm run build
```

must pass.

---

# PHASE 2 — PRISMA & DATA SAFETY

Goal: schema is valid and migration-safe.

Audit:

```txt
prisma/schema.prisma
prisma/migrations/*
```

Fix:

* Candidate.email must NOT be globally unique.
* CandidateStatus must not contain duplicate conceptual states.
* LocationStatus must remain separate from CandidateStatus.
* DocumentType must support:
  PASSPORT
  KARTA_POBYTU
  PESEL
  DECYZJA_WOJEWODY
  VISA
  ENTRY_STAMP
  EXIT_STAMP
  PAYMENT_RECEIPT
  CV
  OTHER

Create safe migration guidance in:

```txt
docs/migration-safe-plan.md
```

Include:

* SQL to map old `EN_REVISION` to `EN_REVISION_LEGAL`
* SQL to inspect duplicate candidate emails
* SQL to remove unsafe unique email index if present
* warning: never reset DB unless disposable dev DB

---

# PHASE 3 — ROUTING MAP & ACCESS TESTING

Goal: every page is known, accessible, and testable.

Create:

```txt
docs/route-map.md
```

Include table:

```txt
Route | Public/Auth required | Role | Purpose | Expected result | Test steps
```

Must include at minimum:

## Public marketing

```txt
/
 /pricing
 /features
 /use-cases
 /contact
```

## Auth

```txt
/login
/registro/[token]
```

## App/Dashboard

```txt
/dashboard
/candidatos
/candidatos/[id]
/legal
/logistica
/documentos
/notificaciones
/billing
/billing/plans
/platform
/automation-builder
/leads
/outreach
/knowledge
/marketplace
/settings/branding
```

If current app uses different routes, document actual routes and create redirects where needed.

Important:

* Marketing pages must NOT require auth.
* Dashboard/app pages MUST require auth.
* Public registration must NOT require auth.
* Platform admin must require platform admin.

---

# PHASE 4 — AUTH & TENANT SAFETY

Goal: no auth/tenant crashes.

Fix:

* session.user.id always defined
* session.user.role always defined
* session.user.organizationId handled safely
* inactive users cannot log in
* user with no organization gets redirected to onboarding or safe error page
* platform admin can access `/platform`
* tenant-scoped users cannot access another organization’s data

Create:

```txt
src/lib/auth-guards.ts
src/lib/tenant.ts
```

or update existing files.

Every query touching these models must be tenant-scoped:

```txt
Candidate
Document
Notification
AuditLog
StatusHistory
LogisticsEvent
Lead
Workflow
ApiKey
Subscription
```

---

# PHASE 5 — MARKETING SITE RECOVERY

Goal: I can manually visit all public marketing pages.

Ensure these pages exist and load:

```txt
/
 /pricing
 /features
 /use-cases
 /contact
```

Each page must:

* render without auth
* have navigation links
* have CTA to `/login`
* have CTA to `/contact` or demo request
* not crash if database is unavailable

Create:

```txt
docs/manual-marketing-test.md
```

Include:

* URL to open
* what I should click
* expected result

---

# PHASE 6 — DASHBOARD & APP SHELL RECOVERY

Goal: I can manually log in and access the full dashboard.

Ensure app shell works:

* sidebar
* header
* bottom mobile nav
* logout
* notifications
* global search if present

Dashboard must:

* not crash with empty DB
* show empty states
* show real counts if data exists
* respect organizationId

Create:

```txt
docs/manual-dashboard-test.md
```

Include:

* login credentials if seed exists
* dashboard URL
* every link to click
* expected result

---

# PHASE 7 — CANDIDATE FLOW RECOVERY

Goal: candidate lifecycle works end-to-end.

Test and fix:

1. Create candidate
2. Edit candidate
3. Generate registration link
4. Open public registration link
5. Complete registration
6. Candidate status becomes `EN_REVISION_LEGAL`
7. StatusHistory is created
8. AuditLog is created
9. Notifications are created for intermediary and legal users

Fix:

* validation schema
* candidate actions
* registration actions
* UI forms
* status enum mapping
* duplicate email issues
* empty form crashes

Create:

```txt
docs/manual-candidate-flow-test.md
```

---

# PHASE 8 — DOCUMENT & OCR RECOVERY

Goal: document upload works safely.

Fix:

* upload document
* batch upload
* smart batch upload
* Supabase errors handled
* unsupported file types rejected
* OCR only runs for supported document types
* OCR never auto-updates candidate fields
* OCR stores extractedData
* OCR sets REVIEW_REQUIRED
* OCR agent does not auto-verify or mutate candidate
* audit logs are created

Supported OCR v1:

```txt
PASSPORT
KARTA_POBYTU
```

All other types:

* upload only
* no OCR unless explicitly supported later

Create:

```txt
docs/manual-document-ocr-test.md
```

Include exact steps for:

* uploading passport
* uploading non-OCR document
* checking extractedData
* checking candidate fields were NOT auto-changed

---

# PHASE 9 — LEGAL PANEL RECOVERY

Goal: legal review works.

Ensure `/legal`:

* loads only for LEGAL/ADMIN/SUPERADMIN
* shows candidates with `EN_REVISION_LEGAL`
* shows document checklist
* shows missing docs
* allows:

  * approve
  * reject
  * request additional review

Actions must:

* update candidate status
* create StatusHistory
* create AuditLog
* notify intermediary
* notify admin/logistics when approved

Create:

```txt
docs/manual-legal-test.md
```

---

# PHASE 10 — LOGISTICS PANEL RECOVERY

Goal: logistics flow works.

Ensure `/logistica`:

* loads for LOGISTICA/ADMIN/SUPERADMIN
* shows approved candidates without logistics
* shows weekly arrivals
* allows create/edit/confirm/delete logistics events

Actions must:

* be tenant-scoped
* create AuditLog
* notify intermediary
* update UI without crash

Create:

```txt
docs/manual-logistics-test.md
```

---

# PHASE 11 — NOTIFICATIONS RECOVERY

Goal: notifications are user-based and safe.

Fix:

* `/api/notifications`
* `/api/notifications/[id]/read`
* NotificationsDropdown

Rules:

* only logged-in user sees their notifications
* cannot mark another user’s notification as read
* empty notifications do not crash
* unread counter works

Create:

```txt
docs/manual-notifications-test.md
```

---

# PHASE 12 — EXPORTS & REPORTS RECOVERY

Goal: exports do not crash.

Fix:

```txt
src/app/actions/exports.ts
src/app/actions/reports.ts
src/app/api/exports/*
```

Rules:

* tenant-scoped
* role-protected
* works with empty DB
* returns valid XLSX/CSV/PDF or graceful fallback
* no `any` crashes

Create:

```txt
docs/manual-exports-reports-test.md
```

---

# PHASE 13 — BILLING & PLAN LIMITS RECOVERY

Goal: billing pages do not crash and limits work.

Fix:

* `/billing`
* `/billing/plans`
* `src/lib/billing/limits.ts`

Rules:

* FREE plan works
* missing subscription does not crash
* usage counts are tenant-scoped
* limits return clear errors
* no payment provider required yet

Create:

```txt
docs/manual-billing-test.md
```

---

# PHASE 14 — AUTOMATION & AI AGENTS RECOVERY

Goal: automation exists safely but cannot crash core app.

Fix:

* event bus
* workflow engine
* agent registry
* OCR agent
* scoring agent
* notification agent
* sales agent if present

Rules:

* `emitEvent()` awaits handlers safely
* workflow payload always includes organizationId
* failed workflow does not crash user action
* agents never auto-mutate legal/candidate critical data without review
* no JSON type crashes

Create:

```txt
docs/manual-automation-test.md
```

---

# PHASE 15 — PLATFORM ADMIN RECOVERY

Goal: platform admin does not crash.

Ensure `/platform`:

* only platform admin can access
* shows organizations
* shows users/candidates counts
* handles empty DB
* cannot leak tenant data to regular users

Create:

```txt
docs/manual-platform-test.md
```

---

# PHASE 16 — TESTING

Create/fix:

```txt
tests/e2e/main-flow.spec.ts
```

Minimum E2E coverage:

* login
* dashboard loads
* create candidate
* generate registration link
* public registration
* upload document
* legal approval
* logistics assignment
* notification read

If Playwright is not configured, either:

* configure it properly
  or
* move test file to docs/manual tests and avoid build/test breakage

---

# PHASE 17 — FINAL MANUAL QA GUIDE FOR ME

Create:

```txt
docs/manual-qa-master.md
```

This must be written for a non-expert user.

Include:

## How to start app locally

```bash
npm install
npx prisma generate
npm run dev
```

## How to open marketing site

```txt
http://localhost:3000/
http://localhost:3000/pricing
http://localhost:3000/features
http://localhost:3000/use-cases
http://localhost:3000/contact
```

## How to open dashboard

```txt
http://localhost:3000/login
http://localhost:3000/dashboard
```

## What to click, page by page

For every page:

* URL
* expected visual result
* buttons to click
* what should happen
* what data should be created
* how to confirm it worked

## How to test full operational flow

Include one complete test scenario:

* create organization
* create user
* create candidate
* register candidate
* upload document
* legal approval
* logistics assignment
* notification read
* export data

---

# PHASE 18 — FINAL ACCEPTANCE CHECK

Run:

```bash
npx prisma validate
npx prisma generate
npm run build
npm run lint
```

Then provide:

```txt
✅ Build status
✅ Lint status
✅ Prisma status
✅ Manual route map
✅ Manual QA guide
✅ Remaining limitations
✅ Known unfinished features
```

---

# OUTPUT FORMAT

Return:

1. Executive summary
2. Phases completed
3. Files modified
4. Files created
5. Commands executed
6. Build/lint/prisma results
7. Manual testing guide links
8. Remaining issues
9. Clear next actions for Daniel

Do not return snippets.
Return full files for every modified file.
