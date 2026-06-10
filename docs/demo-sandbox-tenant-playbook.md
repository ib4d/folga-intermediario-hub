# Demo Sandbox Tenant Playbook

This playbook explains how to create and use a clean demo/sandbox tenant for
ORI CRUIT HUB without mixing it with real production operations.

## What already exists in the product

The public onboarding flow already supports a demo workspace mode through
`createOrganizationAction` in
`src/app/actions/organization.ts`.

When the onboarding form sends `mode=demo`, the app creates:

- a fresh organization
- the current user as `SUPERADMIN`
- three sample candidates across different statuses
- legal/logistics progression history
- sample notifications
- one sample logistics arrival

This means the product already has a built-in demo bootstrap path.

## Recommended use

Use the sandbox tenant for:

- commercial demos
- partner walkthroughs
- operator training
- UI screenshots and guided recordings

Do not use it for:

- real candidate data
- real legal review work
- production automation experiments with customer expectations attached

## Clean creation flow

### Option A: create from the public onboarding

This is the preferred path because it exercises the real product experience.

1. Open the public onboarding flow.
2. Choose the sandbox/demo mode.
3. Create a clearly named organization such as:
   - `ORI Demo June`
   - `Sandbox Sales Poland`
   - `Partner Walkthrough Demo`
4. Let the app redirect into the dashboard.
5. Verify the seeded records exist in:
   - Dashboard
   - Candidates
   - Legal
   - Logistics
   - Notifications

### Option B: controlled first bootstrap seed

Use only when intentionally bootstrapping a fresh environment and not for
routine demo resets.

The Prisma seed already contains demo-like baseline users and records, but it is
guarded in production for safety.

## Naming convention

To avoid confusion, use all three of these:

- organization name contains `Demo` or `Sandbox`
- non-real email addresses only
- internal note that the tenant is not for live operations

Recommended examples:

- `ORI Demo Iberia`
- `Sandbox - Partner Review`
- `Sales Demo - Q3`

## Pre-demo checklist

Before showing the sandbox:

- verify you are inside the demo organization, not a live one
- confirm candidate names are fictitious/sample-safe
- confirm notifications look fresh enough for the walkthrough
- confirm `/api/health` and monitoring still pass in production
- confirm the release shown in Platform/Admin matches current deploy

## Reset strategy

Current product state:

- there is a built-in create-demo flow
- there is not yet a first-class “reset this demo tenant” operator button

Current recommended reset:

1. Create a new sandbox organization through onboarding.
2. Use that fresh tenant for the next demo cycle.
3. Delete the old sandbox tenant data manually only when you are sure it is no
   longer needed.

This is safer than trying to recycle a messy tenant during a live presentation.

## Suggested operator routine

For each important demo cycle:

1. create a fresh sandbox
2. verify seeded data appears correctly
3. take screenshots or rehearse the flow
4. keep one primary demo tenant per audience or campaign
5. retire stale demo tenants deliberately

## Known gaps

Still open if we want this to feel fully productized:

- explicit “Reset demo tenant” action
- richer seeded document examples
- seeded verified/unverified document mix
- seeded billing pressure example on demand
- seeded expiring-document example on demand

## Current status

`Operationally ready for guided demos, with manual reset discipline.`
