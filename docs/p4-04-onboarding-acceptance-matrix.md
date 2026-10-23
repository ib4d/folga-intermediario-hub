# P4-04 — matriz de aceptación de alta e invitaciones

> **Actualización posterior al despliegue · 18 de octubre de 2026.** El release `c1fce7f1760df95c11603a99abb42c972beb48a6` está desplegado con imagen `ghcr.io/ib4d/folga-intermediario-hub@sha256:d108388f41d51f2712f71abe1621779c52970e89e5dfed82274751733b58259e`; CI Quality pasó, el runtime y el digest coinciden, y las 16 migraciones están aplicadas. Esto acredita compilación y migración del release, no la aceptación funcional de altas/invitaciones. El 18 de octubre se ejecutaron recorridos P4-04 en el Compose sintético local con Mailpit; no se enviaron correos externos. El buzón y los resultados están descritos en [el runbook de Mailpit](p4-04-smtp-sandbox.md).

## Qué acredita la evidencia anterior

El runbook actual registra diez comprobaciones E2E sintéticas en la imagen anterior y menciona estos grupos: alta pública queda inactiva y no permite iniciar sesión antes de verificar; verificación y uso único de token; invitaciones para cuenta nueva y existente; dirección de correo incorrecta; reserva/tope de plazas; y auditoría. La evidencia disponible no individualiza los diez resultados ni incluye fecha/hora, capturas redactadas o salida de cada caso. No atribuir cobertura detallada a casos que el acta no identifica.

El release actual incluye la validación de configuración/destinatario, límites de 20 segundos para conexión/handshake y fallback manual de invitación con enlace visible una sola vez. La compilación y el despliegue no acreditan entrega SMTP, fallback, traducciones ni este flujo de extremo a extremo.

**Comprobación local del 18 de octubre:** `npm run build` terminó correctamente con Next.js 16.3.8 y generó las 62 páginas estáticas. El Compose sintético migró su base y quedó saludable. El recorrido de alta entregó un correo a Mailpit, se verificó el enlace, se creó e inició sesión con una cuenta/organización sintéticas y se comprobó el rechazo de reuso del token. El envío y el HTTPS de producción no se probaron.

Se corrigió el borrador del correo de invitación para español, inglés y polaco y se añadió un selector de idioma para el destinatario, predeterminado al idioma actual del operador. En la continuación del 18 de octubre también se localizaron en ES/EN/PL los errores de negocio, errores de configuración y confirmaciones de la acción de invitación. El idioma de la interfaz controla esas respuestas; el selector del correo controla únicamente el mensaje para el destinatario. Estos cambios están incluidos en el release; las combinaciones de idiomas aún no se han recorrido en navegador.

## Casos para el recorrido controlado

Usar organizaciones/cuentas sintéticas, un SMTP sandbox y un buzón controlado. No usar candidatos ni correos de clientes. Guardar el release/digest, navegador, fecha UTC, resultado, ID de invitación redactado, eventos de auditoría y mensaje recibido; nunca guardar contraseñas, tokens, enlaces de aceptación completos, secretos SMTP o cuerpos con datos personales.

