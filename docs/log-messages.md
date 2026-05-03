## Error Type
Runtime Error

## Error Message
Hubo un error al crear la organización. Por favor intente de nuevo.


    at createOrg (src\app\(public)\onboarding\page.tsx:66:15)
    at form (<anonymous>:null:null)
    at OnboardingPage (src\app\(public)\onboarding\page.tsx:81:9)

## Code Frame
  64 |     } catch (error) {
  65 |         console.error("[Onboarding] Error creating organization:", error);
> 66 |         throw new Error("Hubo un error al crear la organización. Por favor intente de nu...
     |               ^
  67 |     }
  68 |
  69 |   revalidatePath("/", "layout");

Next.js version: 16.2.4 (Turbopack)



1/1

Next.js 16.2.4
Turbopack
Runtime Error
Server



Hubo un error al crear la organización. Por favor intente de nuevo.
src\app\(public)\onboarding\page.tsx (66:15) @ createOrg


  64 |     } catch (error) {
  65 |         console.error("[Onboarding] Error creating organization:", error);
> 66 |         throw new Error("Hubo un error al crear la organización. Por favor intente de nu...
     |               ^
  67 |     }
  68 |
  69 |   revalidatePath("/", "layout");
Call Stack
8

Hide 5 ignore-listed frame(s)
createOrg
src\app\(public)\onboarding\page.tsx (66:15)
resolveErrorDev
node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js (3260:51)
processFullStringRow
node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js (4427:23)
processFullBinaryRow
node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js (4370:7)
processBinaryChunk
node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js (4593:19)
progress
node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js (4924:9)
form
<anonymous>
OnboardingPage
src\app\(public)\onboarding\page.tsx (81:9)
1
2

PS C:\dev\ORI.CRUIT-PROJECTS\folga-intermediario-hub> npm run dev

> folga-intermediario-hub@0.1.0 dev
> next dev

⚠ Port 3000 is in use by process 28960, using available port 3001 instead.
▲ Next.js 16.2.4 (Turbopack)
- Local:         http://localhost:3001
- Network:       http://192.168.176.1:3001
- Environments: .env
✓ Ready in 610ms
⨯ Another next dev server is already running.

- Local:        http://localhost:3000
- PID:          28960
- Dir:          C:\dev\ORI.CRUIT-PROJECTS\folga-intermediario-hub
- Log:          .next\dev\logs\next-development.log

Run taskkill /PID 28960 /F to stop it.

PS C:\dev\ORI.CRUIT-PROJECTS\folga-intermediario-hub> npm run dev

> folga-intermediario-hub@0.1.0 dev
> next dev

▲ Next.js 16.2.4 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://192.168.176.1:3000
- Environments: .env
✓ Ready in 650ms

[Platform] Registering Core Agents...
[Registry] Agent registered: OCR-Agent (Intelligence)
[Registry] Agent registered: Scoring-Agent (Analytics)
[Platform] Loading Plugins...
[Platform] Initializing ORI-OS Layer...
[Platform] ORI-OS Layer Ready.
 GET / 200 in 1115ms (next.js: 448ms, application-code: 667ms)
 GET /api/auth/session 200 in 758ms
 GET /globals.css 404 in 492ms (next.js: 344ms, application-code: 147ms)
[Platform] Registering Core Agents...
[Registry] Agent registered: OCR-Agent (Intelligence)
[Registry] Agent registered: Scoring-Agent (Analytics)
[Platform] Loading Plugins...
[Platform] Initializing ORI-OS Layer...
[Platform] ORI-OS Layer Ready.
 GET /api/auth/session 200 in 543ms (next.js: 261ms, application-code: 282ms)
 GET /dashboard 200 in 1314ms (next.js: 223ms, application-code: 1091ms)
 GET /globals.css 404 in 208ms (next.js: 94ms, application-code: 114ms)
 GET /onboarding 200 in 865ms (next.js: 126ms, application-code: 739ms)
 GET /globals.css 404 in 108ms (next.js: 20ms, application-code: 89ms)
 GET /api/auth/session 200 in 177ms (next.js: 25ms, application-code: 152ms)
 GET /api/auth/session 200 in 29ms (next.js: 7ms, application-code: 22ms)
[Platform] Registering Core Agents...
[Registry] Agent registered: OCR-Agent (Intelligence)
[Registry] Agent registered: Scoring-Agent (Analytics)
[Platform] Loading Plugins...
[Platform] Initializing ORI-OS Layer...
[Platform] ORI-OS Layer Ready.
[Onboarding] Error creating organization: Error [PrismaClientValidationError]: 
Invalid `tx.organization.create()` invocation in
C:\dev\ORI.CRUIT-PROJECTS\folga-intermediario-hub\.next\dev\server\chunks\ssr\[root-of-the-server]__116i.11._.js:920:50

  917     }
  918 });
  919 const finalSlug = existing ? `${slug}-${Math.random().toString(36).substring(2, 5)}` : slug;
