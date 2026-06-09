# ANTIGRAVITY MASTER PROMPT — Folga Intermediario Hub v1.0
## Instrucciones de ejecución por capas (Crítico → Menos Crítico)

> **IMPORTANTE PARA ANTIGRAVITY:** Ejecuta este prompt en el orden exacto de las capas. No avances a la siguiente capa hasta completar y verificar cada ítem de la actual. Al terminar cada capa, confirma con un resumen de lo ejecutado. El repositorio es: `https://github.com/a-bol3/folga-intermediario-hub`

---

## CONTEXTO DEL PROYECTO

Eres un experto arquitecto full-stack con +20 años de experiencia. Estás trabajando en **Folga Intermediario Hub**, una aplicación de gestión de reclutamiento internacional para la empresa FOLGA Sp. z o.o. en Polonia. La app gestiona el pipeline de candidatos latinoamericanos (Colombia, Perú, Guatemala, Venezuela, Cuba) coordinados por intermediarios. El tech stack es:

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **DB/ORM:** PostgreSQL + Prisma 5
- **Storage + Auth Backend:** Supabase
- **Auth Framework:** NextAuth v5 (Auth.js) — a instalar
- **Styling:** Tailwind v4 + CSS custom (Neobrutalist: negroazabache + amber + ghost-white, zero border-radius)
- **OCR:** Azure Document Intelligence (ya configurado en .env)
- **Idioma principal de la app:** Español

El archivo `.env` ya existe con estas variables (NO regenerar, usar las existentes):
```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
SUPABASE_STORAGE_BUCKET=
AZURE_DI_ENDPOINT=
AZURE_DI_KEY=
```

---

## 🔴 CAPA 1 — FUNDACIÓN CRÍTICA (Bloqueantes de producción)

### 1.1 — Corregir versión de lucide-react

En `package.json`, la versión `"lucide-react": "^1.14.0"` es incorrecta (no existe v1.x). Corregirla a:

```json
"lucide-react": "^0.469.0"
```

Luego ejecutar: `npm install`

---

### 1.2 — Crear `.env.example`

Crear en la raíz del proyecto el archivo `.env.example` con todas las variables (sin valores reales):

```env
# Base de datos PostgreSQL (Supabase connection string)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Supabase (cliente público)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Supabase (servidor)
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=documentos-candidatos

# NextAuth
NEXTAUTH_SECRET=  # genera con: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Azure Document Intelligence (OCR)
AZURE_DI_ENDPOINT=https://[RESOURCE].cognitiveservices.azure.com/
AZURE_DI_KEY=
```

---

### 1.3 — Instalar dependencias críticas faltantes

Ejecutar:
```bash
npm install next-auth@beta zod react-hook-form @hookform/resolvers bcryptjs
npm install --save-dev @types/bcryptjs
```

---

### 1.4 — Configurar NextAuth v5 completo

#### 1.4.1 — Crear `src/auth.ts`

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

#### 1.4.2 — Crear `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

#### 1.4.3 — Crear `middleware.ts` en la raíz del proyecto

```typescript
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/registro") ||
    req.nextUrl.pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

#### 1.4.4 — Extender tipos de NextAuth en `src/types/next-auth.d.ts`

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}
```

---

### 1.5 — Actualizar schema Prisma con todos los campos requeridos

Reemplazar completamente `prisma/schema.prisma` con el siguiente schema expandido:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPERADMIN
  ADMIN
  INTERMEDIARIO
  LEGAL
}

enum CandidateStatus {
  RECOPILANDO_DOCS
  EN_REVISION_LEGAL
  APROBADO
  RECHAZADO
  CONTRATADO
  EN_PROCESO_PERMISO
}

enum LocationStatus {
  EN_POLONIA
  EN_ORIGEN
  EN_TRANSITO
}

enum TransportType {
  AVION
  TREN
  COCHE_EMPRESA
  PROPIO
}

