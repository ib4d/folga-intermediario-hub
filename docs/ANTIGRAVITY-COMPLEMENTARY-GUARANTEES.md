# Folga Intermediario Hub — Documento Complementario de Garantías
## Guía de calidad, criterios de verificación y restricciones para Antigravity

> Este documento es **complementario** al prompt principal `ANTIGRAVITY-MASTER-PROMPT.md`.
> Léelo completamente antes de ejecutar cualquier capa.
> Su propósito es cerrar ambigüedades, establecer criterios de aceptación concretos
> y proteger la arquitectura del ecosistema ORI del que este hub forma parte.

---

## PARTE 1 — ALINEACIÓN 1:1 CON EL GOOGLE FORM

### Instrucción obligatoria antes de implementar CAPA 4

El formulario de autoregistro del candidato DEBE mapear exactamente el Google Form
original disponible en: https://forms.gle/bCaZqaAey3gksejS8

Antes de finalizar cualquier código del formulario multi-paso, ejecuta este proceso:

**Paso A — Inventario del form real:**
Abre el Google Form y construye una tabla de inventario con estas columnas:

| # Página | # Pregunta | Texto de la pregunta | Tipo de campo | Obligatorio (S/N) | Opciones (si aplica) |
|----------|------------|----------------------|---------------|-------------------|----------------------|

**Paso B — Verificación de cobertura:**
Por cada fila de la tabla anterior, confirma que existe:
1. Un campo en el schema Zod correspondiente (`src/lib/validations/candidate-registration.ts`)
2. Un campo en el modelo Prisma `Candidate` o almacenado en `Json?` si es dato secundario
3. Un input en el componente de UI del paso correspondiente

**Paso C — Corrección antes de avanzar:**
Si detectas preguntas del form sin campo en el schema, o campos en el schema
sin pregunta en el form, corrígelos ANTES de avanzar.
No dejes discrepancias pendientes con comentarios `// TODO`.

**Reglas de mapeo de tipos:**

| Tipo en Google Forms        | Tipo en Zod                        | Input en UI               |
|-----------------------------|------------------------------------|---------------------------|
| Texto corto                 | `z.string()`                       | `<input type="text">`     |
| Texto largo                 | `z.string()`                       | `<textarea>`              |
| Opción múltiple (radio)     | `z.enum([...opciones])`            | `<select>` o radio group  |
| Casillas (checkbox)         | `z.array(z.enum([...]))`           | checkbox group            |
| Fecha                       | `z.string() + refine(Date.parse)`  | `<input type="date">`     |
| Número                      | `z.coerce.number()`                | `<input type="number">`   |
| Email                       | `z.string().email()`               | `<input type="email">`    |
| Pregunta obligatoria        | sin `.optional()`                  | atributo `required`       |

---

## PARTE 2 — ESTRATEGIA DE MIGRACIONES SEGURAS

### Política de migraciones no destructivas

Dado que el schema actual ya tiene datos de candidatos de prueba/staging,
TODAS las migraciones deben seguir estas reglas sin excepción:

**Regla 1 — Nunca eliminar columnas en la misma migración que las crea:**
Si necesitas renombrar una columna, usa este proceso de 3 pasos en migraciones separadas:
1. Migración A: Agregar la columna nueva con valor por defecto
2. Script manual: Copiar datos de columna vieja a nueva
3. Migración B: Eliminar columna vieja (solo cuando los datos estén migrados)

**Regla 2 — Valores por defecto seguros para cada nuevo campo:**
Usa exactamente estos valores por defecto al agregar campos al modelo `Candidate`:
```prisma
locationStatus  LocationStatus  @default(EN_ORIGEN)
status          CandidateStatus @default(RECOPILANDO_DOCS)
paid400pln      Boolean         @default(false)
selfRegistered  Boolean         @default(false)
isActive        Boolean         @default(true)   // en User
```

**Regla 3 — Campos opcionales como nullable:**
Todo campo nuevo que no tenga valor en registros existentes DEBE ser `String?`,
`DateTime?`, etc. (nullable en Prisma). Nunca añadir campos `String` sin default
a tablas con datos existentes — Prisma lanzará error de migración.

**Regla 4 — Backup antes de cada migración:**
Antes de ejecutar `npx prisma migrate dev`, incluir en el comentario de la
migración generada el comando exacto para revertirla:
```sql
-- Migración: expand_schema_v2
-- Para revertir: DROP COLUMN IF EXISTS location_status, voivodato_number, ...
-- Backup: supabase db dump -f backup_pre_v2_$(date +%Y%m%d).sql
```

**Regla 5 — No cambiar nombres de enums existentes:**
Los enums `CandidateStatus`, `Role`, `DocumentType` ya existen.
Si necesitas añadir valores nuevos, AGREGA valores, no modifiques los existentes.
Cambiar un valor de enum en PostgreSQL requiere recrear la columna.

