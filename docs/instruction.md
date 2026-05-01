FOLGA INTERMEDIARIO HUB 1.0

Actua como un experto (mas de 20 anos) en web dev, mobile apps, arquitecto y database manager. Necesitamos resolver la siguiente problematica:

CONTEXTO:
- soy reclutador de personal extranjero para la empresa FOLGA en Polonia
- tengo a cargo un pequeno grupo de intermediarios que se encargan de reclutar trabajadores de latam para la empresa
- los intermediarios consiguen de los trabajadores documentos migratorios para evaluar su aceptabilidad de contratacion legal por parte de la empresa: pasaportes (con pagina principal, visas-si aplica, sellos de salida y entrada -pasi de origen y/o union europea), documento pesel polaco (si aplica), karta pobytu polaca (si aplica), decision del voivodato (si aplica -en caso de no tener al menos se entrega el numero del caso en el voivodato), otros documentos migratorios
- una vez recolectados losdocumentos, crean perfiles de candidatos en Hrappka (aplicacion tipo CRM polaca) y yo reviso la informacion anadida y el estatus del candidato 
- si el equipo de legal acepta los candidatos, estos son contactados para firmar contrato y crear permiso de trabajo (tiempo estimado 3 semanas)
- si los candidatos aun son rechazados por legal, se debera a las siguientes razones: falta de documentos migratorios, fecha de expiracion de alguno o todos los documentos cerca de expirar o expirados, candidatos que trabajaron para Folga pero con mal historial laboral o de comportamiento, entre otros
- paises que cubrimos: toda latinoamerica, principalmente colombia, peru, guatemala, venezuela, cuba
- documentos recopilados: emitidos en pais de origen del candidato, y emitidos en Polonia para inmigrantes
- campos recopilados para la creacion de base de datos: todos los pertinentes a cada documento, independientemente del pais de procedencia o Polonia
- yo coordino con intermediarios la gestion de documentos, comunicacion con equipo de legal, mi manager y con los intermediarios; tambien coordino fechas de llegada a oficinas de Kutno (donde se firma contrato, se emite permiso de trabajo, etc) ya sea en avion, tren, o coche; mantengo comunicacion con intermediarios, mi manager y legal; hago seguimiento de estatus de candidatos, gestion de base de datos de los mismos (generando excel/csv para HR / marketing / reclutamiento / direccion), asi como generacion de reportes para los diferentes equipos de la empresa (ya mencionados en esta linea)
- reviso y mantengo conversaciones con todos los implicados por whatsapp como via principal de dialogo entre partes interesadas (aunque se usa en menor grado correo empresarial de outlook)
- se contrata personal preferentemente ya desde polonia (los que ya estan en el territorio polaco), aunque tambien desde colombia, guatemala, peru. los candidatos tambien viajan por sus propios medios y solicitan contratacion al contactarse con nosotros
- los candidatos deben pagar un importe de 400pln al momento de aceptacion y movida a Kutno para creacion de permiso de trabajo. este comprobante se anade tambien como recurso de documentacion legitimizando y garantizando que el pago para inicio de proceso puede ser efectuado (de lo contrario y hasta tanto no se pague, no se puede iniciar proceso)


PROBLEMATICA:
- desconexion entre partes implicadas (hay que constantemente contactar por mensajeria o llamada con implicados para averiguar estado real del pipeline lo cual requiere una inmensa cantidad de tiempo en gestiones administrativas)
- uso de whatsapp como recurso principal hace que el proceso se ralentice por razones de desorganizacion, caotico pipeline, directrices no claras e incluso requerimiento de repeticion de instrucciones que deberian estar firmemente aseguradas desde el principio
- manejo de multiples tablas de excel para una misma fuente y base de datos similar/igual para diferentes departamentos
- requerimiento de multiples pasos desde el contacto con el candidato hasta finalizar contratacion/permiso de trabajo/empezar a trabajar
- multiples problematicas de logistica: transporte, recogida de candidatos en terminales aeropuerto/estacion de trenes/coches empresariales/candidatos que vienen por su propia cuenta a Kutno
- actualizacion de bases de datos (todas con campos similares) en dependencia del estado del proceso
- constante chequeo de actualidad de candidatos / conversaciones con intermediarios / recopilacion de documentos / validacion de documentos / disimiles plataformas de gestion de archivos (OneDrive, hrappka, excel, etc)
- necesidad de anadir candidatos a ultima hora por mediacion de mensajes de urgencia dada una situacion critica y requerida rapidez y respuesta instantanea
- imposibilidad de llevarlo todo al mismo tiempo con el rigor requerido (se pierde mucho tiempo en acciones que pueden ser automatizadas, como la creacion / actualizacion de los perfiles de candidatos, informaciones de ultima hora y actualidad, generacion de reportes basados en estado actual de reclutamiento, etc)
- inexistencia de manuales de instrucciones para saber que hacer en cada caso dependiendo del estatus del pipeline, asi como los rigores y requerimientos migratorios y documentacion legal para la contratacion de candidatos extranjeros en Polonia

IDIOMA:
- se habla principalmente en espanol, aunque los miembros de la empresa hablamos polaco tambien

APLICACION:
- necesidad de creacion de aplicacion (principalmente para mobil, y en un segundo plano para web desktop) que garantice que todos los implicados esten actualizados y mantengan rigurosamente las directrices y procedimientos y actualizaciones del pipeline al instante
- idioma principal espanol para garantizar claro entendimiento de todas las partes
- inicios de sesion y acceso para: superadmin, admin, intermediarios, legal, etc
- necesidad de anadir gestiones y funcionalidades logisticas de oficina, migracion, transporte y derivados
- diseno minimalista y claro, con un facil manejo y navegacion
- garantizar acceso a candidatos para la introduccion de sus datos mediante encuesta que actualizara automaticamente la base de datos una vez submitida su respuesta
- automatizacion de procesos
- posibilidad de que la app lea documentos de imagen y actualice/cree base de datos automaticamente
- generacion y descarga de documentos (preferiblemente excel/csv, pdf o word)
- generacion de reportes visuales que ayuden a entender estadisticas y dar seguimiento para encontrar fallos en el proceso, donde hay errores, donde hay cuellos de botella, donde se puede mejorar, gestion de finanzas, etc