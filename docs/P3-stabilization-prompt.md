# ANTIGRAVITY PROMPT — FOLGA HUB PHASE P3 (PRODUCTION HARDENING)

You are a senior full-stack architect (20+ years).

Project:
https://github.com/a-bol3/folga-intermediario-hub

Assume Phase P0, P1, P2 are already completed:

* Build is stable
* Core flow works end-to-end
* Legal & Logistics panels exist
* OCR is safe
* Notifications are user-based

---

# 🎯 OBJECTIVE

Prepare the system for **real production deployment + commercial usage**

This phase is about:

* Security (GDPR / RODO)
* Data integrity
* Operational reliability
* Observability
* Deployment readiness
* Mobile usability
* Internal documentation

---

# 🔐 PHASE P3.1 — SECURITY & GDPR COMPLIANCE

## 1. Enforce GDPR data rules

### Create:

```txt
src/lib/security/gdpr.ts
```

### Implement:

Functions:

* maskSensitiveData(candidate)
* anonymizeCandidate(candidateId)
* exportCandidateData(candidateId)
* deleteCandidateData(candidateId)

Rules:

* Mask:

  * passportNumber → show last 3 chars only
  * peselNumber → show last 3 digits only
* Only SUPERADMIN can fully export/delete data
* LEGAL and ADMIN can view full data
* INTERMEDIARIO sees masked data unless owner

---

## 2. Add data retention strategy

Add to Candidate model:

```prisma
dataRetentionUntil DateTime?
isArchived Boolean @default(false)
```

### Behavior:

* If candidate.status = RECHAZADO or RETIRADO:

  * set retention to now + 6 months
* Add function:

```ts
archiveExpiredCandidates()
```

---

## 3. Secure API routes globally

Create middleware wrapper:

```txt
src/lib/security/requireRole.ts
```

Usage:

```ts
requireRole(["ADMIN", "SUPERADMIN"])
```

Apply to:

* logistics actions
* exports
* notifications read/write
* candidate update/delete
* document verification

---

## 4. Prevent brute force login

In auth config:

* Add login attempt tracking (in-memory or Redis-ready structure)
* Block after 5 failed attempts per email/IP
* Cooldown 15 minutes

---

## 5. Protect file uploads

In document upload:

* Validate MIME type strictly
* Limit file size (e.g. 10MB)
* Reject executable formats
* Normalize filename
* Prevent path injection

---

# 📊 PHASE P3.2 — AUDIT & TRACEABILITY

## 6. Expand AuditLog usage

Ensure ALL critical actions log:

* candidate created/updated
* document uploaded/deleted
* OCR processed
* status changed
* legal decision
* logistics event created/updated
* login/logout (optional)

---

## 7. Create Audit Timeline UI

Create:

```txt
src/components/audit/AuditTimeline.tsx
```

Show:

* chronological actions
* user who performed action
* timestamp
* type of action
* metadata summary

Integrate into:

```txt
/candidatos/[id]
```

---

## 8. Add system health endpoint

Create:

```txt
src/app/api/health/route.ts
```

Return:

```json
{
  "status": "ok",
  "db": "connected",
  "storage": "ok",
  "timestamp": "..."
}
```

---

# 🚀 PHASE P3.3 — DEPLOYMENT PREPARATION

## 9. Create environment configuration

Create:

```txt
.env.example
```

Include:

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
AZURE_DI_ENDPOINT=
AZURE_DI_KEY=
```

---

## 10. Dockerize the app

Create:

```txt
Dockerfile
docker-compose.yml
```

Services:

* web (Next.js)
* db (PostgreSQL)
* redis (optional for future scaling)

Ensure:

* production build
* environment variables support
* ports exposed

---

## 11. Add production scripts

Update package.json:

```json
"scripts": {
  "start:prod": "next start -p 3000"
}
```

---

## 12. Setup backup strategy

Create:

```txt
scripts/backup-db.sh
```

Behavior:

* dump PostgreSQL
* timestamped backups
* ready for cron execution

---

# 🧪 PHASE P3.4 — TESTING

## 13. Add basic E2E tests

Create:

```txt
tests/e2e/main-flow.spec.ts
```

Test:

* login
* create candidate
* registration flow
* upload document
* OCR extraction
* legal approval
* logistics assignment
* dashboard update

Use:

* Playwright or simple Node-based testing

---

## 14. Add validation guards

Ensure:

* all Zod schemas used consistently
* no raw form data reaches DB
* dates always normalized
* enums validated

---

# 📱 PHASE P3.5 — MOBILE & PWA READINESS

## 15. Improve mobile UX

Audit:

* /candidatos
* /legal
* /logistica
* /registro

Fix:

* no horizontal scroll
* large tap areas
* readable font sizes
* stack cards instead of tables

---

## 16. Enable full PWA support

Ensure:

* manifest.json is valid
* service worker exists
* offline fallback page
* installable on Android

---

# 📈 PHASE P3.6 — OBSERVABILITY

## 17. Add logging utility

Create:

```txt
src/lib/logger.ts
```

Functions:

```ts
logInfo()
logError()
logWarn()
```

Replace:

* console.log
* console.error

---

## 18. Add error boundary

Create:

```txt
src/components/ErrorBoundary.tsx
```

Wrap main layout.

---

# 📄 PHASE P3.7 — DOCUMENTATION

## 19. Create internal docs

Create:

```txt
docs/setup.md
docs/deploy.md
docs/security.md
docs/backup.md
docs/roles.md
```

---

## 20. Create onboarding guide

Create:

```txt
docs/onboarding-folga.md
```

Explain:

* how intermediarios use system
* how legal works
* how logistics works
* how admin monitors system

---

# ✅ FINAL VALIDATION

System is ready when:

* builds successfully
* all flows work without manual fixes
* no unsafe data exposure
* OCR is review-based
* notifications are correct
* roles are enforced
* mobile usage is smooth
* deployment is reproducible

---

# 📦 OUTPUT FORMAT

Return:

1. Summary of all improvements
2. List of modified/created files
3. Docker instructions
4. Environment setup instructions
5. Known limitations (if any)

Return FULL FILES for all new or modified code.

---

Execute carefully and produce production-grade results.
