# Despliegue en Produccion - Folga Hub

Este proyecto puede desplegarse en Docker o en cualquier plataforma compatible con Next.js 16.

## Opcion 1: Docker

El repositorio incluye `Dockerfile` y `docker-compose.yml`.

1. Configura un archivo `.env` con las variables de produccion.
2. Construye y levanta los servicios:

```bash
docker compose up -d --build
```

3. Ejecuta las migraciones en el contenedor web:

```bash
docker compose exec web npx prisma migrate deploy
```

4. Verifica salud basica:

```bash
curl http://localhost:3000/api/health
```

## Opcion 2: VPS o servidor manual

1. Instala Node.js 20+.
2. Instala dependencias:

```bash
npm ci
```

3. Genera Prisma Client:

```bash
npx prisma generate
```

4. Ejecuta migraciones:

```bash
npx prisma migrate deploy
```

5. Construye la aplicacion:

```bash
npm run build
```

6. Inicia el servidor:

```bash
npm run start:prod
```

## Notas operativas

- Desarrollo usa `.next-dev`.
- Produccion usa `.next-prod`.
- Evita `prisma db push` en produccion salvo una intervencion controlada y excepcional.
- Configura SSL delante de la aplicacion si la expones publicamente.
- Usa una base de datos PostgreSQL gestionada o un backup verificado antes de cada despliegue.
- Para enviar invitaciones reales configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` y `SMTP_FROM_NAME`. Si SMTP no esta configurado, la app crea el usuario y muestra una contrasena temporal para entrega manual.
