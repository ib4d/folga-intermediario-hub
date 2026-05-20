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

OCR_PROVIDER=azure
AZURE_DI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DI_KEY=your-azure-key

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
sudo apt install -y ca-certificates curl git nginx
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in after adding the Docker group.

Clone the repo:

```bash
git clone https://github.com/ib4d/folga-intermediario-hub.git
cd folga-intermediario-hub
```

Create `.env` from the production values above.

Build and start:

```bash
docker compose -f docker-compose.prod.yml up -d --build
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
docker compose -f docker-compose.prod.yml logs --tail=100 web
docker compose -f docker-compose.prod.yml exec web npx prisma migrate status
docker compose -f docker-compose.prod.yml ps
```

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

## Update flow

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
docker compose -f docker-compose.prod.yml logs --tail=100 web
```

## Backup note

Before production changes that affect data:

```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

Restore into the same database only during a planned recovery window:

```bash
chmod +x scripts/restore-db.sh
./scripts/restore-db.sh backups/oricruithub-folga_hub-YYYYMMDD-HHMMSS.sql.gz
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

## Hostinger firewall

In hPanel, keep the VPS firewall narrow for the v1 deployment:

```text
22/tcp  SSH
80/tcp  HTTP for Certbot redirect
443/tcp HTTPS
```

Do not expose `3000` or `5432` publicly. The app listens on
`127.0.0.1:3000`, and PostgreSQL is reachable only inside Docker.
