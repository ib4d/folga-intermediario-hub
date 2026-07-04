import { updateCandidate } from "@/app/actions/candidates";
import { auth } from "@/auth";
import { canAccessCandidateByOwnership, canCreateCandidates } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { candidateAccessWhere, requireTenant } from "@/lib/tenant";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canCreateCandidates(tenant.role)) redirect("/sin-permisos");

  const resolvedParams = await params;

  const candidate = await prisma.candidate.findFirst({
    where: candidateAccessWhere(tenant, resolvedParams.id),
  });

  if (!candidate) notFound();
  if (!canAccessCandidateByOwnership(tenant.role, candidate.intermediaryId, tenant.userId)) {
    redirect("/sin-permisos");
  }

  return (
    <>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href={`/candidatos/${candidate.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--muted)",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          <ArrowLeft size={16} /> Volver al candidato
        </Link>
      </div>

      <div className="card" style={{ maxWidth: "1040px", margin: "0 auto" }}>
        <div
          className="card-header"
          style={{ marginBottom: "2rem", borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem" }}
        >
          <h2>Editar Perfil del Candidato</h2>
        </div>

        <form
          action={async (formData) => {
            "use server";
            await updateCandidate(candidate.id, formData);
          }}
        >
          <div className="dashboard-grid" style={{ gap: "1rem" }}>
            <div className="input-group">
              <label className="label" htmlFor="firstName">Nombre(s)</label>
              <input type="text" id="firstName" name="firstName" className="input" defaultValue={candidate.firstName ?? ""} required />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="lastName">Apellidos</label>
              <input type="text" id="lastName" name="lastName" className="input" defaultValue={candidate.lastName ?? ""} required />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="country">Pais</label>
              <input type="text" id="country" name="country" className="input" defaultValue={candidate.country ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="nationality">Nacionalidad</label>
              <input type="text" id="nationality" name="nationality" className="input" defaultValue={candidate.nationality ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="phone">Telefono</label>
              <input type="tel" id="phone" name="phone" className="input" defaultValue={candidate.phone ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="email">Email</label>
              <input type="email" id="email" name="email" className="input" defaultValue={candidate.email ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="dateOfBirth">Fecha de nacimiento</label>
              <input type="date" id="dateOfBirth" name="dateOfBirth" className="input" defaultValue={toDateInputValue(candidate.dateOfBirth)} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="gender">Sexo</label>
              <select id="gender" name="gender" className="input" defaultValue={candidate.gender ?? ""}>
                <option value="">Seleccionar...</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="birthPlace">Lugar de nacimiento</label>
              <input type="text" id="birthPlace" name="birthPlace" className="input" defaultValue={candidate.birthPlace ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="birthCountry">Pais de nacimiento</label>
              <input type="text" id="birthCountry" name="birthCountry" className="input" defaultValue={candidate.birthCountry ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="passportNumber">Pasaporte</label>
              <input type="text" id="passportNumber" name="passportNumber" className="input" defaultValue={candidate.passportNumber ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="passportBiometric">Pasaporte biometrico</label>
              <select
                id="passportBiometric"
                name="passportBiometric"
                className="input"
                defaultValue={candidate.passportBiometric === null ? "" : candidate.passportBiometric ? "true" : "false"}
              >
                <option value="">Sin definir</option>
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="passportIssueDate">Fecha de expedicion pasaporte</label>
              <input type="date" id="passportIssueDate" name="passportIssueDate" className="input" defaultValue={toDateInputValue(candidate.passportIssueDate)} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="passportExpiry">Fecha de vencimiento pasaporte</label>
              <input type="date" id="passportExpiry" name="passportExpiry" className="input" defaultValue={toDateInputValue(candidate.passportExpiry)} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="peselNumber">PESEL</label>
              <input type="text" id="peselNumber" name="peselNumber" className="input" defaultValue={candidate.peselNumber ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="kartaPobytuNumber">Karta Pobytu</label>
              <input type="text" id="kartaPobytuNumber" name="kartaPobytuNumber" className="input" defaultValue={candidate.kartaPobytuNumber ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="kartaPobytuType">Tipo de karta</label>
              <input type="text" id="kartaPobytuType" name="kartaPobytuType" className="input" defaultValue={candidate.kartaPobytuType ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="kartaPobytuIssueDate">Fecha de expedicion karta</label>
              <input type="date" id="kartaPobytuIssueDate" name="kartaPobytuIssueDate" className="input" defaultValue={toDateInputValue(candidate.kartaPobytuIssueDate)} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="kartaPobytuExpiry">Fecha de vencimiento karta</label>
              <input type="date" id="kartaPobytuExpiry" name="kartaPobytuExpiry" className="input" defaultValue={toDateInputValue(candidate.kartaPobytuExpiry)} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="heightCm">Estatura (cm)</label>
              <input type="number" id="heightCm" name="heightCm" className="input" min={0} step={1} defaultValue={candidate.heightCm ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="polishCity">Ciudad PL</label>
              <input type="text" id="polishCity" name="polishCity" className="input" defaultValue={candidate.polishCity ?? ""} />
            </div>

            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="polishAddress">Direccion PL</label>
              <input type="text" id="polishAddress" name="polishAddress" className="input" defaultValue={candidate.polishAddress ?? ""} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="arrivalDate">Llegada</label>
              <input type="date" id="arrivalDate" name="arrivalDate" className="input" defaultValue={toDateInputValue(candidate.arrivalDate)} />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="accommodation">Alojamiento</label>
              <input type="text" id="accommodation" name="accommodation" className="input" defaultValue={candidate.accommodation ?? ""} />
            </div>

            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="notes">Notas</label>
              <textarea id="notes" name="notes" className="input" rows={5} defaultValue={candidate.notes ?? ""} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
            <Link href={`/candidatos/${candidate.id}`} className="button button-secondary">
              Cancelar
            </Link>
            <button type="submit" className="button">
              <Save size={18} />
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