enum DocumentType {
  PASSPORT
  PESEL
  KARTA_POBYTU
  VISA
  VOIVODATO_DECISION
  PAYMENT_RECEIPT
  ENTRY_STAMP
  EXIT_STAMP
  OTHER
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  phone        String?
  role         Role     @default(INTERMEDIARIO)
  passwordHash String
  isActive     Boolean  @default(true)
  region       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  candidates   Candidate[]
  notifications Notification[]
}

model Candidate {
  id              String          @id @default(cuid())
  
  // Datos personales (de formulario de registro)
  firstName       String
  lastName        String
  email           String?
  phone           String?
  gender          String?
  dateOfBirth     DateTime?
  birthPlace      String?
  birthCountry    String?
  citizenship     String?
  nationality     String?
  heightCm        Int?
  
  // Datos de localización y país
  country         String
  locationStatus  LocationStatus  @default(EN_ORIGEN)
  
  // Datos de contacto en Polonia
  polishAddress   String?
  polishCity      String?
  
  // Documentos migratorios clave (resumen rápido)
  passportNumber  String?
  passportExpiry  DateTime?
  peselNumber     String?
  voivodatoNumber String?          // número de caso cuando no hay decisión
  
  // Estado del pipeline
  status          CandidateStatus @default(RECOPILANDO_DOCS)
  rejectionReason String?          // razón estructurada de rechazo legal
  notes           String?
  
  // Pago 400 PLN
  paid400pln      Boolean         @default(false)
  paymentDate     DateTime?
  
  // Relaciones
  intermediaryId  String
  intermediary    User            @relation(fields: [intermediaryId], references: [id])
  documents       Document[]
  logistics       LogisticsEvent[]
  notifications   Notification[]

  // Formulario autoregistro (raw data del candidato)
  selfRegistered  Boolean         @default(false)
  registrationToken String?       @unique  // token único para URL de registro

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model Document {
  id            String       @id @default(cuid())
  type          DocumentType
  number        String?
  issuerCountry String?
  url           String        // Supabase storage URL
  extractedData Json?         // Para datos de OCR (Azure DI)
  expiryDate    DateTime?
  isVerified    Boolean       @default(false)
  verifiedById  String?
  
  candidateId   String
  candidate     Candidate     @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model LogisticsEvent {
  id             String        @id @default(cuid())
  candidateId    String
  candidate      Candidate     @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  transportType  TransportType
  arrivalDate    DateTime
  terminal       String?       // Aeropuerto Varsovia / Estación Kutno / etc.
  flightOrTrain  String?       // número de vuelo o tren
  pickedUpBy     String?       // quién recoge
  notes          String?
  confirmed      Boolean       @default(false)

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  candidateId String?
  candidate   Candidate? @relation(fields: [candidateId], references: [id])
  
  type        String   // DOC_EXPIRING | STATUS_CHANGED | PAYMENT_PENDING | NEW_CANDIDATE
  message     String
  isRead      Boolean  @default(false)
  
  createdAt   DateTime @default(now())
}
```

Luego ejecutar:
```bash
npx prisma migrate dev --name "expand_schema_v2"
npx prisma generate
```

---

### 1.6 — Crear página `/login`

Crear `src/app/login/page.tsx` con formulario de login en español, diseño Neobrutalist consistente con el CSS existente (amber-flame, pitch-black, ghost-white, zero border-radius, box-shadow offset), con campos email + contraseña + botón "Entrar". Usar `signIn` de NextAuth. Mostrar error en español si las credenciales son inválidas: *"Correo o contraseña incorrectos"*.

---

### 1.7 — Crear script de seed con usuario SUPERADMIN

Crear `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("folga2024admin", 12);
  
  await prisma.user.upsert({
    where: { email: "admin@folga.com" },
    update: {},
    create: {
      email: "admin@folga.com",
      name: "Administrador Principal",
      role: "SUPERADMIN",
      passwordHash,
    },
  });
  
  console.log("✅ Seed ejecutado. Usuario: admin@folga.com / folga2024admin");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Agregar en `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Ejecutar: `npx prisma db seed`

---

### 1.8 — Agregar `loading.tsx` y `error.tsx` en cada ruta

Crear los siguientes archivos con skeleton/neobrutalist para cada segmento de ruta: `src/app/candidatos/`, `src/app/documentos/`, `src/app/logistica/`, `src/app/legal/`, `src/app/ajustes/`.

**Template `loading.tsx`** (adaptar el texto por módulo):
```tsx
export default function Loading() {
  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="skeleton" style={{ height: "120px", width: "100%" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: "140px" }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: "300px", width: "100%" }} />
    </div>
  );
}
```

Agregar en `globals.css` la clase `.skeleton`:
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--white-smoke) 25%, #e8e8e8 50%, var(--white-smoke) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

**Template `error.tsx`** (adaptar por módulo):
```tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <div className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
        <h2>⚠️ Error al cargar</h2>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>{error.message}</p>
        <button className="button" onClick={reset}>Reintentar</button>
      </div>
    </div>
  );
}
```

---

## 🟠 CAPA 2 — NÚCLEO FUNCIONAL

### 2.1 — Dashboard con datos reales

Convertir `src/app/page.tsx` a async Server Component que ejecute estas queries paralelas usando la sesión del usuario autenticado para filtrar por rol:

```typescript
const session = await auth();
// Si INTERMEDIARIO, filtrar por intermediaryId = session.user.id
// Si ADMIN/SUPERADMIN/LEGAL, ver todos