| ID | Caso | Resultado que debe observarse | Evidencia previa registrada | Estado para la imagen candidata actual |
|---|---|---|---|---|
| O-01 | Alta pública nueva | Solo se crea una solicitud pendiente con hash del token; no existen aún User, Organization ni Membership, y no se guarda contraseña. | El E2E anterior pertenece a una imagen anterior con implementación distinta. | Candidato actualizado el 17 oct; no ejecutado, comprobar DB y login denegado. |
| O-02 | Confirmación y contraseña válida | El formulario POST consume el token, crea usuario/organización/membresía y auditoría en una transacción; después permite iniciar sesión. | Ejecutado en Compose sintético: correo recibido en Mailpit; GET inicial válido; la confirmación produjo una cuenta activa con rol SUPERADMIN, una organización y una membresía; el login llegó al dashboard. El token no se incluyó en el expediente. | **Pasó localmente.** No demuestra HTTPS ni envío externo en producción. |
| O-03 | Contraseñas que no coinciden, tienen menos de 12 caracteres o superan 72 bytes UTF-8 | No crea cuenta ni consume el token; el enlace sigue disponible mientras no venza. | La contraseña distinta devolvió mensaje localizado, conservó el formulario/token y permitió reintentar. Una contraseña de 37 caracteres `á` (74 bytes UTF-8) fue rechazada por la acción; después la contraseña válida consumió el mismo token y completó el alta. La validación cliente `minLength=12` está presente; no se obtuvo evidencia del rechazo server-side de una contraseña corta porque el navegador bloqueó el POST. | **Parcial;** mismatch y >72 bytes pasaron. Falta verificar el límite corto en una solicitud server-side controlada. |
| O-04 | Reutilizar token ya consumido | Segundo uso falla; no crea otra membresía ni duplica activación. | Se abrió otra vez el enlace ya consumido: la página informó que no era válido/venció. Los conteos siguieron en una cuenta, una organización, una membresía y cero solicitudes pendientes. | **Pasó localmente.** |
| O-05 | Token de alta vencido (24 h) y reenvío | El vencido no crea acceso. Volver a solicitar el alta genera un token nuevo; el anterior deja de funcionar. Respetar el intervalo de 60 segundos. | En Compose sintético, el primer alta generó un mensaje. Una repetición inmediata mostró el mismo aviso genérico: Mailpit siguió en 9 mensajes y `tokenHash`, `lastSentAt` y `expiresAt` no cambiaron. Luego se movió hacia atrás 61 s solo el `lastSentAt` de esa fila sintética; el siguiente envío generó un segundo correo, rotó el hash, avanzó la marca temporal y fijó TTL de 86 400 s. Se retiró la única fila de alta y no se creó usuario; los dos correos siguen en Mailpit. No se expuso ningún token. | **Parcial:** cooldown inmediato y reemisión/rotación tras superar el intervalo simulado confirmados. Falta abrir ambos enlaces para observar rechazo del anterior/validez del nuevo y comprobar vencimiento real a las 24 h. |
| O-06 | Invitar a correo sin cuenta | El rol invitado se aplica solo al aceptar; exige nombre, al menos 12 caracteres y como máximo 72 bytes UTF-8; crea cuenta, membresía y auditoría una vez. | En Compose sintético, el ADMIN creó una invitación para `p4-04-o06-20261018@synthetic.example.invalid` con rol LEGAL. Mailpit recibió el asunto y saludo en español. El enlace llevaba `lang=es` y `#token=…`, sin token en query. La página mostró organización, destinatario y rol, y retiró el fragmento de la barra. Consulta de base: una invitación LEGAL pendiente, `acceptedAt=null`, cero usuarios y cero membresías para esa dirección. | **Parcial:** creación, entrega sintética y apertura sin conceder acceso pasaron. La aceptación requiere que el operador cree la contraseña y envíe el formulario; después falta comprobar membresía, rol, auditoría y login. |
| O-07 | Invitar a cuenta existente de la misma organización | La cuenta sigue activa y no pertenece a otro tenant. Si su membresía de esta organización está inactiva y no puede iniciar sesión, puede confirmar su identidad con la contraseña actual; al aceptar, se reactiva solo esa membresía y se conserva la cuenta y su contraseña. | El 23 oct, Playwright pasó en synthetic-local: contraseña incorrecta conservó invitación/membresía/auditoría; la correcta activó la membresía LEGAL, mantuvo identidad/hash, creó auditoría y sesión. El caso también pasó 1/1 en 8,3 s sobre la imagen local actual detrás de HTTPS de loopback, con base/Mailpit nuevos. La misma prueba en la imagen aprobada exacta (commit `c1fce7f1760df95c11603a99abb42c972beb48a6`, digest `sha256:d108388f41d51f2712f71abe1621779c52970e89e5dfed82274751733b58259e`) no encontró el copy ni el campo `#invite-existing-password`; el bundle confirmó que el selector/copy no está en ese release. Fixture limpiado en todos los casos. La imagen local de prueba aún declara `.release=synthetic-local`, por lo que no es un artefacto promocionable. | **Código local: pasó por HTTP synthetic-local y por HTTPS en contenedor. Release aprobado: pendiente.** Hay que construir una imagen inmutable nueva que incluya O-07 y repetir aceptación antes de promoverla. No se tocó VPS/producción. |
| O-08 | Aceptar con sesión/correo equivocado | Deniega la aceptación y no cambia usuario, rol ni membresía. | El 23 oct, la UI mostró el rechazo al iniciar sesión con otra cuenta; la invitación siguió pendiente, no se creó membresía ni auditoría de aceptación. Luego la cuenta destinataria aceptó esa misma invitación. | **Pasó en synthetic-local** para una cuenta existente sin tenant. No equivale a O-07 same-tenant/reactivación ni a release. |
| O-09 | Correo ya activo en esta organización | No crea invitación ni cambia rol por vía de invitación. | En la pila P4-04 aislada, el primer intento con una cuenta activa ligada al tenant mediante `User.organizationId` y sin fila `Membership` reveló que el guardado anterior permitía enviar una invitación. El mensaje solo llegó a Mailpit; la invitación se revocó luego sin aceptar ni cambiar el rol. Se actualizó `src/app/actions/invitations.ts` para tratar ese vínculo legado activo como acceso existente, tanto en preflight como dentro de la transacción. Tras reconstruir, se repitió con ese caso legado y con otra cuenta sintética con `Membership` activa: ambos mostraron “ya tiene acceso”; no se creó invitación y los roles permanecieron iguales. Mailpit no recibió mensajes adicionales durante las repeticiones. Después se aplicó la migración aditiva `20261018120000_backfill_legacy_memberships`: en la base aislada añadió las 54 membresías elegibles, preservando rol y estado activo/inactivo y omitiendo administradores globales y usuarios con cualquier membresía previa. El seed ahora mantiene estas membresías con `upsert`; el tenant de laboratorio muestra 5 usuarios y 5 membresías activas. | **Pasó localmente tras la corrección** para cuentas activas con y sin fila `Membership`. El primer correo sigue visible en Mailpit, pero su invitación está revocada. La migración y el ajuste del seed solo están verificados en el entorno aislado; falta desplegar y repetir en el release aprobado. |
| O-10 | Cuenta global, desactivada o vinculada a otro tenant | No invita ni agrega una membresía de segundo tenant. | En la pila P4-04 aislada se probaron tres casos: un usuario activo ligado a otro tenant sintético, una cuenta sintética desactivada y una cuenta marcada como administradora de plataforma. Los tres intentos fueron rechazados con el mensaje específico; no se crearon filas de invitación ni membresías nuevas y Mailpit permaneció en cuatro mensajes. Los roles/estados originales de las cuentas no cambiaron. Se repitieron después de aplicar la migración de normalización: la cuenta de otro tenant conservó su membresía en su tenant de origen, y los tres casos siguieron bloqueados sin nuevas invitaciones ni correos. | **Pasó localmente** en los tres estados antes y después de normalizar membresías. Los marcadores y la invitación O-09 revocada permanecen aislados. Falta repetir en el release aprobado y cubrir carreras concurrentes. |
| O-11 | Reenviar al mismo correo invitado | Un reenvío inmediato de una invitación pendiente no rota el token ni manda otro correo durante 60 segundos; después sustituye el token, extiende el vencimiento y el enlace anterior deja de funcionar. Una invitación vencida o revocada se puede reemitir sin esperar ese intervalo. Una invitación aceptada asociada a una membresía activa es terminal: no se reenvía y se indica que el correo ya tiene acceso. Dos reenvíos concurrentes no deben generar dos correos ni dejar más de un token válido. | En la pila aislada se probó el enfriamiento y la carrera en dos pestañas: a los 41 s ambas recibieron el aviso de espera sin cambios; a los 128 s, una reemisión se envió y la concurrente recibió el enfriamiento, con un solo cambio de hash, auditoría y mensaje. También se reemitieron inmediatamente invitaciones revocadas y vencidas, conservando la fila y rotando el token. En una prueba nueva, el token del primer mensaje coincidía con el hash vigente antes de rotar; se envejeció solo `updatedAt` de esa fila sintética para habilitar la reemisión, se reenvió por la UI y se comprobó que el token anterior dejó de coincidir y que su página mostró invitación inválida, mientras el token del correo nuevo coincidía con el hash actual. Para el estado aceptado se usó un marcador sintético vinculado a un miembro activo: intentar invitar de nuevo por la UI devolvió “Ese correo ya tiene acceso”, sin correo ni invitación nuevos. Se retiró el marcador; se revocó la fila de prueba. No se conservaron tokens ni hashes. Estado final del laboratorio: STARTER, cinco miembros activos, una pendiente O-27, 15 revocadas y cero aceptadas. | **Pasó localmente en la pila aislada** para enfriamiento, carrera, rotación e invalidación del enlace anterior, reemisión tras vencimiento/revocación y bloqueo de reenvío a miembro activo. El caso aceptado se verificó con un fixture, no completando una aceptación real de invitación. Falta repetir en el release aprobado y comprobar correo/HTTPS en la topología productiva. |
| O-12 | Invitación vencida, revocada o aceptada | Enlace no crea acceso y comunica que se debe pedir otro. | En Compose sintético, el marcador expirado y luego revocado mostró el rechazo localizado y no creó usuario ni membresía. En esta continuación se creó un registro fixture con `acceptedAt` y un token sintético cuyo hash coincidía con el registro; abrir el enlace local mostró “Esta invitación no es válida o ya venció”. La consulta confirmó cero usuario y membresía para esa dirección; se eliminó el fixture tras comprobarlo. | **Pasó localmente con estados sintéticos** para vencido, revocado y aceptado. No se esperó el TTL real de siete días ni se hizo un ciclo completo de aceptación de invitación; falta repetir en el release aprobado. |
| O-13 | Límite de usuarios y plazas reservadas | Cuenta miembros activos + invitaciones vigentes; invitación al tope falla sin crear registro parcial. | En la pila aislada, 4 membresías activas + la invitación pendiente O-27 alcanzaron el límite STARTER de cinco; el intento extra recibió el error localizado sin crear invitación/usuario ni enviar correo. Después se venció temporalmente O-27 y se pausó una membresía sintética para dejar 4 activos + 0 pendientes. La UI aceptó otra invitación y Mailpit recibió un único mensaje; la consulta confirmó una sola nueva invitación y cero usuarios. Se revocó esa fila y se restauraron la membresía y el vencimiento previo de O-27. En el estado base, con 5 activos + O-27 pendiente, un nuevo intento mostró el límite de 5 y dejó cero filas/usuarios para ese correo; Mailpit no aumentó. Estado final: STARTER, cinco miembros activos, una pendiente O-27, 16 revocadas, Mailpit con 23 mensajes. O-11 cubre la reemisión a la misma dirección tras vencimiento/revocación; no se combinó ese recorrido con una carrera de cupos. | **Pasó localmente** el rechazo en el tope, la liberación de plaza por vencimiento y el bloqueo cuando el STARTER ya aparece por encima del cupo. La prueba de vencimiento usó un estado sintético y restauró el valor original; la nueva invitación quedó revocada. Falta reproducir una carrera que cambie miembros mientras se asigna el último puesto y repetir en el release aprobado. |
| O-14 | Carrera de invitaciones simultáneas al último cupo | Como máximo se acepta la cantidad de invitaciones permitida; no se supera el límite. | En el tenant STARTER aislado se prepararon 4 membresías activas y ningún puesto pendiente. Dos pestañas enviaron invitaciones a destinatarios sintéticos distintos al mismo tiempo. La primera pasada confirmó que solo se guardó una invitación, pero reveló que la otra devolvía un error genérico ante `P2034`. Se añadió un reintento único de la transacción serializable y se repitió con otro par sintético: una pestaña confirmó el envío y la otra mostró el mensaje localizado de límite de 5 usuarios. La base terminó con 4 miembros activos + 1 invitación, un usuario perdedor inexistente, una sola fila/auditoría/correo para la segunda pasada y ningún `P2034` registrado. Las dos filas de prueba se revocaron al limpiar. | **Pasó localmente para una carrera de dos invitaciones por el último puesto.** La primera pasada encontró y permitió corregir el mensaje genérico del conflicto serializable. No se supera el cupo ni se crea registro parcial para quien pierde. Falta repetir en el release productivo con su topología y correo externo. |
| O-15 | SMTP acepta el mensaje de alta | Enlace HTTPS correcto, TTL 24 h y modo/idioma correctos; el formulario muestra confirmación pero nunca el token. | Mailpit recibió el mensaje español para el destinatario sintético. La URL local era `http://localhost:3301/onboarding/verify?lang=es#token=…`; el token estaba en el fragmento, no en la query, y la fila pendiente vencía exactamente en 86 400 s. La UI mostró confirmación genérica y no el token. | **Parcial:** entrega SMTP, idioma, fragmento y TTL pasaron. La prueba local usa HTTP loopback; falta confirmar la URL HTTPS de producción y recorrido con su dominio real. |
| O-16 | SMTP falla, timeout o configuración inválida en alta | No queda solicitud pendiente, usuario, organización ni membresía; la interfaz mantiene la respuesta genérica sin token ni datos SMTP. Se puede reintentar; el enfriamiento solo limita una solicitud pendiente conservada tras un envío aceptado. | En `O-16B`, Mailpit Chaos rechazó Recipient con SMTP `451` al 100%; UI genérica, cero solicitud/usuario/organización y ningún mensaje. Después, una instancia web local desechable con `SMTP_USER` vacío devolvió la misma respuesta genérica; no guardó solicitud, usuario u organización, Mailpit siguió en 23 mensajes y los logs solo mostraron `smtpConfigured=false` y el aviso genérico. Para el timeout se conectó una instancia aparte a un servidor SMTP sintético que acepta TCP pero no envía el saludo; al agotar el límite de socket de 20 s, la UI volvió con la confirmación genérica. No quedó solicitud/usuario/organización, Mailpit siguió en 23 mensajes y los logs no revelaron el destinatario ni `SMTP_TIMEOUT`. Se eliminaron ambos contenedores temporales sin tocar la pila base. | **Pasó localmente** el rechazo 451, SMTP sin configurar y timeout, sin datos parciales ni detalle técnico en UI/logs. Falta repetir con proveedor SMTP y dominio productivos. |
| O-17 | Aislamiento y permisos | ADMIN puede invitar INTERMEDIARIO, LEGAL y LOGISTICA; SUPERADMIN también puede invitar ADMIN. Ninguno puede crear/aceptar invitación para otro tenant, elevar privilegios por manipulación del formulario ni invitar cuentas globales/activas incompatibles. | El 23 oct 2026 pasó la matriz E2E `p4-04-invitation-roles.spec.ts` (1/1, 9,7 s) contra la imagen aprobada exacta por HTTPS local, con PostgreSQL nuevo y 16 migraciones, y Mailpit con restricción `.invalid`. ADMIN invitó los tres roles permitidos; SUPERADMIN también ADMIN. Se rechazaron rol falsificado y cuentas con membresía existente, tenant distinto, desactivada y administración global. Las cuatro invitaciones válidas conservaron actor/tenant/rol y auditoría correctos. La prueba pasó también en la imagen local actual (1/1, 8,6 s) tras reiniciar los contadores de su DB aislada. Junto con `p4-04-invitation-tampering.spec.ts`, ya pasado contra el mismo digest, el payload con rol/tenant alterados no cruzó de tenant. Postcondición de cada sandbox: cero fixtures/mensajes; no coincidencias de fixture/token en logs. | **Pasó en la imagen aprobada** para la matriz de roles, cuentas incompatibles y manipulación de rol/tenant. Ejecuciones locales aisladas; no se modificó el VPS. P4-04 mantiene los demás casos abiertos. |
| O-18 | Auditoría | Creación/aceptación, actor, organización y entidad se registran sin token ni enlace secreto. | Consulta de solo lectura sobre 22 eventos sintéticos `USER_INVITATION_CREATED`: los 22 tenían actor, organización y entidad `OrganizationInvitation`; los detalles incluían correo, rol y vencimiento. Ninguno contenía referencias a token, `#token=`, URL ni `inviteUrl`. No hay eventos sintéticos `USER_INVITATION_ACCEPTED` porque en este recorrido no se aceptó una invitación. La ruta de aceptación escribe actor, organización, ID de invitación y detalles limitados a correo/rol en `src/app/actions/invitations.ts`; eso es inspección del código, no ejecución de esa ruta. | **Parcial:** auditoría de creación comprobada localmente y sin secretos. Falta completar una aceptación sintética real y verificar el evento resultante; después repetir con el release aprobado. |
| O-19 | Rutas, HTTPS, migración y recuperación | URL usa dominio correcto/HTTPS; migraciones corresponden al release; rollback restaura versión/esquema según runbook. | Release `c1fce7f` y digest de GHCR desplegados; 16 migraciones aplicadas; health y smoke pasaron. | La promoción y el esquema están acreditados. Falta aceptar el recorrido P4-04 por navegador y la recuperación de su flujo con datos sintéticos. |
| O-20 | Idioma de interfaz y contenido del correo | Alta pública sigue el idioma elegido en la URL; invitaciones permiten elegir ES/EN/PL para el destinatario. Asunto, saludo, expiración y enlace deben corresponder al idioma del correo; el operador debe seguir viendo errores/confirmaciones en el idioma de la interfaz, incluso cuando el correo use otro idioma. | Alta pública local: ES, EN y PL pasaron con mensaje de interfaz y correo en el idioma elegido, enlace `lang` correcto, token solo en fragmento y TTL de 24 h. En invitaciones, el 18 oct se recorrieron las 9 combinaciones ES/EN/PL × ES/EN/PL en la pila aislada `33301`/Mailpit. En cada combinación el aviso de éxito de la interfaz coincidió con el idioma del operador; el asunto, saludo/nombre, texto del rol, expiración de 7 días e instrucción/enlace coincidieron con el idioma del correo. Se revisaron los nueve mensajes sin imprimir cuerpos ni tokens: todos tenían `lang` correcto, token en `#token=` y ninguno en query. Se registraron 9 eventos `USER_INVITATION_CREATED`; ninguna auditoría de O-20 mostró patrones de token. Las 9 invitaciones quedaron revocadas después de verificar y no se aceptó ninguna. | **Pasó localmente para alta pública y las 9 combinaciones de invitación.** El SMTP fue solo Mailpit y el enlace apunta a HTTP loopback; faltan HTTPS/dominio y proveedor SMTP productivo. Esto valida los mensajes y confirmaciones del flujo de invitación, no que todas las pantallas de Ajustes estén traducidas completamente en ES/EN/PL. |
| O-21 | Limpieza de solicitudes vencidas | Un nuevo alta o intento de confirmación elimina solicitudes expiradas; la ruta nunca acepta un token vencido. | En Compose sintético se insertó una fila marcada vencida y se envió una solicitud de alta nueva con dirección `.invalid`. La acción eliminó la fila vencida, creó temporalmente la solicitud vigente nueva y el conteo quedó en 0 para la fila de prueba vencida. Después se borró solo la solicitud temporal nueva; O-06 no se modificó. En una prueba separada, un enlace con token sintético asociado a una fila expirada mostró el mensaje localizado de enlace inválido; la consulta confirmó cero usuarios y la fila de prueba se retiró. | **Parcial:** limpieza al solicitar un alta nueva y rechazo visual del token vencido confirmados. Falta comprobar limpieza desde el POST de verificación. |
| O-22 | Cron de limpieza | Sin `CRON_SECRET` correcto responde 401. Con el secreto elimina solo solicitudes vencidas y buckets expirados, y devuelve ambos conteos sin correos ni tokens; conserva solicitudes y buckets vigentes. | En Compose sintético, sin cabecera de autorización respondió HTTP 401. Con el `CRON_SECRET` del contenedor sintético respondió 200 con `{ok:true, deleted:1, rateLimitBucketsDeleted:6}`; confirmó que se retiró la fila de alta vencida y los buckets expirados, mientras las filas futuras de prueba seguían presentes. Los 6 buckets incluían expiraciones anteriores de pruebas locales. Se borraron los marcadores futuros después de la comprobación. No se expuso el secreto en la salida. | **Parcial:** autorización, borrado selectivo y respuesta local confirmados. Falta verificar programación, secreto y ruta desde el VPS aprobado, además del comportamiento ante fallo de base de datos. |
| O-23 | Privacidad del alta pública | El contenido/estado visible no distingue correo registrado, solicitud aceptada, enfriamiento ni fallo SMTP; no muestra token ni causa interna. Un correo existente no genera usuario/organización adicional y elimina cualquier solicitud pendiente obsoleta. SMTP síncrono deja latencia variable, por lo que no se afirma resistencia a análisis temporal. | En Compose sintético, el envío con `admin@synthetic.example.invalid` (cuenta ya registrada) mostró el mismo aviso genérico ES que una cuenta nueva. Mailpit permaneció en 5 mensajes para el caso existente (ningún correo nuevo). Se preparó una solicitud vencida para ese correo; la acción la eliminó y no creó fila pendiente, usuario ni organización de prueba. Después quedaron cero marcadores. | **Parcial:** respuesta pública igual para cuenta nueva/existente en ES, sin correo adicional para la cuenta existente y limpieza de solicitud obsoleta confirmadas. Falta comparar EN/PL y fallo SMTP, además de medir latencias entre cuenta nueva, existente, cooldown y fallo; el correo síncrono puede variar en latencia. |
| O-24 | Abuso de alta pública desde una IP | Los POST de `/onboarding` y sus subrutas comparten un límite de 10 por IP cada 15 minutos; `/invitations/accept` conserva 30 por 15 minutos. El contador se agrupa por regla y método (no por cada subruta), se comparte por PostgreSQL entre procesos, usa el reloj de DB y guarda un HMAC de identificador/ruta/método, nunca la IP directa. Si falta `AUTH_SECRET`/`NEXTAUTH_SECRET`, no se identifica una IP válida o falla la base, esas solicitudes responden 503 y no continúan sin control. Nginx debe agregar la IP del peer al final de `X-Forwarded-For`; la app permanece ligada a loopback. Los buckets vencidos se borran con el cron diario. | La migración `20261018110000_shared_rate_limit_buckets` está incluida en el release; las 16 migraciones están aplicadas en producción. En Compose sintético se enviaron 11 POST vacíos con prefijos `X-Forwarded-For` distintos y el mismo valor final reservado: los primeros 10 devolvieron HTTP `200` y el 11.º HTTP `429`. Luego se expiró manualmente solo otro bucket sintético: la solicitud siguiente volvió a HTTP `200`, coherente con el reinicio de la ventana. Se borraron los buckets de ambas sondas (`DELETE 1` cada uno) y `/api/health` respondió HTTP `200`. Las sondas no enviaron datos de cuenta/candidato ni ejecutaron la acción de alta. | **Parcial:** límite, selección del último valor de `X-Forwarded-For` y reinicio tras expirar el bucket confirmados localmente. El reinicio se adelantó cambiando únicamente `resetAt`; no se esperaron 15 minutos reales. No se probaron concurrencia entre procesos, falsificación a través del proxy real ni fallos 503 por IP/DB/secreto; tampoco cron ni topología real del VPS. Una solicitud loopback sin cabeceras explícitas recibió `200`, probablemente porque Next añadió la dirección de la conexión; no cuenta como prueba de IP ausente. El HMAC es un identificador seudónimo y debe quedar cubierto por P4-03/P5-02. |
| O-25 | Exposición del token de confirmación | Los enlaces nuevos llevan el token en el fragmento, que el navegador no envía en el GET; el cliente lo quita de la barra al cargar y solo lo transmite en el cuerpo de Server Actions. Las páginas de verificación y aceptación declaran `no-referrer`. Los enlaces de invitación antiguos con `?token=` sí exponen el token en su primer GET; se preparó [un formato Nginx sin query ni Referer](token-url-log-protection.md), pero aún no está aplicado. | En correos de alta locales, el token apareció en el fragmento `#token=…`, no en query; el lenguaje de URL coincidió con ES/EN/PL. En el recorrido anterior, el navegador quitó el fragmento y el GET no consumió el token. Esta vez se extrajeron los tres tokens solo dentro del proceso y se revisó la salida reciente del contenedor web: ninguno de los tokens, los destinatarios sintéticos ni patrones `#token=`/token en query apareció en los logs. No se imprimieron tokens ni logs. Esto no cubre el proxy ni logs de producción. | **Parcial:** enlace, retiro del fragmento y ausencia de filtración en logs del app local comprobados. Falta tráfico de red, proxy, HTTPS productivo y recorrido de enlaces nuevos/legados de invitación con proxy. |
| O-26 | Token de invitación y traspaso al login | Los enlaces nuevos llevan el token en el fragmento, la página lo quita antes de consultar el estado por Server Action y el callback de login no lo incluye. Para cuentas existentes se conserva en `sessionStorage` de la pestaña y se retira al volver. Los enlaces antiguos `?token=` siguen válidos y redirigen a fragmento; el primer GET puede aparecer en logs si el proxy conserva el formato predeterminado, por lo que el release debe aplicar [la configuración de log segura](token-url-log-protection.md). La ruta limita GET/POST a 30 solicitudes por IP cada 15 minutos, compartidas entre procesos y agrupadas por regla/método. | Invitación sintética nueva: el mensaje llevó el token en `#token=…` y no en query; el navegador eliminó el fragmento al abrir la página. El GET mostró el formulario de aceptación y no creó User/Membership ni aceptó la invitación. La invitación sigue pendiente. | **Parcial:** enlace nuevo y GET no consumible observados. Falta aceptar como cuenta nueva, sesión/correo existente, ida/vuelta por login, enlaces legados, `Referer`, logs del release y persistencia temporal del token. |
| O-27 | Reenvío repetido de invitación y frecuencia de correo | La misma invitación pendiente solo se reemite una vez por minuto, con estado y enfriamiento comprobados en la transacción de base de datos; los POST al resto de Server Actions de Ajustes no se confunden con un límite de invitación. | Ejecutado el 18 oct en la pila aislada `ori-cruit-hub-p4-04-clean`: se creó una invitación sintética y se recibió el primer mensaje. Un reenvío aproximadamente 66 s después se aceptó; el intento inmediato posterior mostró el aviso de espera y no cambió `updatedAt` ni el total de Mailpit (2). Tras superar otros 60 s, el reenvío se aceptó. Resultado final: una fila pendiente, `updatedAt` avanzado, 3 eventos `USER_INVITATION_CREATED` y 3 mensajes en Mailpit. No se imprimieron enlaces ni tokens. | **Parcial:** frecuencia secuencial y auditoría básica verificadas. O-11 comprueba aparte la carrera concurrente y la rotación única de hash/correo/evento. Para cerrar O-27 falta revisar el contenido redactado de auditoría de los reenvíos secuenciales y comprobar que otras Server Actions de Ajustes no se limitan por error. |
| O-28 | Fallo interno al crear o aceptar una invitación | Los fallos inesperados de consulta del contexto de tenant, consultas previas, transacciones, consulta pública y acceso posterior al inicio de sesión se registran solo con operación, clase de error y código Prisma conocido; la interfaz recibe mensajes localizados sin SQL ni texto de excepción. Si la cuenta ya se creó y aceptó pero falla el inicio automático, debe informar que la invitación quedó aceptada y ofrecer login manual. | Revisión estática de `logInvitationFailure` y sus llamadas: el registro contiene únicamente operación, clase (`errorKind`) y, para errores Prisma conocidos, `prismaCode`; no serializa `error.message`, correo, nombre, token ni texto SQL. El fallo de correo usa una advertencia fija y el flujo conserva la entrega manual; si falla el inicio automático tras una aceptación nueva, responde con `accepted: true` y mensaje localizado. Las ramas tienen manejo localizado. No se ha inducido un fallo ni inspeccionado un log runtime. | Pendiente; inducir fallos controlados en contexto de tenant, lookup, preflight, transacción y sign-in tras aceptación; verificar estado de datos, respuesta, redirección normal y log minimizado. |
| O-29 | Mensajes de resultado del operador | Errores de permiso, datos, rol, membresía, configuración y límite de usuarios, más confirmación de envío y entrega manual, aparecen en ES/EN/PL según el idioma de la interfaz; el correo mantiene su idioma independiente. | Auditoría estática de `src/lib/i18n.ts`: 127 claves `invite.*`/`onboarding.*` en cada idioma y mismos nombres de clave en ES/EN/PL. Se revisó editorialmente el polaco visible de invitaciones y alta: diacríticos, nombres de campos, mensajes de error y términos de demo. Los nueve mensajes con variables usan los mismos marcadores en ES/EN/PL y las llamadas revisadas aportan `{name}`, `{role}`, `{url}`, `{limit}`, `{email}` o `{organization}` según corresponde. El contexto de tenant ausente devuelve permiso localizado y un fallo inesperado de esa consulta devuelve creación fallida localizada. Las rutas de invitación mantienen separado el idioma de interfaz del destinatario. El 23 oct se añadió una descripción localizada para aceptación por cuenta existente; `tsc --noEmit` terminó con código 0 y una consulta directa de `t()` devolvió el texto ES/EN/PL esperado. No se completó el recorrido visual de todas las combinaciones ni el fallback manual. | Pendiente; recorrer las nueve combinaciones de idioma de interfaz/correo, confirmar visualmente el formato de `{limit}` y verificar el fallback manual con buzón sintético. |
| O-30 | Diagnóstico seguro del alta y verificación | Fallos inesperados al crear organización, consultar la verificación o completar el alta se registran con operación, clase de error y código Prisma conocido; no guardan token, contraseña, correo, nombre ni mensaje de excepción. Los conflictos de creación muestran el error de negocio localizado; tokens inválidos/consumidos conservan el estado de verificación localizado. Si el correo se ocupa después de iniciarse el alta, el usuario que ya verificó el enlace recibe orientación localizada para iniciar sesión. | Revisión estática adicional de `logOrganizationOnboardingFailure`: registra operación, clase de error y `prismaCode` solo para errores Prisma conocidos; no registra `error.message` ni datos de persona, correo o token. La revisión encontró que una carrera de consumo/expiración del token acababa en estado genérico; ahora `SIGNUP_TOKEN_INVALID` y `SIGNUP_TOKEN_ALREADY_USED` redirigen al estado localizado de enlace inválido. Si otra cuenta toma el correo después de iniciarse el alta, `SIGNUP_EMAIL_ALREADY_USED` muestra el mensaje existente localizado y acceso a login; solo ocurre tras verificar el enlace. El fallo/no confirmación de correo produce una señal de log fija sin datos. Consulta directa de `t()` para `onboarding.verifyInvalid`, `onboarding.verifyExisting` y `onboarding.verifyFailure` devolvió cadenas ES/EN/PL; sin fallo inducido ni inspección de logs runtime. | Pendiente; inducir conflictos/fallos sintéticos y confirmar estado localizado, registro minimizado y ausencia de datos personales/secreto en los logs. |