---

## PARTE 3 — TEST DEL FLUJO CRÍTICO COMPLETO

### Criterio de aceptación principal

La app NO está lista para distribución hasta que el siguiente flujo
se pueda completar de principio a fin sin errores, en un navegador real,
desde cero (BD limpia con solo el seed):
FLUJO PRINCIPAL — "Candidato desde cero hasta contratado"

SUPERADMIN hace login en /login con credenciales del seed

SUPERADMIN crea un usuario INTERMEDIARIO desde /ajustes/usuarios

SUPERADMIN cierra sesión

INTERMEDIARIO hace login

INTERMEDIARIO crea candidato "cascarón" (solo nombre + país)

INTERMEDIARIO genera link de registro /registro/[token]

Abrir link en pestaña privada (sin sesión) — simula el candidato

Candidato completa los 8 pasos del formulario

Candidato ve pantalla de confirmación exitosa

INTERMEDIARIO recibe notificación "completó su formulario"

INTERMEDIARIO sube pasaporte a Supabase Storage desde /candidatos/[id]

INTERMEDIARIO cambia estado a EN_REVISION_LEGAL

LEGAL hace login — ve candidato en su panel

LEGAL aprueba el candidato

INTERMEDIARIO recibe notificación de aprobación

LOGÍSTICA / ADMIN programa llegada a Kutno desde /logistica

ADMIN marca candidato como CONTRATADO

Dashboard muestra los contadores correctos en todos los roles

text

**Documenta el resultado de cada paso** en `docs/flujo-principal-test.md`
con: ✅ OK / ❌ Error (descripción) / ⚠️ Funciona pero con observación.

Si algún paso falla, corrígelo antes de marcar esa capa como completa.

---

## PARTE 4 — CHECKLIST DE UX POR ROL

### Criterio: "Cero WhatsApp, cero Excel"

Para cada rol, la interfaz debe responder estas preguntas
SIN salir de la app, SIN abrir otra herramienta:

#### INTERMEDIARIO — Preguntas que debe poder responder desde su dashboard:
- [ ] ¿Cuántos candidatos tengo en total y en qué estado está cada uno?
- [ ] ¿Qué documentos faltan por subir en cada candidato?
- [ ] ¿Quién ya pagó los 400 PLN y quién no?
- [ ] ¿Algún candidato fue rechazado? ¿Por qué exactamente?
- [ ] ¿Tengo notificaciones pendientes de leer?

#### LEGAL — Preguntas que debe poder responder desde su panel:
- [ ] ¿A quién tengo que revisar hoy (cola de revisión)?
- [ ] ¿Qué documentos tiene subidos cada candidato en revisión?
- [ ] ¿Por qué rechacé a X candidato en el pasado?
- [ ] ¿Cuántos candidatos aprobé / rechacé este mes?

#### LOGÍSTICA / ADMIN — Preguntas desde /logistica:
- [ ] ¿Quién llega esta semana y cuándo exactamente?
- [ ] ¿Quién va en avión, quién en tren, quién viene por sus medios?
- [ ] ¿Quién recoge a cada candidato en Kutno?
- [ ] ¿Hay candidatos aprobados sin logística asignada aún?

#### SUPERADMIN — Preguntas desde /ajustes y dashboard global:
- [ ] ¿Cuántos intermediarios activos tengo y cuántos candidatos gestiona cada uno?
- [ ] ¿Qué intermediario tiene más candidatos atascados en RECOPILANDO_DOCS?
- [ ] ¿Hay documentos próximos a expirar en los próximos 30 días?

**Si alguna de estas preguntas requiere ir a Excel, WhatsApp o recordar datos
de memoria, ajusta la UI correspondiente hasta que se pueda responder
desde la pantalla correcta.**

---

## PARTE 5 — POLÍTICA DE OCR (AZURE DOCUMENT INTELLIGENCE)

### Reglas de comportamiento del OCR

**Regla 1 — Nunca autocompletar sin confirmación:**
Cuando el OCR extrae datos de un documento:
- NO sobreescribas automáticamente ningún campo que ya tenga valor manual
- Muestra los datos extraídos en un panel lateral o modal con etiqueta "Datos detectados por OCR"
- El usuario debe hacer clic en "Aplicar" campo por campo, o "Aplicar todos" si confía

**Regla 2 — Guardar siempre el raw de OCR:**
El JSON completo devuelto por Azure DI se guarda en `Document.extractedData`
independientemente de si el usuario aplica los datos o no.

**Regla 3 — Registrar aplicación de datos OCR:**
Cuando el usuario aplica datos de OCR al candidato, agrega una nota automática:
[Sistema] Datos actualizados desde OCR por {user.name} el {fecha}
Campos actualizados: passportNumber, passportExpiry, nationality