const [total, recopilando, enRevision, aprobados, recientes] = await Promise.all([
  prisma.candidate.count(whereClause),
  prisma.candidate.count({ where: { ...whereClause, status: "RECOPILANDO_DOCS" } }),
  prisma.candidate.count({ where: { ...whereClause, status: "EN_REVISION_LEGAL" } }),
  prisma.candidate.count({ where: { ...whereClause, status: "APROBADO" } }),
  prisma.candidate.findMany({
    where: whereClause,
    take: 10,
    orderBy: { updatedAt: "desc" },
    include: { intermediary: { select: { name: true } } },
  }),
]);
```

---

### 2.2 — CRUD completo de candidatos con Zod

#### 2.2.1 — Instalar Zod si no está:
```bash
npm install zod
```

#### 2.2.2 — Crear `src/lib/validations/candidate.ts`:

```typescript
import { z } from "zod";

export const candidateSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres").max(100),
  lastName: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.enum(["Colombia", "Perú", "Guatemala", "Venezuela", "Cuba", "Otro"]),
  locationStatus: z.enum(["EN_POLONIA", "EN_ORIGEN", "EN_TRANSITO"]).default("EN_ORIGEN"),
  passportNumber: z.string().optional(),
  peselNumber: z.string().optional(),
  voivodatoNumber: z.string().optional(),
  notes: z.string().optional(),
});
```

#### 2.2.3 — Refactorizar `src/app/actions/candidates.ts`:

Reemplazar el código existente con:
```typescript
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCandidate(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const raw = Object.fromEntries(formData.entries());
  const parsed = candidateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.candidate.create({
    data: {
      ...parsed.data,
      intermediaryId: session.user.id,
      status: "RECOPILANDO_DOCS",
    },
  });

  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string,
  rejectionReason?: string
) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
  // Solo LEGAL, ADMIN, SUPERADMIN pueden cambiar estado
  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    throw new Error("Sin permisos");
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: status as never, rejectionReason: rejectionReason ?? null },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
}
```

---

### 2.3 — Upload de documentos a Supabase Storage

Crear `src/app/actions/documents.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadDocument(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const file = formData.get("file") as File;
  const candidateId = formData.get("candidateId") as string;
  const docType = formData.get("type") as string;
  const docNumber = formData.get("number") as string | null;
  const expiryDateStr = formData.get("expiryDate") as string | null;
  const issuerCountry = formData.get("issuerCountry") as string | null;

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documentos-candidatos";
  const filePath = `${candidateId}/${docType}_${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Error de subida: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

  await prisma.document.create({
    data: {
      type: docType as never,
      number: docNumber || null,
      url: publicUrl,
      issuerCountry: issuerCountry || null,
      expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
      candidateId,
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  return { success: true };
}
```

---

### 2.4 — Util de autorización por roles

Crear `src/lib/auth-utils.ts`:

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type AppRole = "SUPERADMIN" | "ADMIN" | "INTERMEDIARIO" | "LEGAL";

export async function requireSession() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const session = await requireSession();
  if (!allowedRoles.includes(session.user.role as AppRole)) {
    redirect("/sin-permisos");
  }
  return session;
}
```

Usar en todas las pages y actions. Ejemplo en `/ajustes/page.tsx`:
```typescript
const session = await requireRole(["SUPERADMIN", "ADMIN"]);
```

---

## 🟡 CAPA 3 — MÓDULOS DE NEGOCIO

### 3.1 — Módulo Legal completo (`/legal/page.tsx`)

La página debe:
- Mostrar solo candidatos con `status: "EN_REVISION_LEGAL"`
- Llamar a `requireRole(["LEGAL", "ADMIN", "SUPERADMIN"])`
- Tener botones de "Aprobar" y "Rechazar" con modal de confirmación
- Al rechazar, mostrar campo de texto para `rejectionReason` (obligatorio)
- Las razones de rechazo deben ser un select de opciones predefinidas:
  - Documentos faltantes
  - Documento(s) expirado(s)
  - Historial laboral negativo en FOLGA
  - Documentos ilegibles/inválidos
  - Proceso migratorio incompleto
  - Otro (campo libre)

---

### 3.2 — Módulo Logística completo (`/logistica/page.tsx`)

La página debe:
- Mostrar candidatos con `status: "APROBADO"` o `"EN_PROCESO_PERMISO"` listos para viajar
- Formulario de creación de `LogisticsEvent` con campos:
  - Tipo de transporte (Avión / Tren / Coche empresa / Cuenta propia)
  - Fecha y hora de llegada
  - Terminal/Estación (dropdown: Aeropuerto Varsovia Chopin, Aeropuerto Katowice, Estación Łódź, Estación Kutno, Otro)
  - Número de vuelo/tren (opcional)
  - Responsable de recogida
  - Notas
- Vista de calendario semanal de llegadas próximas

---

### 3.3 — Sistema de notificaciones

Crear `src/app/actions/notifications.ts` con función `createNotification(userId, type, message, candidateId?)`.

Disparar notificaciones en:
- Cambio de estado de candidato → notificar al intermediario asignado
- Documento próximo a expirar (< 30 días) → notificar ADMIN
- Aprobación legal → notificar intermediario
- Rechazo legal (con razón) → notificar intermediario

Agregar en el `Header.tsx` un ícono de campana con contador de notificaciones no leídas usando polling cada 60s o Supabase Realtime.

---

### 3.4 — Alertas de expiración de documentos

Crear `src/app/api/cron/check-expiring/route.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Verificar secret de cron por header Authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDocs = await prisma.document.findMany({
    where: {
      expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
      isVerified: true,
    },
    include: { candidate: { include: { intermediary: true } } },
  });

  for (const doc of expiringDocs) {
    await prisma.notification.create({
      data: {
        userId: doc.candidate.intermediaryId,
        candidateId: doc.candidateId,
        type: "DOC_EXPIRING",
        message: `⚠️ Documento ${doc.type} de ${doc.candidate.firstName} ${doc.candidate.lastName} expira el ${doc.expiryDate?.toLocaleDateString("es-ES")}`,
      },
    });
  }

  return NextResponse.json({ checked: expiringDocs.length });
}
```

Configurar en `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/check-expiring", "headers": { "Authorization": "Bearer TU_CRON_SECRET" }, "schedule": "0 8 * * *" }]
}
```

Agregar `CRON_SECRET` al `.env`.

---

## 🟢 CAPA 4 — FORMULARIO DE AUTOREGISTRO DEL CANDIDATO

### 4.1 — Ruta pública de registro

Esta ruta NO requiere autenticación. Un intermediario comparte el link con el candidato:
`https://app.folga.com/registro/[token]`

