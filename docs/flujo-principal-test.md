# 🧪 Test de Flujo Principal — FOLGA HUB

Este documento describe el flujo operativo de extremo a extremo para validar la integridad del sistema.

## 📋 Estados de Prueba
* ✅ OK: Funciona correctamente
* ❌ Error: No funciona
* ⚠️ Observación: Funciona pero requiere atención

---

## 🔄 Flujo de Reclutamiento y Legalización

| # | Paso | Actor | Estado | Observaciones |
|---|------|-------|--------|---------------|
| 1 | Login de SUPERADMIN | SUPERADMIN | ✅ OK | |
| 2 | Creación de INTERMEDIARIO | SUPERADMIN | ✅ OK | |
| 3 | Login de INTERMEDIARIO | INTERMEDIARIO | ✅ OK | |
| 4 | Crear "Shell Candidate" (Perfil básico) | INTERMEDIARIO | ✅ OK | |
| 5 | Generar enlace de registro público | INTERMEDIARIO | ✅ OK | Token único generado correctamente |
| 6 | Candidato completa formulario público | CANDIDATO | ✅ OK | 8 pasos, móvil-first, validación Zod |
| 7 | Intermediario recibe notificación | INTERMEDIARIO | ✅ OK | Notificación de "Registro Completado" |
| 8 | Intermediario sube Pasaporte | INTERMEDIARIO | ✅ OK | Azure Doc Intelligence procesa el archivo |
| 9 | OCR extrae datos (No auto-aplica) | SISTEMA | ✅ OK | Datos guardados en `extractedData` |
| 10 | LEGAL revisa candidato | LEGAL | ✅ OK | Panel legal muestra candidatos en `EN_REVISION_LEGAL` |
| 11 | LEGAL aprueba candidato | LEGAL | ✅ OK | Estado cambia a `APROBADO`, notificaciones enviadas |
| 12 | Intermediario recibe aprobación | INTERMEDIARIO | ✅ OK | Notificación de "Candidato Aprobado" |
| 13 | ADMIN crea evento de logística | ADMIN | ✅ OK | Registro de transporte y fecha de llegada |
| 14 | ADMIN marca candidato como CONTRATADO | ADMIN | ✅ OK | Cierre del flujo de reclutamiento |
| 15 | Contadores de Dashboard actualizados | SISTEMA | ✅ OK | Estadísticas reflejan los cambios |

---

## 🛡️ Verificaciones de Seguridad

- [x] Un INTERMEDIARIO no puede ver candidatos de otro.
- [x] Un usuario LEGAL no puede editar datos del candidato, solo aprobar/rechazar.
- [x] El enlace de registro expira o se invalida una vez completado.
- [x] Las notificaciones son privadas por usuario.
