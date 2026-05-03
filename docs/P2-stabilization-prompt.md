# ANTIGRAVITY PROMPT — FOLGA HUB PHASE P2

You are working on:

https://github.com/a-bol3/folga-intermediario-hub

The app is an ATS for FOLGA SP. Z O.O.

Assume Phase P0/P1 has already stabilized:

* Build works
* Status flow is normalized
* Notifications are user-based
* OCR is non-destructive
* Auth is stable

---

# OBJECTIVE

Complete the operational MVP so the app can replace WhatsApp + Excel for:

* Intermediarios
* Legal
* Logística/Admin
* Superadmin/Management

Do NOT redesign the whole app. Extend the current architecture cleanly.

---

# PHASE P2.1 — PUBLIC CANDIDATE REGISTRATION

## Goal

Build a complete mobile-first public registration flow:

```txt
/registro/[token]
```

The candidate must complete a multi-step form in Spanish.

## Requirements

Create or update:

```txt
src/app/registro/[token]/page.tsx
src/components/registration/CandidateRegistrationForm.tsx
src/lib/validations/candidate-registration.ts
src/app/actions/public-registration.ts
```

## Form Sections

Use 8 steps:

1. Datos personales
2. Contacto
3. Nacionalidad y ubicación
4. Documentos migratorios
5. Situación en Polonia
6. Llegada / transporte
7. Pago 400 PLN
8. Consentimiento GDPR / confirmación final

## Required Fields

At minimum collect:

```txt
firstName
lastName
email
phone
gender
dateOfBirth
birthPlace
birthCountry
citizenship
nationality
country
locationStatus
polishAddress
polishCity
passportNumber
passportIssueDate
passportExpiry
passportBiometric
kartaPobytuNumber
kartaPobytuIssueDate
kartaPobytuExpiry
kartaPobytuType
peselNumber
voivodatoNumber
voivodatoIssueDate
voivodatoExpiry
voivodatoStatus
recruitmentSource
arrivalDate
arrivalNotes
accommodation
accommodationNotes
paid400pln
paymentDate
gdprConsent
```

## Behavior

* Token must be valid.
* Already completed token must show “Formulario ya completado”.
* On successful submit:

  * update candidate
  * set `selfRegistered = true`
  * set `gdprConsent = true`
  * set `gdprConsentDate = now`
  * set status to `EN_REVISION_LEGAL`
  * create StatusHistory entry
  * create AuditLog entry
  * notify assigned intermediary
  * notify all LEGAL users

## UX

* Spanish only
* Mobile-first
* Progress indicator
* Save nothing until final submit
* Clear validation errors
* Final success screen

---

# PHASE P2.2 — LEGAL PANEL

## Goal

Create a real Legal cockpit at:

```txt
/legal
```

## Requirements

Legal users must answer from the app:

* Who needs review today?
* What documents does each candidate have?
* What data is missing?
* Why was a candidate rejected?
* How many were approved/rejected this month?

## Update/create:

```txt
src/app/legal/page.tsx
src/components/legal/LegalReviewQueue.tsx
src/components/legal/LegalCandidateCard.tsx
src/components/legal/LegalDecisionModal.tsx
src/app/actions/candidates.ts
```

## Legal Queue

Show candidates with:

```txt
status = EN_REVISION_LEGAL
```

Each card must show:

```txt
candidate full name
country
intermediary
passport number
passport expiry
karta pobytu expiry
pesel number
voivodato number/status
uploaded documents count
missing documents
400 PLN payment status
last updated date
```

## Legal Actions

Legal/Admin/Superadmin can:

```txt
Approve
Reject
Request additional review
```

When rejecting:

* rejection reason is required
* use predefined options:

  * Documentos faltantes
  * Documento expirado
  * Documento ilegible
  * Historial negativo en FOLGA
  * Proceso migratorio incompleto
  * Falta pago 400 PLN
  * Otro

When approving:

* set status to `APROBADO`
* create StatusHistory
* create AuditLog
* notify intermediary
* notify ADMIN users if no logistics exists

When rejecting:

* set status to `RECHAZADO`
* save rejectionReason
* create StatusHistory
* create AuditLog
* notify intermediary

When requesting additional review:

* set status to `REVISION_ADICIONAL`
* require reviewNotes
* notify intermediary

---

# PHASE P2.3 — LOGISTICS PANEL

## Goal

Create an operational logistics cockpit at:

```txt
/logistica
```

## Requirements

Logistics/Admin must answer:

* Who arrives this week?
* Who comes by plane/train/car/own means?
* Who picks up each candidate?
* Which approved candidates have no logistics assigned?

## Update/create:

