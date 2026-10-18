import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";

const documents = {
  privacy: {
    file: "politica-privacidad-borrador.md",
    title: "Política de privacidad",
    description: "Información sobre el uso de datos en ORI CRUIT HUB.",
  },
  terms: {
    file: "condiciones-servicio-borrador.md",
    title: "Condiciones de servicio",
    description: "Condiciones B2B de acceso y uso del servicio.",
  },
  google: {
    file: "aviso-oauth-google-drive-borrador.md",
    title: "Aviso de Google Drive",
    description: "Estado real conocido del acceso y las copias de Google Drive.",
  },
  googleHome: {
    file: "google-drive-oauth-home-borrador.md",
    title: "Inicio de Google Auth",
    description: "Página de inicio propuesta para el cliente OAuth de rclone.",
  },
} as const;

type DocumentKey = keyof typeof documents;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inlineMarkdown(value: string) {
  let html = escapeHtml(value);
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return html;
}

function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").split(/\r?\n/);
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };
  const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }
    if (line.startsWith("|")) {
      flushParagraph();
      closeList();
      const header = cells(line);
      const nextIsDivider = /^\|?[\s:|-]+\|?$/.test(lines[index + 1]?.trim() ?? "");
      if (nextIsDivider) index += 1;
      const rows: string[][] = [];
      while (lines[index + 1]?.trim().startsWith("|")) rows.push(cells(lines[++index].trim()));
      html.push(`<div class="legal-preview-table-wrap"><table><thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${header.map((_, cellIndex) => `<td>${inlineMarkdown(row[cellIndex] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }
    if (/^---+$/.test(line)) {
      flushParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const nextList = unordered ? "ul" : "ol";
      if (list !== nextList) {
        closeList();
        html.push(`<${nextList}>`);
        list = nextList;
      }
      html.push(`<li>${inlineMarkdown((unordered ?? ordered)![1])}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return html.join("\n");
}

export default async function LegalPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { doc } = await searchParams;
  const selected = doc && doc in documents ? (doc as DocumentKey) : "privacy";
  const document = documents[selected];
  const markdown = await readFile(path.join(process.cwd(), "docs", "legal", document.file), "utf8");

  return (
    <main className="legal-preview-page">
      <header className="legal-preview-topbar">
        <Link href="/" className="legal-preview-brand">ORI <span>CRUIT HUB</span></Link>
        <span className="legal-preview-mode">VISTA PREVIA LOCAL · NO PUBLICADO</span>
      </header>
      <section className="legal-preview-heading">
        <p className="legal-preview-eyebrow">TRANSPARENCIA / DOCUMENTOS</p>
        <h1>Información legal</h1>
        <p>Revisa cómo se presenta cada documento antes de aprobar su contenido y publicarlo.</p>
      </section>
      <nav className="legal-preview-tabs" aria-label="Documentos legales">
        {(Object.keys(documents) as DocumentKey[]).map((key) => (
          <Link key={key} href={`/legal-preview?doc=${key}`} aria-current={selected === key ? "page" : undefined}>
            <span>{documents[key].title}</span>
            <small>{documents[key].description}</small>
          </Link>
        ))}
      </nav>
      <article className="legal-preview-document">
        <div className="legal-preview-document-head">
          <div><span className="legal-preview-draft-tag">BORRADOR · NO PUBLICAR</span><p>{document.description}</p></div>
          <a href={`/legal-preview?doc=${selected}`} className="legal-preview-permalink">Vista / {selected.toUpperCase()}</a>
        </div>
        <div className="legal-preview-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />
      </article>
      <footer className="legal-preview-footer">ORI CRUIT HUB <span>·</span> Revisión interna de documentos</footer>
    </main>
  );
}
