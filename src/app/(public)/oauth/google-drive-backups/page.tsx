import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "ORI CRUIT HUB VPS Backups",
  description: "Información sobre la herramienta privada de copias cifradas de ORI CRUIT HUB.",
};

const isDraftPreview = process.env.NODE_ENV !== "production";

export default function GoogleDriveBackupHomePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="legal-preview-page">
      <header className="legal-preview-topbar">
        <a href="/" className="legal-preview-brand">ORI <span>CRUIT HUB</span></a>
        <span className="legal-preview-mode">COPIAS DE RECUPERACIÓN</span>
      </header>
      <section className="legal-preview-heading">
        <p className="legal-preview-eyebrow">ORI CRAFT LABS / HERRAMIENTA OPERATIVA</p>
        <h1>Copias de recuperación cifradas.</h1>
        <p>
          ORI CRUIT HUB VPS Backups es una herramienta privada que usa rclone desde un VPS para
          conservar copias de recuperación de la base de datos y los documentos locales de ORI CRUIT HUB.
        </p>
      </section>
      <article className="legal-preview-prose">
        {isDraftPreview && <p><strong>Vista local para revisión; todavía no publicada.</strong></p>}
        <h2>Cómo funciona</h2>
        <p>
          El VPS crea cada día un conjunto local de base de datos y documentos. Los archivos locales
          se conservan durante un máximo operativo aproximado de 30 días. Los conjuntos completos
          disponibles se suben automáticamente cifrados a una carpeta de Google Drive designada para
          las copias.
        </p>
        <p>
          La rutina vuelve a intentar subir los conjuntos locales completos que aún conserva y, cuando
          termina la transferencia, verifica que coincidan en tamaño. Elimina de forma permanente los
          directorios de respaldo gestionados cuya fecha supere 30 días. Esta purga se limita a esos
          directorios; no elimina otros archivos ni carpetas de Drive.
        </p>
        <h2>Acceso a Google Drive</h2>
        <p>
          Para transferir y recuperar los archivos, rclone solicita el permiso amplio de Google Drive.
          Google concede técnicamente a la aplicación acceso de lectura, creación, modificación y
          eliminación a los archivos de todo el Drive de la cuenta autorizante. La carpeta configurada
          para copias orienta el uso normal, pero no limita técnicamente ese permiso.
        </p>
        <p>
          Antes de subirlos, rclone crypt cifra los contenidos y nombres de los archivos en el VPS.
          Google recibe objetos cifrados y metadatos de almacenamiento, no los nombres ni el contenido
          en claro. La clave permanece en el VPS bajo acceso restringido al operador.
        </p>
        <h2>Operador y contacto</h2>
        <p>
          Abad Bolanos Automatyzacja Biznesu i HR, que opera como Ori Craft Labs, Grochowska 102,
          60-363 Poznań, Polonia.
        </p>
        <p>Para consultas sobre esta herramienta: <a href="mailto:ori.cruit@ori-craftlabs.com">ori.cruit@ori-craftlabs.com</a>.</p>
        <p>
          <a href="/privacy/google-drive-backups">Aviso de privacidad</a>
          {" · "}
          <a href="/terms/google-drive-backups">Condiciones de uso</a>
        </p>
      </article>
      <footer className="legal-preview-footer">ORI CRAFT LABS <span>·</span> ORI CRUIT HUB VPS Backups</footer>
    </main>
  );
}