```txt
src/app/logistica/page.tsx
src/components/logistics/LogisticsDashboard.tsx
src/components/logistics/LogisticsEventForm.tsx
src/components/logistics/WeeklyArrivals.tsx
src/app/actions/logistics.ts
src/lib/validations/logistics.ts
```

## Data

If needed, update `LogisticsEvent` model to support:

```prisma
transportType
arrivalDate
terminal
flightOrTrain
pickedUpBy
notes
confirmed
```

Use safe migration.

## Logistics Page Sections

1. Approved candidates without logistics
2. Weekly arrivals
3. Create/edit logistics event
4. Confirmation status

## Actions

* createLogisticsEvent
* updateLogisticsEvent
* confirmLogisticsEvent
* deleteLogisticsEvent

Each action must:

* require session
* require role ADMIN or SUPERADMIN
* create AuditLog
* revalidate paths
* notify assigned intermediary

---

# PHASE P2.4 — DOCUMENT COMPLETENESS CHECK

## Goal

Every candidate detail and Legal card must show missing documents.

Create utility:

```txt
src/lib/document-checklist.ts
```

## Function

```ts
getCandidateDocumentChecklist(candidate)
```

Return:

```ts
{
  required: string[]
  uploaded: string[]
  missing: string[]
  warnings: string[]
  isComplete: boolean
}
```

## Rules v1

Required minimum:

```txt
PASSPORT
PAYMENT_RECEIPT if paid400pln is true or process started
```

Conditional:

```txt
KARTA_POBYTU if candidate claims residence card
PESEL if peselNumber exists
DECYZJA_WOJEWODY if voivodatoNumber exists
```

Warnings:

```txt
passport expiry within 30 days
karta pobytu expiry within 30 days
missing 400 PLN payment
no phone
no email
```

---

# PHASE P2.5 — CANDIDATE DETAIL COMPLETION

## Goal

Candidate detail page must become the operational center.

Update:

```txt
src/app/candidatos/[id]/page.tsx
```

Must show:

```txt
personal data
status
document checklist
uploaded documents
OCR extracted data review panel
payment status
legal history
logistics history
notes
audit timeline
```

Actions available by role:

INTERMEDIARIO:

* edit candidate
* upload documents
* generate registration link
* see legal result
* see logistics

LEGAL:

* verify documents
* approve/reject/request additional review

ADMIN/SUPERADMIN:

* all actions
* assign logistics
* export candidate data

---

# PHASE P2.6 — EXPORTS

## Goal

Create practical exports for departments.

Update/create:

```txt
src/app/actions/exports.ts
src/app/api/exports/candidates/route.ts
```

Exports:

1. Full candidate XLSX
2. Legal review XLSX
3. Logistics arrivals XLSX
4. Marketing/recruitment source CSV
5. Management summary CSV

Use `xlsx`.

Filters:

* status
* country
* intermediary
* date range
* paid400pln
* locationStatus

---

# PHASE P2.7 — MAIN FLOW TEST DOCUMENTATION

Create:

```txt
docs/flujo-principal-test.md
```

Document this flow with status:

```txt
✅ OK
❌ Error
⚠️ Works with observation
```

Flow:

1. SUPERADMIN login
2. SUPERADMIN creates INTERMEDIARIO
3. INTERMEDIARIO login
4. INTERMEDIARIO creates shell candidate
5. INTERMEDIARIO generates registration link
6. Candidate completes public form
7. Intermediary receives notification
8. Intermediary uploads passport
9. OCR extracts data but does not auto-apply
10. LEGAL reviews candidate
11. LEGAL approves candidate
12. Intermediary receives approval notification
13. ADMIN creates logistics event
14. ADMIN marks candidate as CONTRATADO
15. Dashboard counters update correctly

---

# PHASE P2.8 — ROLE UX CHECKLIST

Create:

```txt
docs/role-ux-checklist.md
```

For each role, document whether the current app answers:

## INTERMEDIARIO

* total candidates
* candidate status
* missing documents
* payment 400 PLN
* rejection reason
* unread notifications

## LEGAL

* candidates pending review
* documents per candidate
* rejection history
* approved/rejected this month

## LOGISTICS / ADMIN

* arrivals this week
* transport method
* pickup person
* approved candidates without logistics

## SUPERADMIN

* active intermediaries
* candidates per intermediary
* stuck candidates
* expiring documents

---

# FINAL VALIDATION

Run:

```bash
npm install
npx prisma generate
npm run build
```

Fix all errors.

---

# OUTPUT FORMAT

Return:

1. Summary of implemented changes
2. Full list of modified files
3. Migration notes
4. Any remaining blockers
5. Confirmation of build status

Do not return snippets only. Return complete files when modifying code.
