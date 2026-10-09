# Despliegue en produccion - ORI CRUIT HUB

Este proyecto esta preparado para desplegarse en un VPS con Docker Compose.
La ruta recomendada para Hostinger es:

- Docker Compose para `web` + PostgreSQL.
- Nginx o Caddy como reverse proxy HTTPS.
- La aplicacion escuchando solo en `127.0.0.1:3000`.
- Migraciones con `prisma migrate deploy`, nunca `db push` ni reset en produccion.

## Variables necesarias

Crea un `.env` de produccion en el VPS con estos valores:

```bash
DB_USER=folga
DB_PASSWORD=use-a-long-random-password
DB_NAME=folga_hub

AUTH_URL=https://your-domain.example
AUTH_SECRET=use-a-long-random-secret
NEXTAUTH_URL=https://your-domain.example
NEXTAUTH_SECRET=use-the-same-value-as-auth-secret

STORAGE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=documentos-candidatos

# If Supabase Storage is unavailable, you can keep uploads alive on the VPS:
# STORAGE_PROVIDER=local
# LOCAL_STORAGE_DIR=/app/public/uploads

OCR_PROVIDER=tesseract
AZURE_DI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DI_KEY=your-azure-key

# OCR_PROVIDER=tesseract does not require the Azure values above.

EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=no-reply@your-domain.example
SMTP_FROM_NAME=ORI CRUIT HUB
SMTP_ALLOW_INSECURE=false

# Optional until SaaS distribution billing is enabled.
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CUSTOMER_PORTAL_URL=
STRIPE_PAYMENT_LINK_STARTER=
STRIPE_PAYMENT_LINK_PRO=
STRIPE_PAYMENT_LINK_BUSINESS=
STRIPE_PAYMENT_LINK_ENTERPRISE=

CRON_SECRET=use-a-long-random-secret
JOB_PROVIDER=inline
NODE_ENV=production

# Copy these two values from the `release.env` artifact attached to a successful
# Quality run on main. Keep them together when promoting to staging or production.
WEB_IMAGE=ghcr.io/ib4d/folga-intermediario-hub@sha256:replace-with-workflow-digest
APP_RELEASE=replace-with-the-matching-40-character-commit-sha

# Only set this for an intentional first production bootstrap.
ALLOW_DEMO_SEED=false
SEED_ADMIN_EMAIL=admin@your-domain.example
SEED_LEGAL_EMAIL=legal@your-domain.example
SEED_INTERMEDIARY_EMAIL=intermediary@your-domain.example
SEED_ADMIN_PASSWORD=use-a-long-random-first-login-password
```

## Hostinger VPS setup

Use Ubuntu 24.04 LTS.

```bash
sudo apt update
sudo apt install -y ca-certificates curl nginx
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in after adding the Docker group.

Clone the repo for the Compose file, environment, and operational scripts:

```bash
git clone https://github.com/ib4d/folga-intermediario-hub.git
cd folga-intermediario-hub
```

Create `.env` from the production values above. Obtain `WEB_IMAGE` and
`APP_RELEASE` together from the `release.env` artifact of the successful
GitHub Actions `Quality` run for the commit being promoted; do not substitute a
tag or choose a digest from another run.

The GHCR package is private. On the VPS, log in once using a GitHub account
that can read the package and a classic personal access token with only
`read:packages`. Keep the token out of `.env` and shell history; enter it at the
password prompt:

```bash
read -rsp 'GitHub token: ' GHCR_READ_TOKEN; echo
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io --username YOUR_GITHUB_USERNAME --password-stdin
unset GHCR_READ_TOKEN
```

Pull and start the selected image:

```bash
docker compose -f docker-compose.prod.yml pull web
docker compose -f docker-compose.prod.yml up -d --no-build
```

The web container runs a production environment preflight before starting.
If a required value is missing or still looks like a placeholder, inspect:

```bash
docker compose -f docker-compose.prod.yml logs web
```

Run migrations:

```bash
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

Seed only once for the first environment. Production seed is blocked by default
to avoid creating public demo credentials. For an intentional first bootstrap,
temporarily set `ALLOW_DEMO_SEED=true` and provide a strong
`SEED_ADMIN_PASSWORD`, then run:

```bash
docker compose -f docker-compose.prod.yml exec web npx prisma db seed
```

Check health:

```bash
curl http://127.0.0.1:3000/api/health
```

## Nginx reverse proxy

Create `/etc/nginx/sites-available/ori-cruit-hub`:

```nginx
server {
    listen 80;
    server_name your-domain.example;

    client_max_body_size 60M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/ori-cruit-hub /etc/nginx/sites-enabled/ori-cruit-hub
sudo nginx -t
sudo systemctl reload nginx
```