## Decisiones y precondiciones

- **P4-03 primero:** el alta técnica no sustituye aceptación contractual. No admitir datos reales hasta aprobar condiciones, aviso, roles y DPA aplicable.
- **Ejecución en entorno:** usar primero la bandeja local Mailpit descrita en [el runbook](p4-04-smtp-sandbox.md), con organización sintética y sin reenvío; nadie debe recibir un correo no solicitado.
- **Fallback manual:** definir quién puede ver/copiar el enlace, canal seguro autorizado, cómo confirma recepción y cómo se invalida/reemite. No copiar el enlace a tickets, logs, capturas ni notas.
- **Despliegue:** el release `c1fce7f1760df95c11603a99abb42c972beb48a6` y su digest ya están identificados en producción, y las 16 migraciones están al día. Mantener sus evidencias de backup/rollback; el recorrido P4-04 sigue pendiente.
- **Cierre P4-04:** cada caso debe tener resultado sobre la misma versión/entorno aprobados; adjuntar salida redactada, auditoría pertinente, recibo SMTP sandbox y aceptación del responsable. Registrar los casos bloqueados por proveedor/configuración como abiertos, no como pasados.

### Nota de promoción de `20261017170000_pending_organization_signups`

La migración crea únicamente `PendingOrganizationSignup` y tres índices (unicidad de email y hash de token, búsqueda por vencimiento); no altera tablas ni filas existentes. Está incluida en el release de producción y forma parte de las 16 migraciones aplicadas. Su aceptación funcional permanece pendiente; aún no se ha recorrido en el entorno sintético con correo capturado.

