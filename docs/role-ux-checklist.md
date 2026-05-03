# 🎭 Checklist de Experiencia de Usuario por Rol (UX)

Este documento valida que cada rol tenga acceso a la información crítica necesaria para su operación diaria.

## 🤝 INTERMEDIARIO (Reclutador)
- [x] **Total de candidatos:** Visible en el Dashboard principal.
- [x] **Estado de candidatos:** Código de colores y etiquetas claras en listas.
- [x] **Documentos faltantes:** Checklist automático en el detalle del candidato.
- [x] **Pago 400 PLN:** Indicador visual en cada tarjeta y perfil.
- [x] **Motivo de rechazo:** Visible claramente en alertas rojas si el estado es RECHAZADO.
- [x] **Notificaciones no leídas:** Contador en la campana del Header.

## ⚖️ LEGAL (Abogado/Validador)
- [x] **Candidatos pendientes:** Cola exclusiva en `/legal` filtrada por `EN_REVISION_LEGAL`.
- [x] **Documentos por candidato:** Vista rápida de archivos subidos y su validez.
- [x] **Historial de rechazos:** Timeline de cambios de estado en el detalle.
- [x] **Aprobados/Rechazados mes:** Estadísticas en la cabecera del panel legal.

## 🚚 LOGÍSTICA / ADMIN (Coordinador)
- [x] **Llegadas de la semana:** Calendario/Lista en `/logistica` con fechas próximas.
- [x] **Medio de transporte:** Iconos distintivos (Avión, Tren, Coche).
- [x] **Persona de recogida:** Campo específico en la planificación de llegada.
- [x] **Aprobados sin logística:** Lista de "pendientes de programar" en el Dashboard de logística.

## 👑 SUPERADMIN (Gerencia)
- [x] **Intermediarios activos:** Gestión de usuarios y roles.
- [x] **Candidatos por intermediario:** Filtros en la búsqueda global.
- [x] **Candidatos estancados:** Identificables por fecha de última actualización.
- [x] **Documentos por expirar:** Alertas automáticas en el checklist de candidatos.

---

## 🚀 Próximas Mejoras (MVP+)
- [ ] Firma digital de contratos (GDPR).
- [ ] Chat directo entre Intermediario y Legal por candidato.
- [ ] Integración automática con aerolíneas para tracking de vuelos.