El `[token]` es el `registrationToken` del candidato (UUID), que el intermediario genera desde la lista de candidatos.

---

### 4.2 — Schema Zod completo del formulario (8 secciones basadas en Google Forms)

Crear `src/lib/validations/candidate-registration.ts`:

```typescript
import { z } from "zod";

// ============================
// PÁGINA 1 — DATOS PERSONALES
// ============================
export const page1Schema = z.object({
  email: z.string().email("Email inválido"),
  firstName: z.string().min(2, "Campo obligatorio"),       // Nombre/s completo/s (imię)
  gender: z.enum(["Masculino", "Femenino", "Prefiero no decirlo"]),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d)), "Fecha inválida"),
  birthPlace: z.string().min(2, "Campo obligatorio"),      // Lugar de nacimiento
  birthCountry: z.string().min(2, "Campo obligatorio"),    // País de nacimiento
  citizenship: z.string().min(2, "Campo obligatorio"),     // Ciudadanía
  nationality: z.string().min(2, "Campo obligatorio"),     // Nacionalidad
  heightCm: z.coerce.number().min(100).max(250),           // Altura en cm
});

// ============================
// PÁGINA 2 — CONTACTO
// (inferido del contexto — completar con campos reales del forms)
// ============================
export const page2Schema = z.object({
  phone: z.string().min(7, "Teléfono inválido"),
  whatsapp: z.string().optional(),
  country: z.enum([
    "Colombia", "Perú", "Guatemala", "Venezuela", "Cuba",
    "Bolivia", "Ecuador", "Brasil", "México", "Argentina", "Otro",
  ]),
  currentCity: z.string().min(2),
  polishAddress: z.string().optional(),
  polishCity: z.string().optional(),
  locationStatus: z.enum(["EN_POLONIA", "EN_ORIGEN", "EN_TRANSITO"]),
});

// ============================
// PÁGINA 3 — DATOS PASAPORTE
// ============================
export const page3Schema = z.object({
  passportNumber: z.string().min(5, "Número de pasaporte requerido"),
  passportCountry: z.string().min(2),
  passportIssueDate: z.string().optional(),
  passportExpiry: z.string().refine((d) => !isNaN(Date.parse(d)), "Fecha inválida"),
  passportHasVisa: z.enum(["Sí", "No"]),
});

// ============================
// PÁGINA 4 — DOCUMENTOS POLACOS (si aplica)
// ============================
export const page4Schema = z.object({
  hasPesel: z.enum(["Sí", "No"]),
  peselNumber: z.string().optional(),
  hasKartaPobytu: z.enum(["Sí", "No"]),
  kartaPobytuExpiry: z.string().optional(),
  hasVoivodatoDecision: z.enum(["Sí", "No", "En proceso"]),
  voivodatoNumber: z.string().optional(),  // número de caso si está en proceso
  voivodatoDecisionDate: z.string().optional(),
});

// ============================
// PÁGINA 5 — HISTORIAL LABORAL
// ============================
export const page5Schema = z.object({
  hasWorkedForFolga: z.enum(["Sí", "No"]),
  previousFolgaDate: z.string().optional(),
  currentOccupation: z.string().optional(),
  workExperience: z.string().optional(),
});

// ============================
// PÁGINA 6 — DISPONIBILIDAD Y LOGÍSTICA
// ============================
export const page6Schema = z.object({
  availableFrom: z.string().optional(),
  travelMethod: z.enum(["Avión", "Tren", "Coche propio", "Otro"]).optional(),
  needsAccommodation: z.enum(["Sí", "No"]).optional(),
  canTravelToKutno: z.enum(["Sí", "No", "Necesito apoyo"]),
});

// ============================
// PÁGINA 7 — PAGO 400 PLN
// ============================
export const page7Schema = z.object({
  understands400pln: z.literal("Sí", {
    errorMap: () => ({ message: "Debes confirmar el pago para continuar" }),
  }),
  paymentMethod: z.enum(["Transferencia bancaria", "Efectivo en oficina", "Por confirmar"]).optional(),
});

// ============================
// PÁGINA 8 — CONSENTIMIENTO GDPR / RODO
// ============================
export const page8Schema = z.object({
  gdprConsent: z.literal("true", {
    errorMap: () => ({ message: "Debes aceptar el tratamiento de datos para continuar" }),
  }),
  dataAccuracy: z.literal("true", {
    errorMap: () => ({ message: "Debes confirmar la veracidad de los datos" }),
  }),
});

// Schema completo
export const fullRegistrationSchema = page1Schema
  .merge(page2Schema)
  .merge(page3Schema)
  .merge(page4Schema)
  .merge(page5Schema)
  .merge(page6Schema)
  .merge(page7Schema)
  .merge(page8Schema);
```

