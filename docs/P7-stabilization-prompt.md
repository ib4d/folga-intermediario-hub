# ANTIGRAVITY PROMPT — FOLGA HUB PHASE P7

## Platformization + ORI-OS Layer + Plugin Ecosystem

You are a senior platform architect and AI systems designer.

Project:
https://github.com/a-bol3/folga-intermediario-hub

Assume P0–P6 are complete:

* SaaS works
* Multi-tenant architecture exists
* Automation engine exists
* AI modules exist (OCR + scoring + copy)
* Sales module exists
* Email automation exists

---

# 🎯 OBJECTIVE

Transform Folga Hub into:

👉 A **platform** (not just a SaaS)

Where:

* workflows can be extended
* external systems can connect
* AI agents can operate
* third-party features can plug in
* internal modules behave like micro-products

---

# P7.1 — ORI-OS CORE LAYER

## Goal

Create a unified system layer for:

👉 Data
👉 Automation
👉 AI
👉 Integrations

---

## Create:

```txt
src/core/
```

Modules:

```txt
src/core/context.ts
src/core/events.ts
src/core/registry.ts
src/core/executor.ts
```

---

## Responsibilities:

### context.ts

* unify session, organization, permissions

### events.ts

* central event system
* replace scattered triggers

### registry.ts

* register:

  * workflows
  * plugins
  * agents

### executor.ts

* execute workflows + agents + plugins

---

# P7.2 — EVENT BUS (CRITICAL)

## Goal

Standardize all system events

---

## Create event structure:

```ts
{
  type: "CANDIDATE_CREATED",
  organizationId: "...",
  payload: {...},
  timestamp: ...
}
```

---

## Replace direct calls with:

```ts
emitEvent(event)
```

---

## Events to support:

```txt
CANDIDATE_CREATED
REGISTRATION_COMPLETED
DOCUMENT_UPLOADED
OCR_COMPLETED
STATUS_CHANGED
LOGISTICS_CREATED
LEAD_CREATED
OUTREACH_SENT
REPLY_RECEIVED
```

---

# P7.3 — PLUGIN SYSTEM

## Goal

Allow new features without modifying core code

---

## Create:

```txt
src/plugins/
```

Structure:

```txt
src/plugins/index.ts
src/plugins/types.ts
```

---

## Plugin interface:

```ts
interface Plugin {
  name: string
  onEvent?: (event) => void
  actions?: Record<string, Function>
}
```

---

## Example plugins:

* WhatsApp integration
* HRappka export
* Email parser
* CRM sync

---

# P7.4 — AI AGENT FRAMEWORK

## Goal

Turn AI into active system operators

---

## Create:

```txt
src/agents/
```

Agents:

```txt
ocr-agent
scoring-agent
notification-agent
sales-agent
legal-agent
logistics-agent
```

---

## Agent interface:

```ts
interface Agent {
  name: string
  trigger: string[]
  execute: (event) => Promise<void>
}
```

---

## Example:

Sales agent:

* listens to LEAD_CREATED
* generates outreach
* schedules email

Legal agent:

* listens to DOCUMENT_UPLOADED
* suggests approval readiness

---

# P7.5 — MARKETPLACE STRUCTURE

## Goal

Prepare system for external modules

---

## Create:

```txt
/app/marketplace
```

---

## Features:

* list plugins
* enable/disable plugins
* show installed modules

---

# P7.6 — INTEGRATION LAYER

## Goal

Connect external tools

---

## Create:

```txt
src/integrations/
```

Modules:

```txt
whatsapp.ts
hrappka.ts
email.ts
slack.ts
google-sheets.ts
```

---

## Standard interface:

```ts
connect()
send()
receive()
disconnect()
```

---

# P7.7 — ADVANCED WORKFLOW BUILDER

## Goal

Upgrade automation engine UI

---

## Create:

```txt
/app/automation-builder
```

---

## Features:

* visual flow (nodes)
* drag & drop
* conditions
* branching logic
* delay/wait

---

# P7.8 — KNOWLEDGE SYSTEM

## Goal

Centralize learning & templates

---

## Create:

```txt
/app/knowledge
```

---

## Content:

* legal templates
* recruitment scripts
* onboarding guides
* email templates
* workflows

---

# P7.9 — ANALYTICS ENGINE

## Goal

Real intelligence

---

## Add:

* funnel conversion
* candidate lifecycle time
* rejection reasons analysis
* recruiter performance
* revenue estimation

---

# P7.10 — PLATFORM API

## Goal

Expose system externally

---

## Create:

```txt
/api/v2/
```

---

## Features:

* full CRUD
* event subscription
* webhook triggers
* API key scopes

---

# P7.11 — FINAL VALIDATION

Platform is complete when:

* events drive the system
* agents act automatically
* plugins can extend functionality
* workflows are visual and flexible
* external tools can connect
* analytics provide insights

---

# OUTPUT FORMAT

Return:

1. Platform architecture summary
2. Event system implementation
3. Plugin system
4. Agent system
5. Integration layer
6. Marketplace structure
7. Limitations
8. Next evolution suggestions

Return FULL FILES when modifying.
