# P4-04 — SMTP sandbox local

**Estado: activo; SMTP de alta probado parcialmente el 18 de octubre de 2026.**
Este buzón permite recorrer altas e invitaciones con organizaciones sintéticas
sin enviar correos a personas. Su configuración vive solo en
`docker-compose.synthetic.yml`; no se añadió a `docker-compose.prod.yml`.

## Límites

- Mailpit captura mensajes; no se configuró reenvío SMTP externo.
- Solo acepta destinatarios que terminen en `@synthetic.example.invalid`, el
  dominio de las cuentas sintéticas del proyecto.
- La interfaz web se publica solo en `127.0.0.1:18025`.
- El puerto SMTP 1025 solo está disponible dentro de la red privada de Compose;
  no se publica en el host.
- Se aceptan las credenciales sintéticas de la aplicación únicamente dentro de
  esta red local. `SMTP_ALLOW_INSECURE` y
  `MP_SMTP_AUTH_ALLOW_INSECURE` son exclusivos de este entorno de prueba.
- Se conservan como máximo 100 mensajes durante 24 horas. Mailpit usa su base
  temporal predeterminada, que se elimina al salir del proceso; no se montó un
  volumen persistente para el buzón.
- La función Chaos está habilitada para preparar fallos SMTP controlados; sus
  probabilidades iniciales son 0% y cualquier ajuste vuelve a 0% al reiniciar
  Mailpit.
- No copies esta configuración a producción ni uses direcciones personales o
  de clientes. Los enlaces de verificación/invitación son credenciales de un
  solo uso: no los pegues en logs, capturas, tickets o este expediente.

## Uso previsto

Cuando se autorice el recorrido P4-04, inicia el entorno aislado:

```powershell
docker compose -f docker-compose.synthetic.yml up -d --build
```