---

### 4.3 — Componente de formulario multi-paso

Crear `src/app/registro/[token]/page.tsx` como componente cliente con:

- 8 pasos mapeados a las 8 páginas del Google Forms original
- Barra de progreso visual: **Paso X de 8**
- Navegación "Anterior" / "Siguiente" con validación por paso antes de avanzar
- Cada página valida solo su sub-schema antes de habilitar "Siguiente"
- En el último paso, botón "Enviar Solicitud"
- Tras envío exitoso: pantalla de confirmación con mensaje *"Tu solicitud ha sido recibida. El equipo de FOLGA se pondrá en contacto contigo."*
- Diseño mobile-first, Neobrutalist (consistente con el resto de la app)
- En mobile: formulario a pantalla completa, navegación en la parte inferior

---

### 4.4 — Server Action de registro público

Crear `src/app/actions/public-registration.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { fullRegistrationSchema } from "@/lib/validations/candidate-registration";

export async function submitCandidateRegistration(token: string, data: unknown) {
  const parsed = fullRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { registrationToken: token },
  });

  if (!candidate) return { error: { _global: ["Token inválido o expirado"] } };
  if (candidate.selfRegistered) return { error: { _global: ["Este formulario ya fue completado"] } };

  const d = parsed.data;
  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      email: d.email,
      firstName: d.firstName,
      gender: d.gender,
      dateOfBirth: new Date(d.dateOfBirth),
      birthPlace: d.birthPlace,
      birthCountry: d.birthCountry,
      citizenship: d.citizenship,
      nationality: d.nationality,
      heightCm: d.heightCm,
      phone: d.phone,
      country: d.country,
      locationStatus: d.locationStatus as never,
      polishAddress: d.polishAddress || null,
      polishCity: d.polishCity || null,
      passportNumber: d.passportNumber,
      passportExpiry: d.passportExpiry ? new Date(d.passportExpiry) : null,
      peselNumber: d.peselNumber || null,
      voivodatoNumber: d.voivodatoNumber || null,
      selfRegistered: true,
      registrationToken: null, // invalidar token tras uso
    },
  });

  // Notificar al intermediario
  await prisma.notification.create({
    data: {
      userId: candidate.intermediaryId,
      candidateId: candidate.id,
      type: "NEW_CANDIDATE",
      message: `✅ ${d.firstName} completó su formulario de registro. Revisar perfil.`,
    },
  });

  return { success: true };
}
```

