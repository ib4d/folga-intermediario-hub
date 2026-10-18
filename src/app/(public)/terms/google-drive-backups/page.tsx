import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Condiciones de uso — ORI CRUIT HUB VPS Backups",
  description: "Condiciones de uso de la herramienta privada de copias de recuperación.",
};

const isDraftPreview = process.env.NODE_ENV !== "production";

export default function GoogleDriveBackupTermsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="legal-preview-page">
      <header className="legal-preview-topbar">
        <a href="/oauth/google-drive-backups" className="legal-preview-brand">ORI <span>CRUIT HUB</span></a>
        <span className="legal-preview-mode">CONDICIONES DE USO</span>
      </header>
      <section className="legal-preview-heading">
        <p className="legal-preview-eyebrow">CONDICIONES / HERRAMIENTA OPERATIVA</p>
        <h1>Uso de ORI CRUIT HUB VPS Backups.</h1>
        <p>Última actualización: 9 de octubre de 2026.</p>
      </section>
      <article className="legal-preview-prose">
        {isDraftPreview && <p><strong>Vista local para revisión; todavía no publicada.</strong></p>}
        <p>
          Estas condiciones describen la herramienta privada de copias de recuperación operada por
          Abad Bolanos Automatyzacja Biznesu i HR (Ori Craft Labs), Grochowska 102, 60-363 Poznań,
          Polonia. No ofrecen una cuenta pública ni un servicio de almacenamiento a otras agencias.
        </p>
        <h2>Finalidad y uso autorizado</h2>
        <p>
          La herramienta usa rclone en el VPS para preparar copias de recuperación de ORI CRUIT HUB y,
          cuando lo decide el operador, transferirlas a Google Drive. Solo puede usarse para continuidad
          y recuperación del servicio, bajo las instrucciones documentadas de las agencias responsables
          y los acuerdos de tratamiento aplicables.
        </p>
        <h2>Permisos de Google Drive</h2>
        <p>
          La autorización permite técnicamente a rclone ver, crear, modificar y borrar archivos en todo
          el Drive de la cuenta autorizante. La ruta de carpeta configurada para las copias guía el uso
          habitual, pero no reduce el alcance que concede Google. Quien autoriza debe tener autoridad
          sobre esa cuenta y entender ese alcance.
        </p>
        <h2>Copias, conservación y límites</h2>
        <p>
          La copia local se genera diariamente y los archivos locales de más de 30 días se eliminan.
          Los conjuntos completos disponibles se suben automáticamente cifrados a Google Drive y se
          verifican por tamaño. Los directorios gestionados se eliminan permanentemente cuando su fecha
          supera 30 días; la purga no afecta a otros archivos o carpetas de Drive. La herramienta no
          garantiza una restauración hasta que esta se ejecute y verifique para el conjunto
          correspondiente; deben mantenerse los acuerdos y procedimientos de recuperación aplicables
          con cada agencia.
        </p>
        <h2>Responsabilidades y contacto</h2>
        <p>
          El operador limita el uso a las finalidades descritas y protege la configuración de acceso.
          Las agencias siguen siendo responsables de sus instrucciones, bases jurídicas, avisos a las
          personas y plazos aplicables. Para consultas, contacte con {" "}
          <a href="mailto:ori.cruit@ori-craftlabs.com">ori.cruit@ori-craftlabs.com</a>.
        </p>
        <p>
          <a href="/privacy/google-drive-backups">Aviso de privacidad</a>
          {" · "}
          <a href="/oauth/google-drive-backups">Página de la herramienta</a>
        </p>
      </article>
      <footer className="legal-preview-footer">ORI CRAFT LABS <span>·</span> Condiciones de uso</footer>
    </main>
  );
}
