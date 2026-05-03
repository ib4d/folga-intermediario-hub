# Despliegue en Producción - Folga Hub

Este proyecto está preparado para ser desplegado usando Docker o cualquier plataforma compatible con Next.js (como Vercel).

## Opción 1: Docker (Recomendado)

El proyecto incluye un `Dockerfile` multietapa y un `docker-compose.yml`.

1. **Configurar el entorno:**
   Asegúrate de tener un archivo `.env` con las variables de producción.

2. **Construir y levantar:**
   ```bash
   docker-compose up -d --build
   ```

3. **Ejecutar migraciones en el contenedor:**
   ```bash
   docker-compose exec web npx prisma db push
   ```

## Opción 2: Despliegue Manual (VPS)

1. **Instalar Node.js 20+ y PM2.**
2. **Construir la aplicación:**
   ```bash
   npm ci
   npx prisma generate
   npm run build
   ```
3. **Iniciar con PM2:**
   ```bash
   pm2 start npm --name "folga-hub" -- run start:prod
   ```

## Consideraciones de Producción
- Usa una base de datos PostgreSQL gestionada (RDS, Supabase DB).
- Configura un certificado SSL (Nginx Reverse Proxy + Certbot).
- Establece `NODE_ENV=production`.