---

### 4.5 — Generar token de registro desde panel del intermediario

En `src/app/candidatos/page.tsx`, agregar botón **"Generar Link de Registro"** por cada candidato que no haya completado el autoregistro. Al presionar, genera un UUID, lo guarda en `registrationToken` y copia al clipboard la URL completa: `https://[NEXTAUTH_URL]/registro/[token]`.

---

## 🔵 CAPA 5 — OCR CON AZURE DOCUMENT INTELLIGENCE

### 5.1 — Servicio OCR

Instalar:
```bash
npm install @azure/ai-form-recognizer
```

Crear `src/lib/ocr.ts`:

```typescript
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

const client = new DocumentAnalysisClient(
  process.env.AZURE_DI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_DI_KEY!)
);

export async function analyzePassport(imageUrl: string) {
  const poller = await client.beginAnalyzeDocumentFromUrl(
    "prebuilt-idDocument",  // Modelo prebuilt de Azure para documentos de identidad
    imageUrl
  );
  const result = await poller.pollUntilDone();
  return result.documents?.[0]?.fields ?? null;
}
```

### 5.2 — Integrar OCR en el upload de documentos

En `src/app/actions/documents.ts`, tras crear el registro del documento en Prisma, si el tipo es `PASSPORT` o `KARTA_POBYTU`:

