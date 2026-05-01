import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { Car, MapPin, Calendar, Clock, Plane } from "lucide-react";
import { createLogisticsEvent } from "@/app/actions/logistics";

export default async function LogisticaPage() {
  await requireRole(["SUPERADMIN", "ADMIN", "INTERMEDIARIO"]);

  const session = await auth();
  const whereClause = session?.user.role === "INTERMEDIARIO" 
    ? { intermediaryId: session?.user.id, status: { in: ["APROBADO", "EN_PROCESO_PERMISO"] } }
    : { status: { in: ["APROBADO", "EN_PROCESO_PERMISO"] } };

  const candidates = await prisma.candidate.findMany({
    where: whereClause as any,
    include: {
      logistics: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "2rem", backgroundColor: "var(--ghost-white)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Plane size={32} />
          <div>
            <h1 style={{ margin: 0 }}>Centro de Logística</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>Planificación de llegadas a Kutno</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {candidates.map((c) => (
          <div key={c.id} className="card">
            <h3>{c.firstName} {c.lastName}</h3>
            <p style={{ margin: "0 0 1rem 0", color: "var(--muted)" }}>{c.country}</p>
            
            {c.logistics.length > 0 ? (
              <div style={{ backgroundColor: "var(--white-smoke)", padding: "1rem", border: "1px solid var(--pitch-black)", marginBottom: "1rem" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Último Viaje Registrado:</p>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={16}/> {new Date(c.logistics[0].arrivalDate).toLocaleString()}</p>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><MapPin size={16}/> {c.logistics[0].terminal} ({c.logistics[0].transportType})</p>
              </div>
            ) : (
              <div style={{ padding: "1rem", backgroundColor: "#fef3c7", border: "1px solid #d97706", marginBottom: "1rem" }}>
                Sin viaje planificado
              </div>
            )}

            <form action={async (formData) => { "use server"; await createLogisticsEvent(formData); }} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <input type="hidden" name="candidateId" value={c.id} />
              
              <label className="label" style={{ marginBottom: 0 }}>Transporte</label>
              <select name="transportType" className="input" required>
                <option value="AVION">Avión</option>
                <option value="TREN">Tren</option>
                <option value="COCHE_EMPRESA">Coche de Empresa</option>
                <option value="PROPIO">Propio</option>
              </select>

              <label className="label" style={{ marginBottom: 0 }}>Fecha y Hora de Llegada</label>
              <input type="datetime-local" name="arrivalDate" className="input" required />

              <label className="label" style={{ marginBottom: 0 }}>Terminal / Estación</label>
              <input type="text" name="terminal" className="input" placeholder="Ej. Modlin, Chopin, Kutno PKP" required />

              <label className="label" style={{ marginBottom: 0 }}>Responsable de recogida</label>
              <input type="text" name="pickedUpBy" className="input" placeholder="Nombre de quien recoge" />

              <button type="submit" className="button" style={{ marginTop: "0.5rem" }}>
                Registrar Llegada
              </button>
            </form>
          </div>
        ))}
        {candidates.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", backgroundColor: "white", border: "2px solid black" }}>
            No hay candidatos aprobados pendientes de logística.
          </div>
        )}
      </div>
    </div>
  );
}