Cuando exista entorno aprobado, seguir [`release-migration-rollback-runbook.md`](release-migration-rollback-runbook.md): fijar commit/digest, comprobar `migrate status`, crear y verificar backup emparejado, y usar `scripts/deploy-prod.sh`, que corre `prisma migrate deploy` antes de cambiar el contenedor web. Si falla la migración, dejar la web anterior activa, detener la promoción e inspeccionar `_prisma_migrations`; no marcarla resuelta a mano. Si migra correctamente y falla la aplicación, el procedimiento previsto es volver a la imagen anterior manteniendo el esquema expandido. Restaurar la base completa también borra solicitudes nuevas posteriores al backup y no es un rollback rutinario de esta tabla aditiva.

La nota prepara una decisión operativa; no demuestra backup reciente, compatibilidad real con la imagen anterior ni éxito de despliegue.

## Plantilla de registro por caso

| Campo | Valor |
|---|---|
| ID y versión/digest |  |
| Entorno y fecha/hora UTC |  |
| Datos sintéticos y rol usado |  |
| Acción |  |
| Esperado / observado |  |
| Resultado (pasó / falló / bloqueado) |  |
| Referencia a salida/captura redactada |  |
| Evento de auditoría verificado |  |
| Incidencia, responsable y próxima acción |  |

