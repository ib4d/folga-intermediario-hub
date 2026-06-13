# External Monitoring Setup

This is the lightweight external monitoring setup recommended for the current
distribution-readiness stage.

The goal is simple:

- confirm the public app is reachable from outside the VPS
- detect hard downtime quickly
- alert an operator without requiring a full observability stack

This document is intentionally provider-agnostic, but it maps cleanly to tools
such as UptimeRobot, Better Stack, Freshping, or any similar uptime service.

## Recommended monitor target

Primary URL:

`https://app.ori-craftlabs.com/api/health`

Expected conditions:

- HTTP status `200`
- response body contains `"status":"ok"`
- TLS certificate is valid

This endpoint is the best public target because it verifies more than plain web
reachability. It also confirms the runtime can still answer with live status.

## Recommended baseline configuration

Create one HTTPS monitor with:

- check interval: `5 minutes`
- timeout: `30 seconds`
- method: `GET`
- expected status: `200`
- optional keyword match: `"status":"ok"`

Recommended alert destinations:

- primary operator email
- one backup operator email

If the service supports escalations, use:

- alert immediately on first failure
- repeat every `15 minutes` until resolved

## Optional secondary monitor

If you want one extra low-noise signal, add:

`https://app.ori-craftlabs.com/login`

Expected conditions:

- HTTP status `200`
- TLS valid

Why:

- `/api/health` confirms runtime health
- `/login` confirms the public UI entry path is still reachable

Do not create many monitors at this stage. Two is enough.

## What not to monitor externally right now

Do not point an external monitor at:

- protected cron routes
- document upload endpoints
- OCR processing endpoints
- destructive admin routes

Those either require secrets or can create operational side effects.

## Internal check to pair with the external monitor

Keep the VPS-side monitoring script as the internal companion check:

```bash
cd /opt/folga-intermediario-hub
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
```

Best current pairing:

- external uptime monitor -> catches public downtime fast
- internal `check:monitoring` -> confirms runtime/provider wiring after deploys

## Test procedure after creating the monitor

After setting it up in the monitoring service:

1. verify the monitor reports `up`
2. verify it shows the correct public URL
3. verify alert recipients are correct
4. note the monitor name in operations docs or team notes

Recommended monitor names:

- `ORI CRUIT HUB - Public Health`
- `ORI CRUIT HUB - Public Login`

## Suggested operator response when an alert fires

Run these on the VPS:

```bash
cd /opt/folga-intermediario-hub
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=120 web
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
docker compose -f docker-compose.prod.yml exec web npm run check:release
```

Then check:

```bash
curl https://app.ori-craftlabs.com/api/health
```

## Current status wording

Use this wording until the external monitor is actually created:

`External monitoring setup is documented and ready to activate.`

Use this wording after the monitor is live:

`A lightweight external uptime monitor is active alongside internal runtime checks.`
