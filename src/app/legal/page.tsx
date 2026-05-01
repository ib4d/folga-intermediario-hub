import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { ShieldAlert, CheckCircle, XCircle, Eye } from "lucide-react";
import Link from "next/link";
import { updateCandidateStatus } from "@/app/actions/candidates";

export default async function LegalPage() {
  await requireRole(["SUPERADMIN", "ADMIN", "LEGAL"]);

  const candidates = await prisma.candidate.findMany({
    where: { status: "EN_REVISION_LEGAL" },
    include: {
      intermediary: { select: { name: true } },
      documents: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "2rem", backgroundColor: "var(--amber-flame)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <ShieldAlert size={32} />
          <div>
            <h1 style={{ margin: 0 }}>Auditoría Legal</h1>
            <p style={{ margin: 0, fontWeight: "bold" }}>{candidates.length} expedientes pendientes de revisión</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Intermediario</th>
              <th>Documentos Subidos</th>
              <th>País</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: "bold" }}>{c.firstName} {c.lastName}</td>
                <td>{c.intermediary.name}</td>
                <td>{c.documents.length} archivos</td>
                <td>{c.country}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link href={`/candidatos/${c.id}`} className="button button-secondary" style={{ padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Eye size={16} /> Revisar
                    </Link>
                    <form action={async () => {
                      "use server";
                      await updateCandidateStatus(c.id, "APROBADO");
                    }}>
                      <button type="submit" className="button" style={{ backgroundColor: "#4ade80", color: "#064e3b", borderColor: "#064e3b", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <CheckCircle size={16} /> Aprobar
                      </button>
                    </form>
                    <form action={async (formData) => {
                      "use server";
                      const reason = formData.get("reason") as string;
                      await updateCandidateStatus(c.id, "RECHAZADO", reason);
                    }} style={{ display: "flex", gap: "0.5rem" }}>
                      <input type="text" name="reason" placeholder="Motivo rechazo..." className="input" style={{ width: "150px", padding: "0.25rem" }} required />
                      <button type="submit" className="button" style={{ backgroundColor: "#fca5a5", color: "#7f1d1d", borderColor: "#7f1d1d", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <XCircle size={16} /> Rechazar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                  No hay candidatos pendientes de revisión legal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