## Reanudación — 2026-10-23

- Se corrigió el texto de aceptación de invitación para cuentas que ya existen:
  ahora explica que aceptar añade la organización a la cuenta actual, en vez de
  pedir que se cree otra contraseña. La cadena está localizada en ES/EN/PL.
- `tsc --noEmit` terminó con código 0 para el checkout local. Esto confirma
  tipos, no una compilación ni un recorrido de navegador. El lint dirigido a los
  dos archivos no terminó tras 60 segundos y se interrumpió.
- El sandbox Docker P4-04 no responde en `127.0.0.1:33301`; `docker info`
  tampoco responde dentro de 6 segundos. No se reinició Docker Desktop ni se
  modificaron contenedores de otros proyectos. El VPS no se tocó.
- O-17 sigue parcial: falta probar el formulario manipulado en runtime y repetir
  el caso sobre el release aprobado. Reanudar el recorrido cuando Docker
  responda; mantener la evidencia ya registrada de rechazo entre tenants.
- Preparé `tests/e2e/p4-04-invitation-tampering.spec.ts` para cubrir en runtime
  la manipulación de `role` y `organizationId`. Solo se habilita con
  `P4_04_RUN_MUTATING_E2E=1`; requiere `P4_04_BASE_URL`,
  `P4_04_EXPECTED_ORG_ID`, `P4_04_ATTACK_ORG_ID` y `P4_04_DATABASE_URL`.
  Rechaza hosts que no sean localhost, espera health HTTP 200, genera correo y
  token sintéticos, crea una invitación LEGAL directamente en la DB local, añade
  campos falsificados al formulario y verifica el usuario, membresía, invitación
  y auditoría. Limpia el usuario, la invitación y sus auditorías exactas.
  `tsc --noEmit` pasó y Playwright descubre el caso con `--list`. Para
  ejecutarlo con las cuatro variables locales preparadas, el comando es
  `npx playwright test tests/e2e/p4-04-invitation-tampering.spec.ts --reporter=line`;
  sigue pendiente porque el servidor local no responde.


