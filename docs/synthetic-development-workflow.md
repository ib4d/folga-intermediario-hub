# Local synthetic workspace for development

## Goal and isolation

`docker-compose.synthetic.yml` starts a separate copy of the current app with:

- its own PostgreSQL database and named database volume;
- its own private-document directory inside the synthetic app container;
- its own Docker bridge network, separate from production;
- host ports bound to `127.0.0.1` only (`3301` for the app and `55432` for PostgreSQL);
- no production `.env`, Supabase, Stripe, SMTP, or Azure credentials.

It does not add synthetic rows to the production database or production app. The app runs on the developer machine; it can use local CPU and memory while open, but it does not add work to the published app. OCR is set to manual so exploratory sessions do not consume OCR resources. The container uses the same Dockerfile/build path as production. The synthetic container has outbound network access because Docker's `internal: true` mode prevents the published host port from being reachable in this Docker Desktop setup. It has no production service credentials, and the app's external integrations are disabled or configured with dummy local values.

## Start

From the repository root in PowerShell:

```powershell
docker compose -f docker-compose.synthetic.yml up --build -d
docker compose -f docker-compose.synthetic.yml logs -f synthetic-web
```

Wait for migrations, the synthetic seed, and the app health check. Open `http://localhost:3301`.

Synthetic login accounts:

| Role | Email |
| --- | --- |
| Tenant admin | `admin@synthetic.example.invalid` |
| Intermediary | `operator@synthetic.example.invalid` |
| Legal | `legal@synthetic.example.invalid` |
| Logistics | `logistics@synthetic.example.invalid` |

The local-only password is set in the Compose file. It is intentionally not a production credential. Change it there before sharing the local workspace with another developer.

## Isolated P4-04 acceptance workspace

Use [`docker-compose.p4-04-isolated.yml`](../docker-compose.p4-04-isolated.yml)
when the persistent development database must not be used for an acceptance
case. This stack has a separate PostgreSQL volume, upload volume, network, and
Mailpit inbox. It binds only to loopback: web `33301`, PostgreSQL `55499`, and
Mailpit `18099`. Start it from the repository root with:

```powershell
docker compose -f docker-compose.p4-04-isolated.yml up --build -d
```

Open `http://localhost:33301`; use the same conspicuously synthetic accounts
and password documented above. The guarded seed creates only marked synthetic
organizations, users, and candidate fixtures. Keep acceptance messages and
records in this stack; do not copy them to the persistent development
workspace or production.

## What is seeded

The guarded seed creates the `ori-synthetic-lab` organization, those four role accounts, their `Membership` rows, and four conspicuously synthetic candidate records representing different workflow states. It does not create documents or copy data from production. Uploaded documents are written to the container's temporary private directory; they disappear when that app container is recreated.

The isolated P4-04 database also includes migration
`20261018120000_backfill_legacy_memberships`. It backfills users linked to an
existing organization who have no `Membership` rows, preserving their role and
active state while skipping platform administrators. It does not add a second
organization membership to users who already have any membership. The migration
was applied and checked only in the isolated acceptance database during this
run; production rollout remains a separate release step.

`prisma/seed-synthetic.mjs` refuses to run unless the synthetic marker, `APP_RELEASE=synthetic-local`, and the exact synthetic Compose database host/name are present. It is copied only into the separate `synthetic-runner` image target; the ordinary production runner does not contain the seed script. `bcryptjs` is copied into that synthetic-only target because the seed hashes local demo passwords. Do not weaken this guard or point it at another database. `prisma/seed.ts` remains the separate legacy seed and is not used here.

## Simulated prospect workflows

The seed also creates ten isolated prospect tenants based on the research in
[`pilot-prospect-candidates.md`](pilot-prospect-candidates.md). Each tenant name
starts with `SIMULATED PROSPECT` and includes `NOT AFFILIATED`; these labels are
for internal workflow modeling and do not imply a relationship with the named
organization. Every user is a fictional role persona rather than an employee
identity, has a `synthetic.example.invalid` email, and is assigned only an app
role. The five personas per tenant cover manager, recruiter, broker/intermediary,
legal review, and logistics. Each tenant has one synthetic candidate to exercise
a different workflow state. No real person data, candidate documents, or company
accounts are imported.

The current seed creates 11 synthetic tenants in total (the lab plus ten
simulated prospects), 54 users, 54 initial user-to-tenant memberships, and 14 candidates. The ten prospect tenants use
the slug prefix `sim-p`; their user addresses follow
`<tenant-slug>-<role>@synthetic.example.invalid`. Because all fixtures use
deterministic IDs, slugs, and addresses with `upsert`, rerunning the guarded
seed updates the same synthetic records rather than multiplying them.

## Stop and remove the synthetic data

Stop the local workspace:

```powershell
docker compose -p ori-cruit-hub-synthetic -f docker-compose.synthetic.yml down --volumes --remove-orphans
```

This removes only the Compose project and named volumes declared in `docker-compose.synthetic.yml`. It does not remove production data. Re-running `up` builds a fresh isolated dataset.

## Moving toward customer pilots

Keep synthetic development, guided-demo data, and real customer data in separate organizations and environments. Retire the synthetic workspace and create a new customer organization after that customer's scope, authorization, legal terms, and data handling are approved. Do not convert synthetic records into real candidate records or copy real candidate data into the synthetic workspace.

Real-data pilot onboarding remains gated on P4-03/P4-04 and the privacy/recovery criteria in [pilot readiness](pilot-readiness-final-checklist.md). Use [P3-05's synthetic acceptance flow](p3-05-flow-acceptance.md) when a workflow needs a deliberately fake document placeholder.
