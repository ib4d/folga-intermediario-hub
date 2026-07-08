# Broker Module Technical Notes

## Scope

This module adds a dedicated operational layer for:

- broker lead ingestion
- broker consolidation
- contact timeline
- worker referrals
- monthly broker invoicing
- broker-facing operational dashboards

It is intentionally separate from the existing `User` role
`INTERMEDIARIO`.

The current system already uses `INTERMEDIARIO` as an access/ownership role
inside the candidate pipeline.

The new Broker module models commercial and billing entities.

## Modeling decisions

### 1. Broker vs BrokerLead

- `BrokerLead` represents imported rows from `POŚREDNICY LATAM`
- `Broker` represents a consolidated real intermediary after validation or
  explicit promotion

This prevents automatic over-merging of raw leads into real brokers.

### 2. Contact attempts

The Excel has three fixed contact columns.

The database does not.

Instead, the importer converts:

- `DATA KONTAKT 1` + `KONTAKT`
- `DATA KONTAKT 2` + `KONTAKT2`
- `DATA KONTAKT 3` + `KONTAKT3`

into separate `BrokerContactAttempt` records.

That keeps the timeline extensible and queryable.

### 3. WorkerReferral vs BrokerInvoiceLine

- `WorkerReferral` is the worker/candidate-level operational record
- `BrokerInvoiceLine` is the invoice detail line

This split allows one referral to be used across invoice context while keeping
invoice detail traceable to one imported row.

### 4. Tenant scoping

All Broker models are scoped by `organizationId`.

This keeps the module aligned with the existing multi-tenant architecture.

## Import rules

## Leads import

The lead importer uses `GWATEMALA` as the schema baseline.

The current importer keeps:

- `FLOW_STATUS`
- `FLOW_SENT_DATE`
- `EMAIL_STATUS`
- `DELIVERY_ERROR`
- `LEAD_TYPE`
- `LAST_REPLY_DATE`

It also normalizes:

- email to lowercase
- phone by removing `p:` and spacing noise
- status into raw + normalized representations

Idempotency is handled through:

- `organizationId`
- `sourceCountrySheet`
- `sourceRowHash`

This allows safe re-import without duplicating the same lead row.

## Invoice import

The invoice importer reads all detailed sheets except `RESUMEN_FV`.

For each detail sheet it extracts:

- broker/intermediary
- reference period
- invoice type
- rate per person
- threshold
- worker detail rows

`RESUMEN_FV` is used as a cross-check layer, not as the main source of truth.

## How GWATEMALA acts as schema base

The importer expects the operational columns found in `GWATEMALA`:

- `DATA LEADu`
- `IMIĘ`
- `NAZWISKO`
- `MAIL`
- `NUMER TELEFONU`
- `MIASTO`
- `ILE OSÓB JESTEŚ W STANIE DOSTARCZYĆ`
- `STATUS`
- `DATA KONTAKT 1`
- `KONTAKT`
- `DATA KONTAKT 2`
- `KONTAKT2`
- `DATA KONTAKT 3`
- `KONTAKT3`
- `FLOW_STATUS`
- `FLOW_SENT_DATE`
- `EMAIL_STATUS`
- `DELIVERY_ERROR`
- `LEAD_TYPE`
- `LAST_REPLY_DATE`

Other country sheets can later be adapted toward this shape.

## 100h vs 200h resolution

The module does not hardcode one global threshold.

Instead:

- the importer reads threshold from `TIPO DE FV` when possible
- if needed, it also inspects the detail header (`MIN 100H?` / `MIN 200H?`)
- the inferred value is stored at invoice level and line/referral level

Eligibility is then derived as:

- `hoursWorked >= minimumHoursThreshold`

If threshold cannot be inferred safely, the importer stores a warning on the
invoice.

## Summary mismatch handling

If `RESUMEN_FV` totals differ from imported detail totals, the importer stores:

- summary totals
- a mismatch warning on `BrokerInvoice`

This preserves traceability instead of silently hiding divergence.

## Current flow

The current modeled flow is:

`BrokerLead -> Broker -> WorkerReferral -> BrokerInvoice -> BrokerInvoiceLine`

Operationally:

1. import raw broker leads
2. validate and promote real brokers
3. import billing detail
4. connect workers/referrals to brokers
5. inspect monthly invoice detail and summary warning state

## Current UI surface

Implemented routes:

- `/brokers`
- `/brokers/leads`
- `/brokers/leads/[id]`
- `/brokers/[id]`
- `/broker-invoices`
- `/broker-invoices/[id]`
- `/broker-dashboard`

These screens are intentionally operational first, not polished marketing UI.