### Continuación — 2026-10-23: O-17 en el release aprobado

- Docker volvió a responder y el sandbox P4-04 local está saludable. La prueba
  `tests/e2e/p4-04-invitation-tampering.spec.ts` pasó primero en la app local
  actual (**1 pasada**).
- Se obtuvo del registro la imagen inmutable
  `ghcr.io/ib4d/folga-intermediario-hub@sha256:d108388f41d51f2712f71abe1621779c52970e89e5dfed82274751733b58259e`; sus
  etiquetas y `/app/.release` confirman el commit
  `c1fce7f1760df95c11603a99abb42c972beb48a6`. La prueba del release corrió en
  otro Compose local, con volumen PostgreSQL nuevo y Mailpit limitado a
  destinatarios `.invalid`; las 16 migraciones de esa imagen se aplicaron y
  `/api/health` respondió HTTP 200.
- Resultado del E2E sobre el release aprobado: **1 pasada (8,3 s)**. El formulario
  envió `SUPERADMIN` y el ID de otro tenant como campos falsificados; el servidor
  creó el usuario y la membresía con rol LEGAL en el tenant de la invitación,
  no añadió membresía al tenant atacante y registró la auditoría en el tenant
  original. La limpieza verificó cero usuarios, invitaciones o membresías de
  prueba. Mailpit permaneció en cero mensajes: este caso no envió correo.