Abre [http://127.0.0.1:18025](http://127.0.0.1:18025) para revisar los correos
sintéticos. El sitio de prueba está en `http://localhost:3301`. Usa solo las
cuentas de desarrollo que crea `prisma/seed-synthetic.mjs` y direcciones de
prueba. Al detener Mailpit se descartan los mensajes capturados.

La aplicación sintética se mantiene en `NODE_ENV=production` para probar la
compilación de despliegue. Su URL HTTP solo se permite cuando coinciden los dos
marcadores sintéticos y el origen exacto `http://localhost:3301`; cualquier
otro origen en producción continúa exigiendo HTTPS. Esta excepción local no es
una configuración de producción.

## Resultado del recorrido local del 18 de octubre

- Compose compiló la aplicación, aplicó la migración pendiente del rate limiter
  sintético y dejó la app, PostgreSQL y Mailpit saludables.
- O-15: se recibió el correo de alta en español para una dirección
  `@synthetic.example.invalid`. La URL local usó `lang=es`, ruta
  `/onboarding/verify`, token en el fragmento y TTL de 24 horas. El acceso
  quedó confirmado; no se guardó el enlace/token en este runbook.
- O-02/O-04: el alta creó exactamente una cuenta SUPERADMIN, una organización y
  una membresía; el inicio de sesión llegó al dashboard. Reabrir el enlace
  consumido mostró el estado inválido sin duplicar registros.
- O-16: Chaos devolvió SMTP 451 en Recipient al 100%. No quedó solicitud
  pendiente, usuario ni organización y no entró un correo adicional en Mailpit.
  Después se restauró la probabilidad a 0%. En una tentativa sintética anterior,
  el primer cambio de Chaos no se había guardado y sí se capturó un mensaje; fue
  una dirección `@synthetic.example.invalid`, sin reenvío externo, y no
  corresponde al intento rechazado O-16B.
- O-03: se rechazaron la contraseña distinta y una contraseña de 74 bytes UTF-8;
  el mismo enlace permitió terminar el alta con una contraseña válida. El
  límite de menos de 12 caracteres solo se observó en la validación HTML del
  navegador, no en la acción del servidor.
- O-06/O-20/O-26: el ADMIN sintético emitió una invitación de rol LEGAL a otra
  dirección `@synthetic.example.invalid`. Mailpit recibió asunto y saludo en
  español; el enlace llevaba `lang=es` y el token en el fragmento. La página
  mostró organización, correo y rol, y quitó el fragmento de la barra. La
  consulta de solo lectura confirmó una invitación pendiente (`acceptedAt=null`)
  y cero usuario/membresía para el destinatario: el GET no concedió acceso. La
  aceptación está detenida en el formulario de contraseña para que el operador
  introduzca su propia credencial de prueba y envíe el formulario.
- O-12: se insertó en la base sintética una invitación temporal ya vencida con
  un token de prueba conocido solo para el recorrido; la página mostró el
  rechazo localizado sin crear usuario/membresía. Se cambió ese mismo marcador
  a vencimiento futuro y revocado, y una pestaña nueva también lo rechazó. Se
  borró el marcador y se comprobó que O-06 siguiera pendiente e intacta. No se
  esperó el TTL real de siete días ni se probó reuso de una invitación aceptada.
- O-21: se insertó una fila de alta sintética con vencimiento pasado; enviar otra
  solicitud de alta eliminó la fila vencida y creó su fila nueva vigente. Se
  retiró después únicamente esa fila temporal. En una prueba separada, un enlace
  con token sintético asociado a una fila expirada mostró el mensaje localizado
  de enlace inválido; la consulta confirmó cero usuarios y se retiró la fila de
  prueba. Falta provocar la limpieza desde la acción de verificación.
- O-22: sin cabecera de autorización, el cron sintético devolvió HTTP 401. Con
  el secreto del contenedor sintético devolvió HTTP 200 y los conteos de filas
  borradas; eliminó una solicitud vencida y seis buckets expirados, mantuvo las
  filas futuras de prueba y se retiraron luego esos marcadores. Los seis buckets
  incluían expiraciones de pruebas locales anteriores; no se registró ni mostró
  el secreto. Falta verificar programación, secreto y acceso desde el VPS, más
  el fallo de base de datos.
- O-23: el alta con `admin@synthetic.example.invalid`, que ya tenía cuenta,
  mostró el mismo aviso genérico de confirmación que una cuenta nueva en español.
  Mailpit permaneció en cinco mensajes para el caso existente; se eliminó una
  solicitud vencida preparada para el caso, sin crear usuario, organización ni
  solicitud pendiente de prueba. Faltan otros idiomas/estados y la comparación
  temporal.
- O-20 (alta pública): se recorrieron ES, EN y PL con correos `.invalid`. Cada
  aviso de la interfaz coincidió con el idioma. Se validaron en los mensajes
  solo comprobaciones booleanas de asunto, saludo, nombre, organización,
  instrucciones, expiración de 24 horas y enlace con idioma correcto; el token
  apareció en el fragmento, no en query. No se imprimió el cuerpo ni el token.
  Se borraron las tres solicitudes pendientes de prueba; Mailpit conserva los
  tres mensajes para revisión sintética.
- O-25: se recuperaron los tres tokens solo en memoria desde los mensajes de
  Mailpit y se contrastaron con los logs recientes del contenedor web. No
  apareció ninguno de los tokens, destinatarios sintéticos ni patrones de token
  en query/fragmento. No se imprimieron valores ni logs. La comprobación no
  incluye Nginx ni los logs del VPS.
- O-05: una solicitud nueva produjo un mensaje. El reintento inmediato devolvió
  el aviso genérico sin correo adicional y conservó hash/vencimiento/marca de
  envío. Para evitar esperar, se retrasó 61 segundos solo la marca temporal de
  la fila de prueba; el reenvío permitido rotó el hash, avanzó la marca y fijó
  TTL de 86 400 s. La fila se eliminó después; Mailpit conserva dos mensajes
  sintéticos. No se validó por navegador cuál enlace es aceptado, ni se esperó
  el vencimiento natural.
- O-27: para no tocar la base persistente anterior, se usó la pila limpia
  `ori-cruit-hub-p4-04-clean` (web `33301`, PostgreSQL `55499`, Mailpit `18099`,
  volúmenes y red propios). Se creó una invitación y se recibió un correo; el
  siguiente envío tras aproximadamente 66 segundos fue aceptado. El intento
  inmediato posterior devolvió el aviso localizado de enfriamiento; el tiempo
  de actualización de la fila no cambió y Mailpit siguió en dos mensajes. Tras
  esperar más de 60 segundos, el reenvío se aceptó. Verificación final: una
  fila pendiente, tiempo de actualización avanzado, tres eventos
  `USER_INVITATION_CREATED` y tres mensajes totales. No se expusieron tokens.
  No se comparó el hash en memoria ni se probó la interacción con otras Server
  Actions o solicitudes concurrentes.
- O-09: un primer intento con una cuenta activa ligada por `organizationId`
  legado y sin `Membership` fue permitido; el correo solo llegó a Mailpit. El
  código se corrigió para reconocer esa cuenta como miembro activo. Después del
  rebuild, el caso legado y una cuenta sintética con `Membership` activa fueron
  rechazados como “ya tiene acceso”. No hubo invitación ni email adicional y
  ambos roles se mantuvieron iguales. La invitación sintética del primer intento
  fue revocada en la base aislada sin aceptarla ni cambiar el rol; su mensaje
  sigue visible en Mailpit. Luego se aplicó la migración aditiva
  `20261018120000_backfill_legacy_memberships`, que insertó 54 membresías
  elegibles en esta base aislada, conservando rol y estado y omitiendo
  administradores globales y usuarios que ya tenían cualquier membresía. El
  seed se actualizó para mantener membresías con `upsert`; el tenant de
  laboratorio queda con cinco usuarios y cinco membresías activas.
- O-10: un usuario sintético vinculado a otro tenant, una cuenta desactivada y
  una cuenta de administración de plataforma fueron rechazados con sus
  respectivos mensajes. No se crearon invitaciones ni membresías nuevas; el
  buzón permaneció en cuatro mensajes. Se repitieron los bloqueos después de
  la migración: el usuario de otro tenant conserva acceso únicamente a su
  organización y los tres intentos siguen sin crear invitaciones, membresías
  adicionales ni correo. La pila aislada conserva los dos marcadores
  sintéticos y la invitación revocada del primer intento O-09.

Tras reiniciar Codex, la pila aislada siguió saludable: web HTTP 200, PostgreSQL
healthy y Mailpit healthy. La consulta de solo lectura confirmó cinco usuarios,
cinco membresías activas y cuatro eventos de auditoría en el tenant de
laboratorio; antes del siguiente recorrido había dos invitaciones en la pila,
una pendiente y una revocada, y Mailpit conservaba cuatro mensajes locales. No
se imprimieron tokens ni se modificaron registros durante esta comprobación.

- O-20 (invitaciones): se completaron las nueve combinaciones entre idioma de
  interfaz ES/EN/PL y idioma del correo ES/EN/PL, usando destinatarios únicos
  `@synthetic.example.invalid`. Los nueve avisos de éxito de la interfaz
  coincidieron con el idioma del operador. En cada correo se comprobó de forma
  booleana el asunto, saludo y nombre, introducción con rol, vencimiento de
  siete días e instrucción de aceptación. Los enlaces apuntaron a
  `http://localhost:33301/invitations/accept?lang=<idioma>#token=…`; se
  confirmó `lang` correcto y ausencia de token en query. No se imprimieron
  cuerpos, enlaces completos ni tokens. Hubo nueve eventos
  `USER_INVITATION_CREATED` y ninguna auditoría O-20 contenía patrones de token.
  Después de la verificación se revocaron las nueve invitaciones sin aceptarlas;
  no se crearon cuentas ni membresías. Se restauró el plan sintético STARTER y
  la interfaz del operador a español. La comprobación final confirmó nueve
  filas O-20 revocadas, cero aceptadas, una invitación pendiente restante, plan
  STARTER, salud HTTP 200 y trece mensajes totales locales en Mailpit.

- O-13: en el tenant aislado se dejó temporalmente una membresía sintética
  inactiva para alcanzar exactamente el límite STARTER de cinco puestos
  contabilizados (cuatro miembros activos y la invitación O-27 pendiente). Una
  invitación adicional a otro correo `.invalid` recibió el rechazo localizado
  para el límite de cinco. La base confirmó cero invitación y cero usuario para
  ese destinatario y Mailpit siguió en 13 mensajes. Se restauró la membresía
  temporal; el tenant regresó a cinco miembros activos, el plan STARTER y la
  única invitación pendiente O-27. No se alteraron cuentas ni datos reales.

- O-11: con una invitación pendiente local se capturaron en memoria un
  fingerprint del hash, `updatedAt`, eventos de auditoría y cantidad de
  mensajes, sin guardar el token ni el hash en el expediente. A los 41 s se
  enviaron dos solicitudes simultáneas desde pestañas distintas; ambas fueron
  rechazadas por el enfriamiento y no cambió ninguno de esos valores. Tras
  esperar, a los 128 s se repitió la carrera: una pestaña confirmó el reenvío y
  la otra mostró el enfriamiento. Resultado: la misma fila, un solo cambio de
  hash/fecha, un evento y un mensaje adicional, una invitación pendiente. Se
  revocó después la invitación sintética; la base volvió a STARTER con cinco
  miembros activos y una invitación pendiente O-27. Mailpit conserva 15
  mensajes locales, incluidos los dos mensajes de la prueba O-11.

- O-14: se prepararon cuatro membresías activas y ningún puesto pendiente en el
  tenant STARTER. Dos pestañas enviaron invitaciones distintas al mismo tiempo.
  En la primera pasada solo se guardó una invitación, pero la otra mostró un
  error genérico por conflicto serializable `P2034`. Se añadió un único
  reintento de esa transacción y se repitió con otro par sintético: una pestaña
  confirmó el envío y la otra recibió el mensaje localizado de límite de cinco
  usuarios. La base conservó 4 miembros activos y una invitación pendiente;
  para la segunda pasada hubo una sola invitación, auditoría y mensaje, sin
  usuario ni invitación para quien perdió. No quedó un `P2034` en los logs de
  esta repetición. Se revocaron las dos invitaciones sintéticas de ambas
  pasadas y se restauraron la membresía O-09 y el vencimiento de O-27. Estado
  final verificado: STARTER, cinco miembros activos, una pendiente O-27,
  trece invitaciones revocadas, cero usuarios de O-14, Mailpit con 17 mensajes
  y `/api/health` en HTTP 200.

- O-11 (reemisión desde estado no pendiente): se creó una invitación sintética,
  se revocó antes de cumplir 60 s y se reemitió al mismo correo de inmediato.
  Se conservó el mismo registro, rotaron los fingerprints del hash, avanzó
  `updatedAt`, y el total quedó en dos auditorías y dos mensajes. A continuación
  se adelantó el vencimiento de ese mismo registro y se reemitió otra vez sin
  esperar: mismo registro, nueva rotación/fecha, tres auditorías y tres mensajes
  en total; no se creó usuario. No se imprimieron los tokens ni hashes. Se
  revocó la invitación y el plan del laboratorio volvió a STARTER. Estado final
  comprobado: cinco miembros activos, una pendiente O-27, 14 revocadas, cero
  usuarios de la prueba O-11, Mailpit con 20 mensajes y salud HTTP 200.

- O-11 (enlace anterior y estado aceptado): se creó una invitación nueva y se
  comprobó en memoria que el token del primer mensaje coincidía con el hash
  almacenado. Para habilitar la reemisión sin esperar, se envejeció únicamente
  `updatedAt` de esa fila sintética en 61 s; después se reenvió desde la UI al
  mismo destinatario. La invitación conservó su ID y quedó con dos auditorías
  y dos mensajes. El token del mensaje nuevo coincidió con el hash vigente; el
  anterior ya no coincidía y su página local mostró “Esta invitación no es
  válida o ya venció”. Para fijar el comportamiento del caso aceptado se creó
  un marcador temporal `acceptedAt` vinculado al miembro sintético activo; la
  UI rechazó volver a invitarlo con “Ese correo ya tiene acceso a esta
  organización”, sin enviar correo ni crear otra invitación. Se retiró el
  marcador y se revocó la invitación de prueba. No se conservaron tokens ni
  hashes. Estado final: plan STARTER, cinco miembros activos, una pendiente
  O-27, 15 invitaciones revocadas, cero aceptadas, cero usuarios de esta prueba,
  Mailpit con 22 mensajes y `/api/health` en HTTP 200.

- O-12 (enlace de invitación aceptada): se generó un token sintético de 43
  caracteres y se guardó en la base solo su SHA-256, con `acceptedAt` activo en
  el registro de prueba. Al abrir la ruta local con ese enlace, la página mostró
  “Esta invitación no es válida o ya venció”. La base confirmó cero usuario y
  cero membresía para el destinatario. Se eliminó el fixture; el estado volvió
  a STARTER, cinco miembros activos, una invitación pendiente O-27, 15
  revocadas, cero aceptadas, 22 mensajes en Mailpit y salud HTTP 200. El token
  era artificial y no se conservó.

- O-13 (plaza tras vencimiento y estado por encima del cupo): con STARTER,
  cinco miembros activos y O-27 pendiente, se comprobó que una invitación extra
  se rechaza con el límite de cinco y no deja registro, usuario ni correo. Para
  comprobar la plaza liberada, se guardó el vencimiento actual de O-27, se
  venció temporalmente y se pausó una membresía sintética: 4 activos + 0
  pendientes. La UI aceptó una invitación de prueba y Mailpit recibió un
  mensaje. Después se revocó esa fila, se restauraron la membresía y el
  vencimiento previo de O-27, y se repitió la invitación en el estado base de
  5 activos + 1 pendiente; volvió a bloquearse sin crear registros ni correo.
  Estado final: STARTER, cinco miembros activos, una pendiente O-27, 16
  revocadas, cero aceptadas, Mailpit con 23 mensajes y salud HTTP 200. La
  reemisión a la misma dirección tras vencimiento está cubierta por O-11; la
  carrera de último cupo se mantiene como prueba independiente.

- O-18 (auditoría de invitaciones): una consulta de solo lectura examinó 22
  eventos sintéticos `USER_INVITATION_CREATED`. Los 22 tenían actor,
  organización y entidad de invitación; sus detalles incluían correo, rol y
  vencimiento. Cero eventos contenían referencias a token, `#token=`, URL o
  `inviteUrl`. No existe aún evento `USER_INVITATION_ACCEPTED` en la pila, pues
  no se completó la aceptación de una invitación. La inspección del código
  confirma que la acción de aceptación registra actor, organización,
  invitación, correo y rol, pero esa parte permanece pendiente de validación
  funcional.

- O-17 (matriz de roles, 20 oct 2026): con Admin sintético en el tenant de
  laboratorio se enviaron invitaciones a INTERMEDIARIO, LEGAL y LOGISTICA;
  el selector solo mostró esos tres roles. Después se cambió temporalmente la
  membresía de ese usuario sintético a SUPERADMIN y el selector incluyó
  ADMIN; se envió una invitación ADMIN. Los cuatro destinatarios eran
  `@synthetic.example.invalid` y los cuatro mensajes aparecieron en Mailpit.
  Las cuatro filas de invitación se revocaron. La consulta confirmó para cada
  una auditoría `USER_INVITATION_CREATED` con actor, tenant y entidad correctos;
  ningún JSON de detalles coincidió con patrones de token, enlace o URL. No se
  crearon usuarios ni membresías. Se restauraron la membresía ADMIN, el plan
  STARTER y el estado de cinco miembros activos, una invitación O-27 pendiente,
  veinte revocadas y cero aceptadas. La salud local respondió HTTP 200.
  O-09/O-10 ya contienen las comprobaciones locales de invitación a cuenta
  activa, otro tenant, cuenta deshabilitada y administrador de plataforma.
  El 22 oct se añadió una comprobación de aceptación cruzada: se creó una
  organización y una invitación temporales dirigidas al admin autenticado del
  tenant de laboratorio. La pantalla de aceptación mostró la organización y el
  correo coincidente; al enviar la acción, la aplicación respondió con el
  rechazo genérico de invitación inválida. La consulta confirmó `acceptedAt`
  nulo, cero membresías y cero auditorías de aceptación para el fixture; el
  admin mantuvo su organización de laboratorio y rol ADMIN. Se borró la
  organización temporal, que eliminó su invitación en cascada. Estado final:
  11 organizaciones y 21 invitaciones en la pila aislada; health HTTP 200.
  Sigue pendiente enviar un formulario manipulado y repetir O-17 en el release
  aprobado.

- O-16 (configuración SMTP inválida): se ejecutó la aplicación en un contenedor
  local temporal en `127.0.0.1:33302`, con `SMTP_USER` vacío y la misma base
  sintética. El alta pública mostró la confirmación genérica. La base confirmó
  cero solicitud pendiente, usuario u organización para el destinatario de
  prueba; Mailpit permaneció en 23 mensajes. Los logs mostraron
  `smtpConfigured=false` y el aviso genérico, sin el correo de prueba ni detalle
  técnico SMTP. Se eliminó el contenedor temporal sin tocar la pila base.

- O-16 (timeout SMTP): otra instancia web temporal apuntó a un servidor SMTP
  sintético en la red privada de Compose. Ese servidor aceptaba TCP y mantenía
  la conexión abierta sin enviar el saludo. Tras agotarse el límite SMTP de
  20 s, la acción devolvió la confirmación genérica. La base confirmó cero
  solicitud pendiente, usuario u organización para el destinatario de prueba;
  Mailpit siguió en 23 mensajes. Los logs no contenían el correo de prueba ni
  el error `SMTP_TIMEOUT`. Se eliminaron la web temporal y el servidor de
  espera; la pila base permaneció intacta.

Esta evidencia no cubre HTTPS del dominio productivo, SMTP externo ni el ciclo
completo de aceptación de invitaciones. El reenvío concurrente O-11 se recorrió
en dos pestañas, y la carrera del último cupo O-14 también se probó localmente;
siguen pendientes otras carreras y la repetición en la topología productiva.
Las nueve combinaciones de idioma O-20 sí se recorrieron en
Mailpit. Durante ese recorrido se vio que algunas secciones ajenas al mensaje de
invitación conservan etiquetas en español al cambiar la interfaz a inglés o
polaco; el resultado de O-20 acredita solo el formulario y la confirmación de
invitación, no la traducción integral de Ajustes.

La configuración habilita el canal para los casos O-15, O-16, O-20 y O-27 de la
[matriz P4-04](p4-04-onboarding-acceptance-matrix.md). O-15, el rechazo SMTP
451, la configuración incompleta y el timeout local de O-16, además de la
matriz de idiomas O-20, se comprobaron localmente. Siguen pendientes otros
fallos del protocolo SMTP y la repetición en proveedor productivo.

Para repetir O-16, usa el ajuste Chaos de Mailpit para devolver un error `451`
en la fase Recipient con probabilidad
`100%`; envía únicamente a una cuenta `@synthetic.example.invalid`, registra
respuesta/estado de la solicitud sin conservar el enlace, y vuelve la
probabilidad a `0%` (o reinicia Mailpit) antes de comprobar el camino exitoso.
Mailpit permite configurar fallos de Sender, Recipient y Authentication; con
el reinicio se descartan tanto los mensajes como los ajustes de Chaos.

## Referencia de configuración

Mailpit documenta sus puertos predeterminados `8025` (web) y `1025` (SMTP),
además de la opción de autenticación de prueba `MP_SMTP_AUTH_ACCEPT_ANY` en su
[guía de configuración](https://mailpit.axllent.org/docs/configuration/) y
[documentación SMTP](https://mailpit.axllent.org/docs/configuration/smtp/). La
lista de destinatarios se restringe con su opción de expresión regular y la
inyección de errores usa la [función Chaos](https://mailpit.axllent.org/docs/integration/chaos/).
La imagen está fijada a la versión `v1.31.5`, publicada el 11 de octubre de
2026 según el [registro oficial de versiones](https://github.com/axllent/mailpit/releases).
