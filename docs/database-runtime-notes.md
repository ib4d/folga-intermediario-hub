# Database Runtime Notes

## Current finding

The repository currently supports two local database modes, and they were drifted out of sync:

1. `docker-compose` database
   - Host: `localhost`
   - Port: `5432`
   - Default user: `folga`
   - Default password: `folga123`
   - Database: `folga_hub`

2. Windows PostgreSQL service
   - Host: `localhost`
   - Port: `5433`
   - Credentials are machine-specific
   - Database name must be verified locally

## Why Prisma was failing

The app `.env` pointed Prisma to:

`postgresql://postgres:postgres@localhost:5432/folga_hub?schema=public`

But on this machine:

- the Windows PostgreSQL service is listening on `5433`
- `localhost:5432` is not accepting TCP connections
- the `postgres/postgres` credentials do not authenticate against the Windows service

That means Prisma was failing before it could inspect migration status.

## Recommended local setup

Use one mode consistently:

### Option A: Docker Compose

Use the compose defaults and keep app/database aligned on:

`postgresql://folga:folga123@localhost:5432/folga_hub?schema=public`

### Option B: Windows PostgreSQL service

Set `DATABASE_URL` to the actual service credentials and port:

`postgresql://<user>:<password>@localhost:5433/folga_hub?schema=public`

## Verification checklist

1. Confirm the chosen port answers TCP.
2. Confirm the chosen credentials work with `psql`.
3. Run `npx prisma migrate status`.
4. Run `npm run build`.