- No se cambió el VPS ni producción. O-17 sigue **parcial** por las demás
  combinaciones de actor/rol y cuentas incompatibles aún no repetidas sobre el
  release. O-28/O-29/O-30 y la entrega SMTP productiva siguen abiertos.

### Ampliación — matriz de roles y cuentas en el runtime sintético local

- El E2E `tests/e2e/p4-04-invitation-roles.spec.ts` pasó (**1 pasada, 9,9 s**)
  contra la app local `APP_RELEASE=synthetic-local`, en `localhost:33301`, con
  la base sintética local y Mailpit. `tsc --noEmit` también terminó con código 0.
- **ADMIN:** la interfaz ofrece INTERMEDIARIO, LEGAL y LOGISTICA. La acción
  rechazó ADMIN falsificado; rechazó cuentas ya activas en el mismo tenant,
  pertenecientes a otro tenant, inactivas y de administración global; creó las
  tres invitaciones válidas con el rol, tenant y actor correctos.
- **SUPERADMIN:** la interfaz añade ADMIN a esos tres roles. La acción rechazó
  SUPERADMIN falsificado y creó la invitación ADMIN válida. Se verificaron las
  cuatro auditorías: actor y tenant coinciden con cada invitación; sus detalles
  no exponen token ni URL. Mailpit capturó cuatro mensajes durante el recorrido.
- La limpieza dejó cero usuarios, organizaciones, invitaciones y auditorías del
  fixture; también retiró los siete mensajes `.invalid` acumulados por los
  intentos sintéticos de esta sesión. Mailpit volvió a cero. La app local quedó
  saludable (HTTP 200).
- **Límite de esta evidencia:** esta matriz no pasó sobre el digest aprobado.
  El release exacto ya pasó el caso de manipulación de rol/tenant anotado arriba,
  pero su guard exige HTTPS en `NODE_ENV=production`; no se debilitó ni se cambió
  producción. Para completar O-17 en el artefacto de release falta un runner
  HTTPS local aislado y con Mailpit.

### O-07 — reactivación segura de membresía same-tenant

- `tests/e2e/p4-04-invitation-inactive-membership.spec.ts` pasó (**1/1, 8,9 s**)
  en `APP_RELEASE=synthetic-local`. El fixture era una cuenta activa existente
  cuya organización heredada coincidía con el tenant invitante, pero su única
  fila `Membership` estaba inactiva. Por eso no podía entrar por el login normal.
- La página de invitación permite a ese destinatario confirmar la contraseña
  actual. Un intento incorrecto no consumió invitación, no cambió el rol ni
  reactivó la membresía, y no creó auditoría de aceptación. Tras introducir la
  contraseña vigente, la misma identidad aceptó como LEGAL; llegó al dashboard,
  se activó la membresía de ese tenant y se registró una única auditoría correcta.
  Se verificó que nombre, ID de usuario y contraseña persistida siguieran iguales.
- La acción verifica la contraseña antes y dentro de la transacción y limita los
  intentos a cinco por 15 minutos por correo invitado mediante el rate limiter
  compartido; tras aceptar correctamente limpia ese contador y el bloqueo de
  login de esa cuenta. No reactiva cuentas `User.isActive=false`, no admite
  cuentas de plataforma ni agrega usuarios vinculados a otro tenant.
- El fixture, su mensaje Mailpit y los contadores TEST-NET del runner se
  retiraron. La prueba y la compilación validan solo synthetic-local; no se ha
  repetido en el digest aprobado ni en VPS/producción.

### O-08 — rechazo de otra cuenta y aceptación por cuenta existente

