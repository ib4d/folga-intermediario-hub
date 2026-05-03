# ANTIGRAVITY FIX PROMPT — CURRENT PROJECT STATUS AUDIT

You are working on:

github.com/a-bol3/folga-intermediario-hub

The user ran these commands:

* `npm install` → FAILED
* `npx prisma generate` → OK
* `npm run build` → OK
* `npm run lint` → FAILED
* `npx prisma validate` → OK
* `npx prisma migrate status` → 1 migration pending

Your task is to fix the project safely without adding new features.

---

# 1. FIX DEPENDENCY INSTALL FAILURE

Current error:

`lucide-react@0.378.0` does not support React 19 peer dependency.

Current stack:

```json
"react": "19.2.4",
"react-dom": "19.2.4",
"next": "16.2.4",
"lucide-react": "^0.378.0"
```

## Required fix

Update `lucide-react` to a version compatible with React 19.

Use a recent stable version such as:

```json
"lucide-react": "^0.468.0"
```

or newer if compatible.

Then run:

```bash
npm install
```

Do NOT use:

```bash
--force
--legacy-peer-deps
```

unless there is absolutely no alternative.

The goal is clean dependency resolution.

---

# 2. FIX LINT SCRIPT

Current lint script:

```json
"lint": "next lint"
```

This fails with:

```txt
Invalid project directory provided...
```

## Required fix

Replace with a valid ESLint command for this project.

Recommended:

```json
"lint": "eslint ."
```

If needed, configure ESLint properly for Next.js 16 + TypeScript.

Then run:

```bash
npm run lint
```

Fix real lint errors only. Do not silence important errors globally.

---

# 3. APPLY PENDING PRISMA MIGRATION

Current status:

```txt
1 migration found
Following migration has not yet been applied:
20260501185054_add_hrappka_fields_statushistory_auditlog
```

## Required action

In development:

```bash
npx prisma migrate dev
```

Then:

```bash
npx prisma generate
npx prisma migrate status
```

Expected result:

```txt
Database schema is up to date
```

Do NOT reset database unless explicitly necessary.

Do NOT use destructive migration commands.

---

# 4. INVESTIGATE PLATFORM INITIALIZATION DUPLICATION

During build, the logs repeat many times:

```txt
[Platform] Registering Core Agents...
[Platform] Initializing ORI-OS Layer...
[Platform] ORI-OS Layer Ready.
```

This suggests platform initialization may be executed multiple times during build/page collection.

## Required fix

Find where `initPlatform()` or equivalent agent/plugin registration is called.

Ensure:

* It is idempotent.
* It does not register duplicate handlers.
* It does not run unnecessary side effects during static page generation.
* It only initializes once per server runtime.

Add a safe guard like:

```ts
let platformInitialized = false;

export function initPlatformOnce() {
  if (platformInitialized) return;
  platformInitialized = true;
  initPlatform();
}
```

Or use `globalThis` if needed for Next.js server runtime.

---

# 5. VERIFY EVENT BUS / WORKFLOW PAYLOAD

Audit:

```txt
src/core/events.ts
src/core/executor.ts
src/lib/automation/engine.ts
```

Ensure:

* `emitEvent()` awaits handlers.
* The automation engine receives `organizationId`.
* Event payload includes `organizationId`.
* Workflows actually execute after events.

Current risk:

`executeWorkflows()` expects `payload.organizationId`, but emitted events may pass organizationId outside payload.

Fix either by:

```ts
executeWorkflows(event.type, {
  ...event.payload,
  organizationId: event.organizationId,
});
```

or by enforcing payload normalization inside `emitEvent()`.

---

# 6. VERIFY OCR SAFETY

Audit:

```txt
src/app/actions/documents.ts
```

Ensure:

* `uploadDocument()` does NOT auto-apply OCR data to Candidate.
* `smartBatchUpload()` does NOT auto-create candidates from OCR without explicit user confirmation.
* OCR only stores data in `Document.extractedData`.
* `ocrStatus` becomes `REVIEW_REQUIRED`.
* Candidate fields are updated only through a manual “Apply OCR data” action.

If `smartBatchUpload()` still auto-creates candidate profiles from OCR, disable that behavior or move it behind explicit confirmation.

---

# 7. VERIFY MULTI-TENANT SAFETY

Audit all Prisma queries touching:

* Candidate
* Document
* Notification
* AuditLog
* StatusHistory
* LogisticsEvent
* Lead
* Outreach
* Workflow

Every query must be scoped by `organizationId`, unless it is a platform-admin route.

Special issue:

If `Candidate.email` is globally unique, remove global uniqueness. For SaaS, candidate emails cannot be globally unique across all organizations.

Recommended:

```prisma
email String?
```

Optionally:

```prisma
@@index([organizationId, email])
```

Do NOT create `@@unique([organizationId, email])` unless empty/null behavior is fully understood.

---

# 8. FINAL VALIDATION COMMANDS

After fixes, run:

```bash
npm install
npx prisma validate
npx prisma migrate status
npx prisma generate
npm run lint
npm run build
```

Expected:

* npm install passes without force
* Prisma schema valid
* all migrations applied
* lint passes
* build passes

---

# OUTPUT REQUIRED

Return:

1. Files modified
2. Exact dependency changes
3. Migration status after fix
4. Lint result
5. Build result
6. Remaining risks, if any

Do not add new features.
Do not redesign UI.
Do not change business logic beyond required fixes.
