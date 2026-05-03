# Seguridad y Cumplimiento (GDPR/RODO)

Folga Hub implementa medidas estrictas para proteger los datos de los candidatos.

## Medidas Implementadas

### 1. Protección de Datos (GDPR)
- **Mascara de Datos:** Los documentos sensibles como Pasaporte y PESEL se muestran enmascarados (ej. `********123`) para roles que no requieren ver el dato completo.
- **Anonimización:** Existe una función para anonimizar registros a solicitud del usuario (Derecho al Olvido).
- **Exportación:** Los usuarios pueden solicitar una exportación de sus datos en formato JSON/Excel.
- **Retención:** Se aplica una política de retención de 6 meses para candidatos rechazados o retirados.

### 2. Control de Acceso (RBAC)
- **Roles:** SUPERADMIN, ADMIN, LEGAL, LOGISTICA, INTERMEDIARIO.
- **Protección de Rutas:** Middleware y helpers (`requireRole`) aseguran que cada rol solo acceda a lo permitido.
- **Propiedad:** Los intermediarios solo pueden ver y editar candidatos que ellos mismos crearon.

### 3. Seguridad de Infraestructura
- **Protección Brute Force:** Bloqueo de IP/Email tras 5 intentos fallidos (15 min de cooldown).
- **Validación de Archivos:** Limite de 10MB, tipos de archivos estrictos (PDF/Imagen) y normalización de nombres para evitar inyecciones.
- **Logs de Auditoría:** Todas las acciones críticas (cambios de estado, descargas, subidas) se registran con timestamp y usuario.
