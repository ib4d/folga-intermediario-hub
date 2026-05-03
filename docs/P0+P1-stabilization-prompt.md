# 🧠 ANTIGRAVITY MASTER PROMPT — FOLGA HUB (P0 + P1 STABILIZATION)

You are a senior full-stack architect with 20+ years of experience.

You are working on the repository:
https://github.com/a-bol3/folga-intermediario-hub

This is an ATS (Applicant Tracking System) for FOLGA SP. Z O.O. used across departments:

* Recruitment
* Legal
* Logistics
* Management

The system includes:

* Candidate management
* OCR document processing (Azure Document Intelligence)
* Public candidate self-registration
* Notifications system
* Role-based access (INTERMEDIARIO, LEGAL, ADMIN, SUPERADMIN)

---

# 🎯 OBJECTIVE

Stabilize the system to a **production-ready MVP baseline**.

⚠️ DO NOT ADD NEW FEATURES
⚠️ DO NOT REDESIGN UI
⚠️ DO NOT REFACTOR EVERYTHING

Focus ONLY on:

* Build stability
* Data consistency
* Core workflow correctness
* Security alignment
* OCR reliability

---

# 🔴 PHASE P0 — CRITICAL FIXES (BLOCKERS)

## 1. Fix dependency issue

In package.json:

* Replace invalid version of lucide-react with a stable version:

```json
"lucide-react": "^0.378.0"
```

Then ensure:

* npm install works
* no dependency conflicts

---

## 2. Fix missing import in OCR logic

In:
src/app/actions/documents.ts

Problem:

* analyzeDocument is used in smartBatchUpload but not imported

Fix:

* Add proper import at top:

```ts
import { analyzeDocument } from "@/lib/ocr";
```

Ensure:

* build passes without errors
* no dynamic import inconsistency

---

## 3. Ensure full build success

Run and validate:

```bash
npm install
npx prisma generate
npm run build
```

Fix ALL errors until build passes cleanly.

---

# 🟠 PHASE P1 — CORE SYSTEM CORRECTIONS

---

## 4. Normalize Candidate Status System

Current inconsistency:

* Code uses: EN_REVISION
* System logic requires: EN_REVISION_LEGAL

### ACTION:

Update ALL references:

Replace:

```
EN_REVISION
```

With:

```
EN_REVISION_LEGAL
```

Update in:

* Prisma enum
* Dashboard queries
* Candidate update logic
* Public registration flow
* StatusHistory
* Filters and UI labels

⚠️ Create a migration-safe approach:

* Map old values to new
* Do NOT break existing data

---

## 5. Fix Notification System (CRITICAL ARCHITECTURE ISSUE)

Current problem:

* Notifications are tied to Candidate, NOT User
* Cannot support real multi-role workflow

### REQUIRED CHANGE:

Update Prisma model:

```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  candidateId String?
  candidate   Candidate? @relation(fields: [candidateId], references: [id])
  type        String
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

---

### Update logic:

Replace all notification creation logic to:

* Assign to specific user(s)
* Not just candidate

### Required flows:

1. Candidate completes registration → notify INTERMEDIARIO
2. Candidate enters EN_REVISION_LEGAL → notify LEGAL
3. Candidate APPROVED/REJECTED → notify INTERMEDIARIO
4. Candidate APPROVED without logistics → notify ADMIN/LOGISTICS

---

### Update API:

Fix:

```
/api/notifications
```

* Must return notifications based on logged-in user
* Remove dependency on `userId` query param
* Use session.user.id only

---

### Update frontend:

In NotificationsDropdown:

* Fetch from session context
* NOT from query param
* Maintain unread count correctly

---

## 6. Enforce OCR Safety (NO AUTO-TRUST)

Current issue:

* OCR auto-updates candidate fields silently

This is NOT allowed for legal systems.

---

### REQUIRED CHANGE:

Modify OCR flow:

DO NOT auto-apply data directly to Candidate.

Instead:

1. Store ALL OCR data in:

```
Document.extractedData
```

2. Set:

```
ocrStatus = "REVIEW_REQUIRED"
```

3. REMOVE automatic updates like:

```
candidate.firstName = ocrData.firstName
```

---

### Keep ONLY:

* Extraction
* Storage
* Audit log

---

### Add:

AuditLog entry:

```
OCR_EXTRACTED_PENDING_REVIEW
```

---

## 7. Improve Type Safety (REMOVE `any` ABUSE)

Find all patterns like:

```ts
(prisma as any)
as any
```

Replace with:

* Proper Prisma types
* Explicit interfaces
* Type-safe structures

⚠️ Do NOT leave unsafe casting in production code

---

## 8. Secure Notification Read Endpoint

File:

```
/api/notifications/[id]/read
```

Current issue:

* Any user can mark any notification as read

---

### FIX:

Before updating:

* Validate that notification.userId === session.user.id

If not:

* return 403

---

## 9. Validate Auth Integrity

Ensure:

* session.user.id exists
* session.user.role is always defined
* blocked users (isActive=false) cannot authenticate

---

# 🧪 FINAL VALIDATION CHECKLIST

After all changes:

### Build

* npm install → OK
* prisma generate → OK
* build → OK

### Core Flow

Test manually:

1. Create candidate
2. Generate registration link
3. Complete registration
4. Upload document
5. OCR runs
6. Candidate NOT auto-modified
7. Notification created for correct user
8. Legal changes status
9. StatusHistory updated

---

### Notifications

* Only correct user sees them
* Mark as read works only for owner

---

### Data Integrity

* No broken status values
* No orphan notifications
* No unsafe casting

---

# 📦 OUTPUT FORMAT

Return FULL FILES (not snippets) for:

* package.json
* schema.prisma
* documents.ts
* notifications API routes
* auth-related fixes (if needed)
* any file modified

---

# 🚫 DO NOT:

* Add new UI components
* Add new modules
* Redesign UX
* Introduce new dependencies unless necessary
* Change architecture beyond scope

---

# ✅ SUCCESS DEFINITION

The system is considered stable when:

* It builds without errors
* OCR is safe and non-destructive
* Notifications are user-based
* Status flow is consistent
* Core candidate pipeline works end-to-end

---

Execute all changes carefully and return clean, production-grade code.
