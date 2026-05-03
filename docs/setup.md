# Configuración Local - Folga Hub

Guía para desarrolladores que desean ejecutar el proyecto localmente.

## Requisitos
- Node.js 20+
- PostgreSQL (Local o Supabase)
- Cuenta de Supabase (para Storage)
- Cuenta de Azure (para Document Intelligence)

## Pasos Iniciales

1. **Clonar el repositorio:**
   ```bash
   git clone <repo-url>
   cd folga-intermediario-hub
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env` y completa los valores.
   ```bash
   cp .env.example .env
   ```

4. **Preparar la base de datos:**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

## Credenciales de Semilla (Seed)
Si ejecutaste `npx prisma db seed`, puedes entrar con:
- **Email:** admin@folga.pl
- **Password:** password123 (Rol: SUPERADMIN)
- **Email:** legal@folga.pl
- **Password:** password123 (Rol: LEGAL)
- **Email:** intermediario@folga.pl
- **Password:** password123 (Rol: INTERMEDIARIO)