```typescript
import { analyzePassport } from "@/lib/ocr";

// Después del prisma.document.create():
if (["PASSPORT", "KARTA_POBYTU"].includes(docType)) {
  const ocrData = await analyzePassport(publicUrl);
  if (ocrData) {
    await prisma.document.update({
      where: { id: newDoc.id },
      data: { extractedData: ocrData as object },
    });
    
    // Auto-completar campos del candidato con datos del OCR
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        passportNumber: (ocrData["DocumentNumber"]?.value as string) ?? undefined,
        passportExpiry: ocrData["DateOfExpiration"]?.value 
          ? new Date(ocrData["DateOfExpiration"].value as string) 
          : undefined,
        dateOfBirth: ocrData["DateOfBirth"]?.value
          ? new Date(ocrData["DateOfBirth"].value as string)
          : undefined,
      },
    });
  }
}
```

---

## ⚪ CAPA 6 — EXPORTACIÓN Y REPORTES

### 6.1 — Exportación Excel/CSV

Instalar:
```bash
npm install xlsx
```

Crear `src/app/actions/exports.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function exportCandidatesExcel(statusFilter?: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const candidates = await prisma.candidate.findMany({
    where: statusFilter ? { status: statusFilter as never } : {},
    include: { intermediary: { select: { name: true } }, documents: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = candidates.map((c) => ({
    "Nombre": `${c.firstName} ${c.lastName}`,
    "Email": c.email ?? "",
    "Teléfono": c.phone ?? "",
    "País": c.country,
    "Estado": c.status,
    "Intermediario": c.intermediary.name,
    "Pasaporte": c.passportNumber ?? "",
    "Vence Pasaporte": c.passportExpiry?.toLocaleDateString("es-ES") ?? "",
    "PESEL": c.peselNumber ?? "",
    "Voivodato": c.voivodatoNumber ?? "",
    "Pagó 400 PLN": c.paid400pln ? "Sí" : "No",
    "Ubicación": c.locationStatus,
    "Registrado": c.createdAt.toLocaleDateString("es-ES"),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Candidatos");
  
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}
```

### 6.2 — Reportes visuales en el dashboard

Instalar:
```bash
npm install recharts
```

Agregar al dashboard principal 3 gráficas:
1. **Donut chart** — distribución de candidatos por estado (`CandidateStatus`)
2. **Bar chart** — candidatos por país (Colombia, Perú, Guatemala, Venezuela, Cuba)
3. **Line chart** — nuevos candidatos por semana (últimas 8 semanas)

---

## ⚫ CAPA 7 — PWA Y RESPONSIVE MOBILE

### 7.1 — Mobile sidebar → bottom navigation