Then add HTTPS with Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
```

## DNS

Point your domain or subdomain to the VPS IPv4:

```text
Type: A
Name: app or @
Value: 82.29.178.113
TTL: default
```

## Production checks

Run these after deploy:

```bash
curl https://your-domain.example/api/health
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
docker compose -f docker-compose.prod.yml exec web npm run check:monitoring
docker compose -f docker-compose.prod.yml logs --tail=100 web
docker compose -f docker-compose.prod.yml exec web npx prisma migrate status
docker compose -f docker-compose.prod.yml ps
```

If you use the recommended deploy helper, `/api/health` and Platform Admin will
expose the release that was packaged into the deployed build. `APP_RELEASE`
should be treated as an override or compatibility fallback, not the primary
source of truth.

Manual browser checks:

- `/`
- `/login`
- `/dashboard`
- `/candidatos`
- `/documentos`
- `/legal`
- `/logistica`
- Upload OCR batch.
- Toggle 400 PLN payment on a candidate.
- Invite a user and confirm SMTP behavior.

## Current OCR note

As of the current production track:

- upload flow is stable in production
- local VPS-backed storage is stable in production
- document review and manual save path are stable in production
- OCR field extraction on some noisy passport scans is still an active tuning
  area

This means the document pipeline is operational, but a public or high-stakes
demo should still include manual review for OCR-populated passport fields until
that tuning stage is explicitly closed.

For repeatable SMTP validation during operations, you can set:

```bash
SMTP_TEST_RECIPIENT=your-email@example.com
```

Then either run:

```bash
docker compose -f docker-compose.prod.yml exec web npm run check:smtp
```

or continue passing an explicit recipient:

```bash
docker compose -f docker-compose.prod.yml exec web npm run check:smtp -- your-email@example.com
```

## Promote the same image between environments

Every successful `Quality` run on `main` publishes one production image tagged
with its full commit SHA and retains a `release.env` manifest containing the
immutable `ghcr.io/...@sha256:...` reference and matching `APP_RELEASE`. Pull
that manifest from the run, then use the exact same two values in staging and
production `.env` files. The digest, rather than the descriptive tag, identifies
the artifact. Pull requests build and validate an image but do not publish one.

To promote a release, update `WEB_IMAGE` and `APP_RELEASE` together in the
target environment's `.env`, then run the helper below. It pulls the digest,
checks the image's embedded source revision against `APP_RELEASE`, and starts
that already-built image without rebuilding it. To roll back, restore the
previous pair from that environment's release manifest and run the helper
again.

## Recommended VPS deploy helper

Use the bundled deploy helper on the VPS host to deploy the selected immutable
image:

```bash
cd /opt/folga-intermediario-hub
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh
```

What it does:

- pulls exactly `WEB_IMAGE` from the paired release manifest
- rejects an image whose embedded commit does not match `APP_RELEASE`
- records the deployed revision in `.release`
- restarts the web container without rebuilding or following a mutable tag
- runs `npx prisma migrate deploy`
- runs `npm run check:monitoring`
- runs `npm run check:release`
- calls `/api/health` when `AUTH_URL` is set

This is the preferred production deploy path for the Hostinger VPS.

## Quick post-deploy release verification

If you want one direct confirmation after the deploy finishes:

```bash
cd /opt/folga-intermediario-hub
docker compose -f docker-compose.prod.yml exec web npm run check:release
```

It verifies that:

- runtime `APP_RELEASE` matches the expected deployed release
- `/api/health` is still returning `status=ok`
- the database is still connected

## Backup note

Before production changes that affect data:

```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

By default the backup lands in `/var/backups/ori-cruit-hub` on the VPS.

Restore into the same database only during a planned recovery window:

```bash
chmod +x scripts/restore-db.sh
./scripts/restore-db.sh backups/oricruithub-folga_hub-YYYYMMDD-HHMMSS.sql.gz
```

To verify recovery safely against a temporary database on the VPS host:

```bash
./scripts/check-restore.mjs
```

To include the restore drill in the hardening gate:

```bash
CHECK_HARDENING_RUN_RESTORE=true npm run check:hardening
```

## Cron for expiring documents

The cron route is protected by `CRON_SECRET`. Add a daily VPS cron entry after
the domain is live:

```bash
crontab -e
```

```cron
15 7 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.example/api/cron/check-expiring >/dev/null
```

Check it manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.example/api/cron/check-expiring
```

## Cron for billing automation

The billing cron syncs subscription attention and plan pressure into
notifications, and it also emits billing automation events for workflows.
Keep it on the same secret-protected pattern:

```bash
crontab -e
```

```cron
30 7 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.example/api/cron/check-billing >/dev/null
```

Check it manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.example/api/cron/check-billing
```

## Hostinger firewall

In hPanel, keep the VPS firewall narrow for the v1 deployment:

```text
22/tcp  SSH
80/tcp  HTTP for Certbot redirect
443/tcp HTTPS
```

Do not expose `3000` or `5432` publicly. The app listens on
`127.0.0.1:3000`, and PostgreSQL is reachable only inside Docker.