text

**Regla 4 — Manejo de confianza baja:**
Si `confidence < 0.8` en cualquier campo de Azure DI, marcar con indicador
visual ⚠️ en el panel de revisión OCR. El dato requiere verificación manual.

**Regla 5 — Tipos de documento soportados en v1.0:**
El OCR solo se activa para:
- `PASSPORT` — modelo `prebuilt-idDocument`
- `KARTA_POBYTU` — modelo `prebuilt-idDocument`

Para otros tipos (`PAYMENT_RECEIPT`, `VOIVODATO_DECISION`, etc.)
el botón "Procesar con OCR" no se muestra.

---

## PARTE 6 — CONSISTENCIA DE ARQUITECTURA ORI

### Patrones obligatorios del ecosistema

Este hub es parte de la suite ORI. Para garantizar consistencia entre proyectos:

**Estructura de carpetas — NO modificar:**
src/
├── app/
│ ├── api/ # API routes y cron jobs
│ ├── login/ # única ruta pública de auth
│ ├── registro/ # ruta pública de autoregistro candidato
│ └── actions/ # Server Actions (una por dominio)
│ ├── candidates.ts
│ ├── documents.ts
│ ├── notifications.ts
│ ├── logistics.ts
│ ├── exports.ts
│ └── public-registration.ts
├── components/
│ ├── ui/ # primitivos: Button, Input, Modal, Badge
│ ├── candidates/ # componentes de dominio
│ ├── documents/
│ ├── logistics/
│ └── layout/ # Sidebar, Header, MobileNav
├── lib/
│ ├── prisma.ts # cliente Prisma singleton
│ ├── supabase.ts # cliente Supabase (server + client)
│ ├── auth-utils.ts # requireSession, requireRole
│ ├── ocr.ts # cliente Azure DI
│ └── validations/
│ ├── candidate.ts
│ ├── candidate-registration.ts
│ ├── document.ts
│ └── logistics.ts
├── types/
│ ├── next-auth.d.ts
│ └── index.ts
└── auth.ts

text

**Convenciones de código obligatorias:**

1. Server Actions siempre verifican sesión como primera línea:
```typescript
"use server";
const session = await auth();
if (!session) throw new Error("No autorizado");
```

2. Client Components (`"use client"`) solo cuando hay interactividad real.
   Todo lo demás: Server Components async.

3. Nombres de Server Actions: `verbo + sustantivo` en camelCase:
   `createCandidate`, `updateCandidateStatus`, `uploadDocument`

4. Queries Prisma con `select` explícito en listados (nunca `findMany` sin select):
```typescript
// ✅ Correcto
prisma.candidate.findMany({ select: { id: true, firstName: true, status: true } })
// ❌ Evitar en listados
prisma.candidate.findMany()
```

5. Patrón estándar de retorno para Server Actions:
```typescript
type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> }
```

6. NO introducir librerías de estado global (Zustand, Redux, Jotai).
   Usar: URL state + Server Components + revalidatePath + useReducer local.

---

## PARTE 7 — VARIABLES DE ENTORNO

### Variables existentes — NO regenerar, NO renombrar