- `tests/e2e/p4-04-invitation-existing-account.spec.ts` pasó (**1/1, 11,9 s**)
  en el runtime sintético local. Un ADMIN invitó como LEGAL a una cuenta activa
  que aún no tenía organización ni membresías. La prueba cotejó el token del
  correo capturado con el hash almacenado, sin imprimirlo ni conservarlo.
- Una segunda cuenta autenticada abrió el enlace: la UI rechazó el correo
  equivocado; la invitación permaneció pendiente y no hubo usuario nuevo,
  membresía ni auditoría de aceptación. Después, la cuenta destinataria abrió
  ese mismo enlace y llegó al dashboard.
- Se verificó que persistió el mismo usuario y nombre, que la contraseña
  anterior siguió funcionando, y que se añadieron tenant, rol LEGAL, membresía
  activa y auditoría con actor/organización correctos. El fixture y los mensajes
  Mailpit se limpiaron; los contadores de limitación generados por estas pruebas
  también se limpiaron en la base sintética local.
- **Alcance:** valida cuenta registrada sin tenant y correo de sesión erróneo;
  no prueba la reactivación de una membresía inactiva del mismo tenant prevista
  en O-07. No se ejecutó sobre el digest aprobado, ni se tocó VPS/producción.

### Regresión local de invitaciones — 23 de octubre de 2026

- Se reconstruyó el contenedor `synthetic-web` desde el checkout local. El build
  de Next.js 16.3.8, su comprobación TypeScript/runtime-deps y `npx --no-install
  tsc --noEmit` terminaron correctamente.
- La regresión secuencial de cuenta existente, membresía inactiva same-tenant y
  matriz de roles terminó **3/3 pasada en 22,9 s** en Compose sintético. Los E2E
  están restringidos a localhost y usan direcciones TEST-NET aleatorias para no
  agotar entre sí el límite compartido de login; no debilitan la política de
  rate limiting del producto.
- Se comprobaron cero usuarios, invitaciones, membresías y auditorías con los
  marcadores `p404-*`; Mailpit quedó en cero mensajes; se retiraron los buckets
  HMAC de autenticación/invitación generados por estas pruebas; `/api/health`
  respondió HTTP 200.
- **Límite:** evidencia de la imagen sintética construida desde el checkout
  local. No se desplegó ni probó en VPS/producción y no completa los escenarios
  restantes de P4-04.

### Candidata `runner` desde el árbol de trabajo — 23 de octubre de 2026

- Se construyó explícitamente el target Docker `runner` desde el checkout local
  con cambios sin commit; no se usó `synthetic-runner`. Build de Next.js 16.3.8,
  TypeScript, las 62 páginas y `check:runtime-deps` pasaron. Etiqueta local:
  `ori-cruit-hub:p404-worktree-20261023`; ID de imagen:
  `sha256:48252d14deffaf60a44048038479c5fd01224b2c478af65789984d3107b0b8c3`.
  El marcador de build/runtime fue `local-worktree-83f47ce-20261023` y
  `check-release.mjs` pasó con DB conectada. Ese marcador identifica una prueba
  local, no un commit íntegro ni una versión publicable.
- La misma imagen se probó por HTTPS de loopback detrás de Caddy, con una DB
  PostgreSQL aislada recién migrada y Mailpit limitado a destinatarios
  `@synthetic.example.invalid`. Pasaron **4/4** pruebas: O-07 reactivación de
  membresía inactiva (1/1, 12,6 s), O-08 cuenta existente/correo equivocado
  (1/1, 8,5 s), O-17 matriz de roles (1/1, 8,9 s) y O-17 manipulación de rol y
  tenant (1/1, 2,9 s). No se envió correo externo.
- Antes de apagar el entorno se verificaron cero organizaciones, usuarios,
  invitaciones, auditorías y mensajes de los fixtures; los contadores sintéticos
  también quedaron en cero. Se retiraron los contenedores, la red y los
  volúmenes de prueba; se conservó la imagen local para la siguiente etapa. El
  Compose sintético habitual siguió respondiendo HTTP 200 en `/api/health`.
- **Límite de promoción:** O-07 ya está aceptado en una imagen de producción
  local construida desde el árbol actual, mientras el digest desplegado aprobado
  sigue sin ese cambio. Para promocionar se requiere convertir el árbol de
  trabajo en un commit limpio, publicar una imagen CI con digest inmutable y
  repetir la aceptación en ese digest. No se publicó a GHCR ni se modificó el
  VPS. P4-04 permanece abierto por los casos restantes de esta matriz,
  aceptación SMTP/fallback y sus dependencias operativas/legales.

### Revalidación de candidata local tras actualizar Next.js — 23 de octubre de 2026

- Next.js y el lockfile se actualizaron de 16.3.8 a **16.4.1** para incluir las
  versiones corregidas de seguridad. `npm audit --omit=dev` reportó cero
  vulnerabilidades. La build de producción `runner` pasó TypeScript, generó las
  62 rutas y superó `check:runtime-deps`; el escáner no encontró el toolchain de
  ESLint, `esbuild`, `braces` ni una versión vulnerable de `source-map-js` en el
  runtime.
- Etiqueta local: `ori-cruit-hub:p404-worktree-secure-20261023`; ID de imagen
  local: `sha256:94f71e04d18c686d0816a955dd08b1627396a4641af7ca360317cd27d7d96b86`;
  `.release` y `APP_RELEASE` coinciden en
  `local-worktree-83f47ce-secure-20261023`. Este identificador aún no es un
  digest publicado en un registry: la imagen se construyó desde un árbol de
  trabajo modificado.
- Los cuatro E2E se repitieron en esa imagen exacta, detrás de HTTPS local con
  PostgreSQL nuevo y Mailpit limitado a `.invalid`: O-07 (**1/1, 11,0 s**), O-08
  (**1/1, 8,5 s**), O-17 matriz de roles (**1/1, 9,1 s**) y O-17 manipulación de
  rol/tenant (**1/1, 3,3 s**). Ningún mensaje salió a correo externo.
- La verificación final confirmó cero organizaciones, usuarios, invitaciones,
  auditorías, buckets de límite y mensajes de fixture. Se retiraron los cuatro
  contenedores, la red y los tres volúmenes exclusivos del ensayo. El Compose
  sintético habitual respondió HTTP 200 y no se modificó el VPS.
- **Siguiente gate:** el cambio de dependencia y la evidencia ya pueden entrar
  en un commit acotado; luego CI debe publicar un digest inmutable y esta misma
  aceptación debe repetirse contra ese artefacto. No desplegar aún: los cuatro
  E2E no completan el resto de la matriz P4-04 ni la aceptación SMTP/legal.