→ 920 const newOrg = await tx.organization.create({
        data: {
          name: "FOLGA SP. Z O.O.",
          slug: "folga-sp-z-o-o",
          memberships: {
            create: {
              userId: "cmon5k2dl0000wrl72xaelis8",
              role: "SUPERADMIN",
              isActive: true
            }
          },
      +   id: String
        }
      })

Argument `id` is missing.
    at <unknown> (src\app\(public)\onboarding\page.tsx:37:50)
    at async (src\app\(public)\onboarding\page.tsx:37:28)
    at async createOrg (src\app\(public)\onboarding\page.tsx:32:21)
  35 | ...     const finalSlug = existing ? `${slug}-${Math.random().toString(36).substring(2, ...
  36 | ...
> 37 | ...     const newOrg = await tx.organization.create({
     |                                              ^
  38 | ...         data: {
  39 | ...             name,
  40 | ...             slug: finalSlug, {
  clientVersion: '5.22.0'
}
⨯ Error: Hubo un error al crear la organización. Por favor intente de nuevo.
    at createOrg (src\app\(public)\onboarding\page.tsx:66:15)
  64 |     } catch (error) {
  65 |         console.error("[Onboarding] Error creating organization:", error);
> 66 |         throw new Error("Hubo un error al crear la organización. Por favor intente de nu...
     |               ^
  67 |     }
  68 |
  69 |   revalidatePath("/", "layout"); {
  digest: '2558210023'
}
 POST /onboarding 500 in 1141ms (next.js: 6ms, application-code: 1135ms)
  └─ ƒ <inline action>({}) in 659ms src/app/(public)/onboarding/page.tsx
[browser] Uncaught Error: Hubo un error al crear la organización. Por favor intente de nuevo.
    at createOrg (src\app\(public)\onboarding\page.tsx:66:15)
    at form (<anonymous>)
    at OnboardingPage (src\app\(public)\onboarding\page.tsx:81:9)
  64 |     } catch (error) {
  65 |         console.error("[Onboarding] Error creating organization:", error);
> 66 |         throw new Error("Hubo un error al crear la organización. Por favor intente de nu...
     |               ^
  67 |     }
  68 |
  69 |   revalidatePath("/", "layout");
 GET /onboarding? 200 in 179ms (next.js: 12ms, application-code: 166ms)
 GET /globals.css 404 in 98ms (next.js: 15ms, application-code: 82ms)
 GET /api/auth/session 200 in 147ms (next.js: 19ms, application-code: 127ms)
 GET /api/auth/session 200 in 28ms (next.js: 5ms, application-code: 24ms)
[Platform] Registering Core Agents...
[Registry] Agent registered: OCR-Agent (Intelligence)
[Registry] Agent registered: Scoring-Agent (Analytics)
[Platform] Loading Plugins...
[Platform] Initializing ORI-OS Layer...
[Platform] ORI-OS Layer Ready.
[Onboarding] Error creating organization: Error [PrismaClientValidationError]: 
Invalid `tx.organization.create()` invocation in
C:\dev\ORI.CRUIT-PROJECTS\folga-intermediario-hub\.next\dev\server\chunks\ssr\[root-of-the-server]__116i.11._.js:920:50

  917     }
  918 });
  919 const finalSlug = existing ? `${slug}-${Math.random().toString(36).substring(2, 5)}` : slug;
→ 920 const newOrg = await tx.organization.create({
        data: {
          name: "Acme Corp",
          slug: "acme-corp",
          memberships: {
            create: {
              userId: "cmon5k2dl0000wrl72xaelis8",
              role: "SUPERADMIN",
              isActive: true
            }
          },
      +   id: String
        }
      })

Argument `id` is missing.
    at <unknown> (src\app\(public)\onboarding\page.tsx:37:50)
    at async (src\app\(public)\onboarding\page.tsx:37:28)
    at async createOrg (src\app\(public)\onboarding\page.tsx:32:21)
  35 | ...     const finalSlug = existing ? `${slug}-${Math.random().toString(36).substring(2, ...
  36 | ...
> 37 | ...     const newOrg = await tx.organization.create({
     |                                              ^
  38 | ...         data: {
  39 | ...             name,
  40 | ...             slug: finalSlug, {
  clientVersion: '5.22.0'
}
⨯ Error: Hubo un error al crear la organización. Por favor intente de nuevo.
    at createOrg (src\app\(public)\onboarding\page.tsx:66:15)
  64 |     } catch (error) {
  65 |         console.error("[Onboarding] Error creating organization:", error);
> 66 |         throw new Error("Hubo un error al crear la organización. Por favor intente de nu...
     |               ^
  67 |     }
  68 |
  69 |   revalidatePath("/", "layout"); {
  digest: '2558210023'
}
 POST /onboarding 500 in 1183ms (next.js: 7ms, application-code: 1176ms)
  └─ ƒ <inline action>({}) in 567ms src/app/(public)/onboarding/page.tsx
[browser] Uncaught Error: Hubo un error al crear la organización. Por favor intente de nuevo.
    at createOrg (src\app\(public)\onboarding\page.tsx:66:15)
    at form (<anonymous>)
    at OnboardingPage (src\app\(public)\onboarding\page.tsx:81:9)
  64 |     } catch (error) {
  65 |         console.error("[Onboarding] Error creating organization:", error);
> 66 |         throw new Error("Hubo un error al crear la organización. Por favor intente de nu...
     |               ^
  67 |     }
  68 |
  69 |   revalidatePath("/", "layout");

[{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/agents/ocr-agent.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'InputJsonValue'.",
	"source": "ts",
	"startLineNumber": 19,
	"startColumn": 51,
	"endLineNumber": 19,
	"endColumn": 65,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/agents/ocr-agent.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'InputJsonValue'.",
	"source": "ts",
	"startLineNumber": 20,
	"startColumn": 54,
	"endLineNumber": 20,
	"endColumn": 68,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/ajustes/api-keys/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'key' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 90,
	"startColumn": 31,
	"endLineNumber": 90,
	"endColumn": 34,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/ajustes/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'membership' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 142,
	"startColumn": 31,
	"endLineNumber": 142,
	"endColumn": 41,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/dashboard/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 's' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 66,
	"startColumn": 32,
	"endLineNumber": 66,
	"endColumn": 33,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/dashboard/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'c' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 67,
	"startColumn": 34,
	"endLineNumber": 67,
	"endColumn": 35,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/dashboard/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'c' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 164,
	"startColumn": 34,
	"endLineNumber": 164,
	"endColumn": 35,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/dashboard/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'candidate' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 199,
	"startColumn": 31,
	"endLineNumber": 199,
	"endColumn": 40,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/leads/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'l' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 21,
	"startColumn": 41,
	"endLineNumber": 21,
	"endColumn": 42,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/leads/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'l' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 50,
	"startColumn": 78,
	"endLineNumber": 50,
	"endColumn": 79,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/leads/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'lead' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 67,
	"startColumn": 26,
	"endLineNumber": 67,
	"endColumn": 30,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/notificaciones/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'n' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 41,
	"startColumn": 32,
	"endLineNumber": 41,
	"endColumn": 33,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(app)/platform/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'org' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 76,
	"startColumn": 26,
	"endLineNumber": 76,
	"endColumn": 29,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/(public)/onboarding/page.tsx",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'tx' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 32,
	"startColumn": 54,
	"endLineNumber": 32,
	"endColumn": 56,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/candidates.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'CandidateStatus'.",
	"source": "ts",
	"startLineNumber": 8,
	"startColumn": 10,
	"endLineNumber": 8,
	"endColumn": 25,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/candidates.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'Role'.",
	"source": "ts",
	"startLineNumber": 8,
	"startColumn": 35,
	"endLineNumber": 8,
	"endColumn": 39,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/candidates.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'CandidateUncheckedUpdateInput'.",
	"source": "ts",
	"startLineNumber": 128,
	"startColumn": 28,
	"endLineNumber": 128,
	"endColumn": 57,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/candidates.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'membership' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 282,
	"startColumn": 35,
	"endLineNumber": 282,
	"endColumn": 45,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/candidates.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'CandidateUncheckedCreateInput'.",
	"source": "ts",
	"startLineNumber": 400,
	"startColumn": 35,
	"endLineNumber": 400,
	"endColumn": 64,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/documents.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'DocumentType'.",
	"source": "ts",
	"startLineNumber": 10,
	"startColumn": 10,
	"endLineNumber": 10,
	"endColumn": 22,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/documents.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'Role'.",
	"source": "ts",
	"startLineNumber": 10,
	"startColumn": 32,
	"endLineNumber": 10,
	"endColumn": 36,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/documents.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'InputJsonValue'.",
	"source": "ts",
	"startLineNumber": 52,
	"startColumn": 51,
	"endLineNumber": 52,
	"endColumn": 65,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/documents.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'InputJsonValue'.",
	"source": "ts",
	"startLineNumber": 53,
	"startColumn": 54,
	"endLineNumber": 53,
	"endColumn": 68,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/exports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'c' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 27,
	"startColumn": 32,
	"endLineNumber": 27,
	"endColumn": 33,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/exports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'c' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 73,
	"startColumn": 31,
	"endLineNumber": 73,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/exports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'e' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 107,
	"startColumn": 27,
	"endLineNumber": 107,
	"endColumn": 28,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/logistics.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'CandidateStatus'.",
	"source": "ts",
	"startLineNumber": 4,
	"startColumn": 18,
	"endLineNumber": 4,
	"endColumn": 33,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/logistics.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'LocationStatus'.",
	"source": "ts",
	"startLineNumber": 4,
	"startColumn": 35,
	"endLineNumber": 4,
	"endColumn": 49,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/logistics.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'InputJsonValue'.",
	"source": "ts",
	"startLineNumber": 44,
	"startColumn": 57,
	"endLineNumber": 44,
	"endColumn": 71,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/logistics.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'InputJsonValue'.",
	"source": "ts",
	"startLineNumber": 86,
	"startColumn": 31,
	"endLineNumber": 86,
	"endColumn": 45,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/public-registration.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'CandidateStatus'.",
	"source": "ts",
	"startLineNumber": 5,
	"startColumn": 10,
	"endLineNumber": 5,
	"endColumn": 25,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/public-registration.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'LocationStatus'.",
	"source": "ts",
	"startLineNumber": 5,
	"startColumn": 27,
	"endLineNumber": 5,
	"endColumn": 41,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/public-registration.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'RecruitmentSource'.",
	"source": "ts",
	"startLineNumber": 5,
	"startColumn": 43,
	"endLineNumber": 5,
	"endColumn": 60,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/public-registration.ts",
	"owner": "typescript",
	"code": "2305",
	"severity": 8,
	"message": "Module '\"@prisma/client\"' has no exported member 'Role'.",
	"source": "ts",
	"startLineNumber": 5,
	"startColumn": 62,
	"endLineNumber": 5,
	"endColumn": 66,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/public-registration.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'user' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 163,
	"startColumn": 29,
	"endLineNumber": 163,
	"endColumn": 33,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/reports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'c' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 26,
	"startColumn": 31,
	"endLineNumber": 26,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/reports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'c' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 77,
	"startColumn": 31,
	"endLineNumber": 77,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/reports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'd' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 78,
	"startColumn": 42,
	"endLineNumber": 78,
	"endColumn": 43,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/reports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'd' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 79,
	"startColumn": 39,
	"endLineNumber": 79,
	"endColumn": 40,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/reports.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'd' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 80,
	"startColumn": 39,
	"endLineNumber": 80,
	"endColumn": 40,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/app/actions/settings.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'InputJsonValue'.",
	"source": "ts",
	"startLineNumber": 39,
	"startColumn": 35,
	"endLineNumber": 39,
	"endColumn": 49,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/lib/automation/engine.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'JsonValue'.",
	"source": "ts",
	"startLineNumber": 27,
	"startColumn": 18,
	"endLineNumber": 27,
	"endColumn": 27,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/src/lib/automation/engine.ts",
	"owner": "typescript",
	"code": "2694",
	"severity": 8,
	"message": "Namespace '\"c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/node_modules/.prisma/client/default\".Prisma' has no exported member 'CandidateUpdateManyMutationInput'.",
	"source": "ts",
	"startLineNumber": 175,
	"startColumn": 37,
	"endLineNumber": 175,
	"endColumn": 69,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/tests/e2e/main-flow.spec.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module '@playwright/test' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 1,
	"startColumn": 30,
	"endLineNumber": 1,
	"endColumn": 48,
	"origin": "extHost1"
},{
	"resource": "/c:/dev/ORI.CRUIT-PROJECTS/folga-intermediario-hub/tests/e2e/main-flow.spec.ts",
	"owner": "typescript",
	"code": "7031",
	"severity": 8,
	"message": "Binding element 'page' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 10,
	"startColumn": 47,
	"endLineNumber": 10,
	"endColumn": 51,
	"origin": "extHost1"
}]