El `.env` ya existe en el proyecto con estas variables exactas:
DATABASE_URL → Prisma datasource
NEXT_PUBLIC_SUPABASE_URL → Supabase client (browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase client (browser)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY → Supabase client
SUPABASE_SERVICE_ROLE_KEY → Supabase admin (solo server)
NEXTAUTH_SECRET → NextAuth v5
NEXTAUTH_URL → NextAuth v5
SUPABASE_STORAGE_BUCKET → nombre del bucket de documentos
AZURE_DI_ENDPOINT → Azure Document Intelligence
AZURE_DI_KEY → Azure Document Intelligence

text

**Variables nuevas a agregar al .env y al .env.example:**
CRON_SECRET= # token para proteger /api/cron/* endpoints

text

**Regla:** Cualquier nueva variable debe documentarse en `.env.example`
con comentario explicativo. NUNCA hardcodear valores que deben ir en .env.

---

## PARTE 8 — RESPONSIVE Y MOBILE-FIRST

### Comportamiento requerido por breakpoint

**Mobile (< 768px):**
- Sidebar lateral DESAPARECE completamente
- Aparece barra de navegación inferior fija con 5 iconos:
  Home | Candidatos | Documentos | Logística | Notificaciones
- Formularios al 100% de ancho con padding 16px
- Tablas de candidatos se convierten en lista de cards apiladas
- Modales como bottom sheets a pantalla completa
- `/registro/[token]` es 100% mobile-first (es la ruta del candidato)

**Tablet (768px - 1024px):**
- Sidebar colapsado (solo iconos + tooltip en hover)

**Desktop (> 1024px):**
- Sidebar expandido con iconos + texto (comportamiento actual)

**CSS approach:** Tailwind v4 con breakpoints `sm:` `md:` `lg:`.
No crear media queries custom en globals.css salvo para skeleton animation.

---

## PARTE 9 — SISTEMA DE DISEÑO NEOBRUTALIST

### Variables CSS — usar siempre, no hardcodear colores

```css
var(--pitch-black)       /* fondo oscuro, texto sobre fondo claro */
var(--amber-flame)       /* acento primario, botones CTA */
var(--ghost-white)       /* fondo de cards y superficies */
var(--white-smoke)       /* fondo de inputs, filas alternas */
var(--muted)             /* texto secundario, labels */
```

**Reglas de componentes (sin excepciones):**
- `border-radius: 0` en absolutamente todos los elementos
- Sombra cards: `box-shadow: 4px 4px 0px var(--pitch-black)`
- Sombra botón hover: `box-shadow: 6px 6px 0px var(--pitch-black)` + `transform: translate(-2px, -2px)`
- Bordes: `2px solid var(--pitch-black)`

**Estados de botón:**
Default: fondo amber/negro, sombra offset 4px
Hover: translate(-2px, -2px), sombra 6px
Active: translate(2px, 2px), sombra 2px
Disabled: opacity 0.5, cursor not-allowed, sin transform
Loading: spinner inline + texto "Cargando..."

text

**Colores de badge por estado de candidato:**
RECOPILANDO_DOCS → bg #FEF3C7 / text #92400E (amber claro)
EN_REVISION_LEGAL → bg #DBEAFE / text #1E40AF (azul)
APROBADO → bg #D1FAE5 / text #065F46 (verde)
RECHAZADO → bg #FEE2E2 / text #991B1B (rojo)
CONTRATADO → bg var(--pitch-black) / text var(--amber-flame)
EN_PROCESO_PERMISO → bg #F3E8FF / text #6B21A8 (morado)

text

---

## PARTE 10 — CRITERIO FINAL DE DISTRIBUCIÓN

### La app está lista para distribución cuando se cumplen TODOS estos puntos:

#### Funcionalidad:
- [ ] Los 18 pasos del FLUJO PRINCIPAL (Parte 3) completan sin errores
- [ ] El formulario de autoregistro mapea 1:1 con el Google Form original
- [ ] Los 4 roles pueden loguearse y ven solo lo que les corresponde
- [ ] Un documento puede subirse, procesarse con OCR y verificarse
- [ ] Las notificaciones llegan cuando cambia el estado de un candidato
- [ ] El cron de documentos próximos a expirar ejecuta sin error

#### Seguridad:
- [ ] Ninguna Server Action ejecuta queries sin verificar sesión primero
- [ ] Los intermediarios no pueden ver candidatos de otros intermediarios
- [ ] El bucket de Supabase Storage tiene RLS configurado
- [ ] El endpoint `/api/cron/*` requiere `Authorization: Bearer <CRON_SECRET>` en el header
- [ ] El token de `/registro/[token]` se invalida tras un uso exitoso

#### Calidad de código:
- [ ] No existen `// TODO` sin resolver en archivos de producción
- [ ] No existen datos hardcodeados (nombres, IDs, emails) fuera del seed
- [ ] Todas las páginas tienen `loading.tsx` y `error.tsx`
- [ ] `npm run build` completa sin errores ni warnings de TypeScript

#### Experiencia de usuario:
- [ ] La app es usable desde móvil (375px ancho mínimo)
- [ ] Todos los textos, labels y mensajes de error están en español
- [ ] El formulario de autoregistro se puede completar en menos de 10 minutos
- [ ] Un intermediario nuevo puede crear su primer candidato en menos de 3 minutos

---

1. Superadmin crea perfil de intermediario.
2. Intermediario crea perfil de candidato usando el formulario multi-paso
   que replica EXACTAMENTE el Google Form.
3. Candidato paga 400 PLN → se adjunta comprobante.
4. Intermediario cambia estado a "REVISIÓN_LEGAL".
5. Legal acepta → estado "APROBADO".
6. Contabilidad cambia estado a "CONTRATADO" y asigna fecha de llegada.
7. Logística asigna medio de transporte y confirma recogida.
8. Al llegar, se registraENTRY_STAMP y se crea karta pobytu / PESEL / voivodato.
9. Al finalizar contrato, se registra EXIT_STAMP.

Si este flujo falla en CUALQUIER punto, regresa a la capa correspondiente.

*Última actualización: Mayo 2026*
*FOLGA SP. Z O.O. — ORI Suite*
*Documento complementario de: `antigravity-prompt-folga-hub.md`*
