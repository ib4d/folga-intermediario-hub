# Lightweight Monitoring

This is the minimal monitoring baseline for the current production stage. The
goal is not a full observability stack yet; it is fast confirmation that the
public app is alive, the providers are visible, and the runtime still has the
critical wiring expected in production.

## What it checks

`npm run check:monitoring` verifies:

- public health endpoint reachability
- database connection status
- runtime release/version metadata
- provider visibility for storage and OCR
- whether cron is configured in the live runtime
- whether SMTP is configured in the live runtime

It does **not** call the protected cron endpoints because those routes create
real operational side effects.

## Local or container usage

From the repo root:

```bash
npm run check:monitoring
```

The script resolves its base URL in this order:

1. `MONITORING_BASE_URL`
2. `AUTH_URL`
3. `NEXTAUTH_URL`
4. `http://127.0.0.1:3000`

## Recommended VPS usage

Inside the running production container:

```bash
cd /opt/folga-intermediario-hub
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
```

## Optional VPS cron

If you want a lightweight recurring heartbeat log on the VPS, add a cron line
like this:

```cron
*/15 * * * * cd /opt/folga-intermediario-hub && docker compose -f docker-compose.prod.yml exec -T web npm run check:monitoring >> /var/log/ori-cruit-hub-monitoring.log 2>&1
```

This is intentionally simple. It gives you a repeatable signal and a log trail
without introducing Grafana, Prometheus, or external services yet.

## Suggested next step after this baseline

Pair this script with one external monitor that checks:

- `https://app.ori-craftlabs.com/api/health`
- TLS certificate validity
- response time / uptime

That external check plus the internal script is enough for the current stage.

## External monitor setup

Use the operator setup here:

- [External Monitoring Setup](./external-monitoring-setup.md)
