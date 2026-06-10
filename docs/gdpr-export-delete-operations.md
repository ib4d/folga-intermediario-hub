# GDPR Export/Delete Operations

This runbook defines the current operating procedure for GDPR-style export,
deletion, and anonymization requests in ORI CRUIT HUB.

It is intentionally practical: who can do what, which built-in flows already
exist, and which requests still require a manual operator decision.

## Current capability snapshot

### Export

- Candidate exports are available from the app and from
  `/api/exports/candidates`.
- Export requests require an authenticated session and role-based access.
- Export downloads are now audited with action `CANDIDATES_EXPORTED`.
- Export responses are marked `Cache-Control: no-store`.

### Delete

- Candidate deletion is implemented in `deleteCandidate` and
  `deleteCandidatesBulk`.
- Deletion removes:
  - candidate record
  - related documents
  - logistics events
  - status history
  - candidate references from notifications
  - stored files through the active storage provider cleanup path
- Candidate deletion is audited with action `CANDIDATE_DELETED`.

### Password change

- Password changes are available through `/api/settings/password`.
- Successful password changes are audited with action `PASSWORD_CHANGED`.
- Password change responses are marked `Cache-Control: no-store`.

### Anonymization

- There is a helper at `src/lib/security/gdpr.ts` for anonymization logic.
- It is not yet exposed as a first-class operator workflow in the UI.
- Use anonymization only when legal/operational policy prefers retention of
  workflow traces over full hard deletion.

## Recommended request handling

### 1. Right of access / data export

Use when a customer or operator needs a copy of candidate data.

Current procedure:

1. Confirm the request belongs to the correct organization and subject.
2. Export the relevant candidate dataset from the app.
3. Deliver the file through an approved business channel.
4. Confirm an audit record exists for the export event.

Operational note:

- Today the product exports organization-scoped datasets, not a polished
  one-click “single data subject bundle”.
- For a narrow legal request, filter the dataset before delivery and document
  the scope used.

## 2. Right to erasure / full delete

Use when retention is no longer required and the business decision is to remove
the candidate operationally.

Current procedure:

1. Confirm the deletion request is approved by the organization owner or
   authorized operator.
2. Export the candidate data first if a legal/business archive is required.
3. Delete the candidate from the app.
4. Confirm related documents disappear from the candidate and document views.
5. Confirm the `CANDIDATE_DELETED` audit entry exists.

Important behavior:

- Stored files are also removed through the configured storage provider cleanup
  path.
- Notifications are detached from the candidate instead of being deleted
  outright, preserving operational history without the subject link.

## 3. Restricted retention / anonymization

Use when the organization must preserve evidence of a workflow but should no
longer retain directly identifying personal data.

Current procedure:

1. Pause and validate that anonymization is preferred over deletion.
2. Use the helper logic in `src/lib/security/gdpr.ts` as the baseline.
3. Record the operator decision in the audit trail or ticketing system.
4. Verify identifying fields are replaced and the record is archived.

Current limitation:

- This is not yet exposed as an operator button or audited workflow.
- Treat anonymization as a controlled engineering-assisted operation until a UI
  flow is added.

## Verification checklist

After any GDPR-style request, verify:

- the actor had the correct tenant/role scope
- the export or delete action succeeded in the app
- the resulting state is visible in the UI
- the relevant audit entry exists
- no secret or exported file was left in casual chat/log paste material

## What still remains open

These are the remaining gaps before calling this area fully productized:

- first-class UI workflow for anonymization
- single-subject export package instead of broader dataset export
- explicit operator checklist inside the app for GDPR request handling
- retention automation tied to policy states and approval rules

## Current status

`Operationally usable, partially productized.`