Agregar en `globals.css`:
```css
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background-color: var(--ghost-white);
    border-top: 2px solid var(--pitch-black);
    height: 64px;
  }
  .main-content {
    padding-bottom: 80px; /* espacio para bottom nav */
  }
}
@media (min-width: 769px) {
  .bottom-nav { display: none; }
}
```

Crear `src/components/BottomNav.tsx` con los 5 módulos principales como íconos de navegación:
Dashboard | Candidatos | Documentos | Legal | Logística

### 7.2 — PWA manifest y service worker

Crear `public/manifest.json`:
```json
{
  "name": "Folga Hub",
  "short_name": "FolgaHub",
  "description": "Gestión de intermediarios de reclutamiento FOLGA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fbf9ff",
  "theme_color": "#fcba04",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Agregar en `src/app/layout.tsx`:
```typescript
export const metadata = {
  manifest: "/manifest.json",
  themeColor: "#fcba04",
};
```

---

## ✅ CAPA 8 — TESTING Y PREPARACIÓN PARA DISTRIBUCIÓN

### 8.1 — Setup Vitest

```bash
npm install --save-dev vitest @vitejs/plugin-react
```

Crear `vitest.config.ts` y tests unitarios para:
- `src/app/actions/candidates.ts` → test `createCandidate` (mock prisma)
- `src/lib/validations/candidate.ts` → test schema Zod (casos válidos e inválidos)
- `src/app/actions/documents.ts` → test `uploadDocument` (mock supabase)
- `src/app/actions/public-registration.ts` → test token inválido, token ya usado, registro exitoso

### 8.2 — Audit de seguridad pre-distribución

Verificar los siguientes puntos antes del deploy:

1. **Supabase Storage RLS:** En el dashboard de Supabase, activar Row Level Security en el bucket `documentos-candidatos`. Solo el intermediario asignado al candidato puede leer/escribir sus archivos.

2. **Server Actions protegidas:** Confirmar que TODAS las funciones `"use server"` llaman a `auth()` o `requireSession()` en la primera línea.

3. **No exponer SUPABASE_SERVICE_ROLE_KEY al cliente:** Verificar que esta variable NO tenga el prefijo `NEXT_PUBLIC_`. Si lo tiene, regenerar la key en Supabase dashboard.

4. **Validar NEXTAUTH_SECRET:** Debe tener mínimo 32 caracteres. Generar con: `openssl rand -base64 32`

5. **Rate limiting en login:** Agregar en `src/auth.ts` un máximo de 5 intentos fallidos por IP.

### 8.3 — Deploy en Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Configurar variables de entorno en Vercel Dashboard:
# Settings → Environment Variables → agregar todas las del .env
```

Verificar que el build pase sin errores TypeScript: `npx tsc --noEmit`

---

## NOTAS FINALES PARA ANTIGRAVITY

1. **Mantener el design system Neobrutalist** actual: `--amber-flame`, `--pitch-black`, `--ghost-white`, `border-radius: 0 !important`, `box-shadow: 6px 6px 0px`. No cambiar la estética visual.

2. **Idioma:** Todos los textos de UI, mensajes de error, placeholders, labels y notificaciones deben estar en **español**. Los comentarios en código pueden estar en inglés.

3. **No romper rutas existentes:** Las rutas `/candidatos`, `/documentos`, `/legal`, `/logistica`, `/ajustes` ya existen. Mejorar su contenido sin renombrarlas.

4. **El schema de Zod del formulario de registro (Capa 4)** tiene los campos de la Página 1 extraídos directamente del Google Forms original. Las páginas 2-8 están inferidas del contexto del negocio — si hay campos adicionales en el formulario real, agregar los campos faltantes al schema manteniendo la misma estructura.

5. **Las variables `.env` ya existen**, incluyendo `AZURE_DI_ENDPOINT` y `AZURE_DI_KEY` para OCR. No crear un `.env` desde cero, solo el `.env.example` de referencia.
