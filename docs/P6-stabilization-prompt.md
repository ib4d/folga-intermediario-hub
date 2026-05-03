# ANTIGRAVITY PROMPT — FOLGA HUB PHASE P6

## Automation Engine + AI Agents + Revenue Machine

You are a senior AI systems architect + growth automation expert.

Project:
https://github.com/a-bol3/folga-intermediario-hub

Assume P0–P5 are complete:

* SaaS multi-tenant works
* Product is sellable
* Landing + outreach assets exist
* Core ATS + OCR + Legal + Logistics works

---

# 🎯 OBJECTIVE

Transform Folga Hub into:

👉 **An intelligent recruitment automation platform**

NOT just an ATS.

This phase introduces:

1. Automation workflows (n8n-like inside app)
2. AI agents (OCR + classification + messaging)
3. Sales automation layer (lead → outreach → conversion)
4. Smart notifications & triggers
5. Data intelligence (insights + recommendations)

---

# P6.1 — AUTOMATION ENGINE (CORE)

## Goal

Create a lightweight internal automation system.

Like:
👉 n8n / Zapier (but embedded)

---

## Create models:

```prisma
model Workflow {
  id             String @id @default(cuid())
  organizationId String
  name           String
  isActive       Boolean @default(true)
  triggerType    String
  createdAt      DateTime @default(now())

  steps          WorkflowStep[]
}

model WorkflowStep {
  id         String @id @default(cuid())
  workflowId String
  type       String
  config     Json
  order      Int
}
```

---

## Trigger types:

```txt
CANDIDATE_CREATED
REGISTRATION_COMPLETED
DOCUMENT_UPLOADED
OCR_COMPLETED
STATUS_CHANGED
LOGISTICS_CREATED
```

---

## Step types:

```txt
SEND_NOTIFICATION
SEND_EMAIL
UPDATE_CANDIDATE
CREATE_TASK
WAIT
CONDITION
WEBHOOK_CALL
```

---

## Create engine:

```txt
src/lib/automation/engine.ts
```

Functions:

```ts
executeWorkflows(triggerType, payload)
executeStep(step, payload)
```

---

## Integrate triggers into:

* candidate creation
* registration submit
* document upload
* OCR complete
* status change
* logistics creation

---

# P6.2 — AI OCR AGENT (SMART LAYER)

## Goal

Make OCR smarter using post-processing.

---

## Create:

```txt
src/lib/ai/ocr-agent.ts
```

Functions:

```ts
enhanceOcrData(ocrData)
detectDocumentType(ocrData)
validateOcrData(ocrData)
```

---

## Capabilities:

* detect missing fields
* correct common OCR errors
* normalize names (uppercase/lowercase)
* infer country from document
* flag suspicious data

---

## Output:

```ts
{
  cleanedData,
  confidenceScore,
  warnings,
  suggestedUpdates
}
```

---

# P6.3 — AI CANDIDATE SCORING

## Goal

Automatically evaluate candidates.

---

## Create:

```txt
src/lib/ai/candidate-scoring.ts
```

Function:

```ts
scoreCandidate(candidate)
```

---

## Factors:

* documents completeness
* passport validity
* legal readiness
* payment status
* data consistency

---

## Output:

```ts
{
  score: number (0–100),
  level: "LOW" | "MEDIUM" | "HIGH",
  flags: string[]
}
```

---

## Store in Candidate:

```prisma
score Int?
scoreLevel String?
scoreUpdatedAt DateTime?
```

---

# P6.4 — SMART NOTIFICATIONS

## Goal

Upgrade notifications → intelligence layer

---

## Create:

```txt
src/lib/notifications/smart.ts
```

---

## Examples:

* “5 candidates stuck in RECOPILANDO_DOCS > 7 days”
* “3 passports expiring soon”
* “2 approved candidates without logistics”
* “Payment missing for 4 candidates”

---

## Trigger daily summary:

```txt
DAILY_SUMMARY
```

---

# P6.5 — SALES AUTOMATION MODULE

## Goal

Use your own tool to generate revenue.

---

## Create models:

```prisma
model Lead {
  id             String @id @default(cuid())
  organizationId String
  name           String
  email          String?
  company        String?
  status         String
  source         String
  createdAt      DateTime @default(now())
}

model Outreach {
  id        String @id @default(cuid())
  leadId    String
  step      Int
  message   String
  sentAt    DateTime?
  reply     String?
}
```

---

## Create pages:

```txt
/app/leads
/app/outreach
```

---

## Features:

* add leads manually
* import leads
* send outreach emails
* track replies
* mark status

---

# P6.6 — EMAIL AUTOMATION

## Goal

Integrate outbound email system.

---

## Create:

```txt
src/lib/email/sender.ts
```

Use:

* SMTP
* or Gmail API

---

## Add templates:

```txt
src/lib/email/templates/
```

Examples:

* cold outreach
* follow-up
* demo invite
* onboarding

---

# P6.7 — AI COPY GENERATOR

## Goal

Generate outreach messages automatically.

---

## Create:

```txt
src/lib/ai/copy-generator.ts
```

Function:

```ts
generateOutreachMessage(lead)
```

---

## Inputs:

* company type
* country
* pain points

---

## Output:

* personalized message
* subject line
* CTA

---

# P6.8 — DASHBOARD INTELLIGENCE

## Goal

Upgrade dashboard → decision center

---

## Add:

* candidate pipeline insights
* stuck candidates alerts
* performance per intermediary
* conversion rates

---

# P6.9 — WEBHOOK SYSTEM

## Goal

Allow integrations

---

## Create:

```txt
/api/webhooks
```

Trigger events:

* candidate created
* status changed
* document uploaded

---

# P6.10 — FINAL VALIDATION

System is successful when:

* workflows trigger automatically
* AI improves OCR output
* candidates get scored
* notifications become actionable
* leads can be managed
* outreach can be sent
* system can generate its own clients

---

# OUTPUT FORMAT

Return:

1. Summary of automation system
2. All new models
3. Core engine code
4. AI modules
5. Sales module structure
6. Email system
7. Remaining limitations

Return FULL FILES when modifying.
