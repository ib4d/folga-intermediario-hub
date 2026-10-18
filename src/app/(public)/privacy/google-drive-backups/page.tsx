import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Aviso de privacidad — ORI CRUIT HUB VPS Backups",
  description: "Cómo usa la herramienta de copias el acceso a Google Drive y protege los archivos de respaldo.",
};

const isDraftPreview = process.env.NODE_ENV !== "production";

export default function GoogleDriveBackupPrivacyPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="legal-preview-page">
      <header className="legal-preview-topbar">
        <a href="/oauth/google-drive-backups" className="legal-preview-brand">ORI <span>CRUIT HUB</span></a>
        <span className="legal-preview-mode">PRIVACIDAD / GOOGLE DRIVE</span>
      </header>
      <section className="legal-preview-heading">
        <p className="legal-preview-eyebrow">AVISO DE PRIVACIDAD</p>
        <h1>Copias de recuperación en Google Drive.</h1>
        <p>Última actualización: 9 de octubre de 2026.</p>
      </section>
      <article className="legal-preview-prose">
        {isDraftPreview && <p><strong>Vista local para revisión; todavía no publicada.</strong></p>}
        <p>
          Este aviso describe únicamente la herramienta privada ORI CRUIT HUB VPS Backups, que usa
          rclone para transferir copias de recuperación. No sustituye el aviso que cada agencia debe
          facilitar a sus candidatos sobre el uso de ORI CRUIT HUB.
        </p>
        <h2>Responsable y contacto</h2>
        <p>
          El operador es Abad Bolanos Automatyzacja Biznesu i HR, que opera como Ori Craft Labs,
          Grochowska 102, 60-363 Poznań, Polonia. Contacto: {" "}
          <a href="mailto:ori.cruit@ori-craftlabs.com">ori.cruit@ori-craftlabs.com</a>.
        </p>
        <h2>Datos tratados y finalidad</h2>
        <p>
          Las copias pueden incluir registros de la base de datos y documentos privados cargados por
          las agencias, incluidos datos personales de candidatos y documentos de identidad o migración.
          El contenido depende de la información que cada agencia haya incorporado al sistema.
        </p>
        <p>
          La finalidad es mantener copias para continuidad y recuperación ante pérdida o fallo del VPS.
          Los datos no se usan mediante esta herramienta para publicidad, perfilado, selección de
          candidatos, venta de datos ni entrenamiento de modelos. Para los datos de candidatos, la
          agencia determina fines y medios; Ori Craft Labs actúa según instrucciones documentadas y
          el acuerdo de tratamiento aplicable.
        </p>
        <p>
          Cada agencia determina y documenta la base jurídica aplicable a los datos de sus candidatos.
          Para los datos técnicos de administración y seguridad propios del operador, la base es su
          interés legítimo en proteger y mantener la herramienta y sus copias.
        </p>
        <h2>Acceso de Google Drive</h2>
        <p>
          rclone solicita el alcance OAuth <code>https://www.googleapis.com/auth/drive</code>. Este
          alcance permite técnicamente leer, crear, modificar y eliminar archivos en todo el Drive de
          la cuenta que autoriza la aplicación. La configuración habitual apunta a una carpeta de
          copias, pero esa carpeta no es una restricción de permisos aplicada por Google. El uso de
          esta herramienta se limita a operaciones de copia y recuperación.
        </p>
        <h2>Cifrado, almacenamiento y proveedores</h2>
        <p>
          rclone crypt cifra los contenidos y nombres de los archivos en el VPS antes de subirlos.
          Google Drive recibe objetos cifrados y puede procesar metadatos técnicos del almacenamiento,
          como la existencia, tamaño y fechas de los objetos. La clave de cifrado se conserva en el VPS
          en un archivo de rclone con acceso restringido a root; no se envía a Google. Una intrusión que
          alcance el VPS y esa configuración podría comprometer tanto las copias locales como la clave.
        </p>
        <p>
          Hostinger proporciona el alojamiento del VPS y Google proporciona Google Drive. Cada
          proveedor procesa los datos conforme a sus propios términos y condiciones. La cuenta
          autorizada es una cuenta de Google gestionada por el operador; no hay una región de Drive
          configurada por esta herramienta. La ubicación y las transferencias aplicables dependen del
          servicio y los términos de Google, por lo que no se afirma que todos los objetos permanezcan
          en el Espacio Económico Europeo.
        </p>
        <h2>Conservación y eliminación</h2>
        <p>
          El VPS genera un conjunto local diario y elimina automáticamente los archivos locales cuya
          antigüedad supera 30 días. rclone sube a Drive los conjuntos completos que aún estén en el
          almacenamiento local y vuelve a intentarlo en ejecuciones posteriores si una transferencia
          falla. Después de cada transferencia verifica los archivos por tamaño. Los conjuntos cifrados
          se conservan en Drive hasta 30 días desde la fecha incluida en su directorio de respaldo; los
          directorios gestionados que superen ese plazo se eliminan permanentemente, no se envían a la
          papelera. La rutina solo borra directorios con el patrón de nombre y fecha de sus copias; no
          elimina otros archivos ni carpetas de Drive. Revocar el permiso OAuth detiene futuras
          operaciones, pero no borra objetos existentes.
        </p>
        <p>
          Como las copias contienen conjuntos de datos completos, eliminar un expediente del sistema
          operativo no lo quita inmediatamente de copias ya creadas. Para solicitar una actuación sobre
          un expediente de candidato, la persona debe dirigirse primero a la agencia que lo incorporó;
          esa agencia puede instruir al operador. Las consultas sobre esta conexión se atienden en el
          correo de contacto indicado arriba.
        </p>
        <h2>Derechos y reclamaciones</h2>
        <p>
          Para ejercer derechos sobre datos tratados por una agencia, contacte con esa agencia. Para
          datos propios del operador o consultas sobre la herramienta, escriba a {" "}
          <a href="mailto:ori.cruit@ori-craftlabs.com">ori.cruit@ori-craftlabs.com</a>. También puede
          presentar una reclamación ante la autoridad de protección de datos competente, incluida la
          autoridad polaca cuando corresponda.
        </p>
        <p><a href="/oauth/google-drive-backups">Volver a ORI CRUIT HUB VPS Backups</a></p>
      </article>
      <footer className="legal-preview-footer">ORI CRAFT LABS <span>·</span> Aviso de privacidad</footer>
    </main>
  );
}
