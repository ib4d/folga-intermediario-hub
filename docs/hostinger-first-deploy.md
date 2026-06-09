# Primer despliegue en Hostinger - ORI CRUIT HUB

Este documento usa los valores ya elegidos para la primera salida:

- Dominio: `app.ori-craftlabs.com`
- VPS IP: `82.29.178.113`
- SSH user: `root`

## 1. Verifica el DNS

En Hostinger debe quedar solo un registro:

```text
Type: A
Name: app
Points to: 82.29.178.113
TTL: 14400 o default
```

No dejes registros `A` duplicados para `app`.

## 2. Entra al VPS

Desde tu ordenador:

```bash
ssh root@82.29.178.113
```

## 3. Instala lo basico si falta

```bash
apt update
apt install -y ca-certificates curl git nginx
curl -fsSL https://get.docker.com | sh
```

Comprueba Docker:

```bash
docker --version
docker compose version
```

## 4. Clona el proyecto

```bash
cd /opt
git clone https://github.com/ib4d/folga-intermediario-hub.git
cd folga-intermediario-hub
```

## 5. Crea el .env de produccion

En tu maquina local ya existe un archivo de referencia:

- `.env.production`

Abre ese archivo, copia su contenido, y pegalo en el VPS asi:

```bash
nano .env
```

Pega el contenido, guarda con `Ctrl+O`, pulsa `Enter`, y sal con `Ctrl+X`.

Si quieres que `/api/health` y Platform Admin muestren una release legible,
agrega tambien una linea como esta dentro de `.env`:

```bash
APP_RELEASE=main-2026-06-09
```

## 6. Levanta la app

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

Comprueba estado:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 web
curl http://127.0.0.1:3000/api/health
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
```

## 7. Configura Nginx

Crea este archivo:

```bash
nano /etc/nginx/sites-available/ori-cruit-hub
```

Pega esto:

```nginx
server {
    listen 80;
    server_name app.ori-craftlabs.com;

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

Activalo:

```bash
ln -s /etc/nginx/sites-available/ori-cruit-hub /etc/nginx/sites-enabled/ori-cruit-hub
nginx -t
systemctl reload nginx
```

## 8. Emite SSL

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d app.ori-craftlabs.com
```

## 9. Comprueba la version publica

```bash
curl https://app.ori-craftlabs.com/api/health
docker compose -f docker-compose.prod.yml exec web npm run check:smoke
```

Luego revisa en navegador:

- `/`
- `/login`
- `/dashboard`
- `/candidatos`
- `/documentos`
- `/legal`
- `/logistica`

## 10. Programa el cron

```bash
crontab -e
```

Agrega esto en el mismo archivo:

```cron
15 7 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://app.ori-craftlabs.com/api/cron/check-expiring >/dev/null
30 7 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://app.ori-craftlabs.com/api/cron/check-billing >/dev/null
```

Sustituye `YOUR_CRON_SECRET` por el mismo valor real que tengas en `CRON_SECRET`
dentro del `.env` del VPS. No lo guardes en el repositorio.

## 11. Firewall en Hostinger

Deja abiertos solo:

```text
22/tcp
80/tcp
443/tcp
```

No abras `3000` ni `5432`.
