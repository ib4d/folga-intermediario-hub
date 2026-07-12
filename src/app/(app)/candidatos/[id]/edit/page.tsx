import { auth } from "@/auth";
import { updateCandidate } from "@/app/actions/candidates";
import PageHeader from "@/components/ui/PageHeader";
import { canAccessCandidateByOwnership, canCreateCandidates } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { candidateAccessWhere, requireTenant } from "@/lib/tenant";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function SectionCard({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`card candidate-form-section${wide ? " candidate-form-section--wide" : ""}`}>
      <div className="card-header candidate-form-section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p className="candidate-form-section-description">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
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
    <div className="candidate-form-shell">
      <PageHeader
        eyebrow="Candidatos"
        title="Editar perfil del candidato"
        description="Ajusta datos personales, documentos y señales operativas sin depender solo de la importación."
        icon={<ArrowLeft size={18} />}
        actions={
          <Link href={`/candidatos/${candidate.id}`} className="button button-secondary">
            <ArrowLeft size={16} />
            Volver
          </Link>
        }
      />

      <div className="card candidate-form-card">
        <form
          action={async (formData) => {
            "use server";
            await updateCandidate(candidate.id, formData);
          }}
        >
          <div className="candidate-form-grid">
            <SectionCard
              title="Datos básicos"
              description="Identidad principal y datos de contacto del candidato."
            >
              <div className="dashboard-grid">
                <div className="input-group">
                  <label className="label" htmlFor="firstName">Nombre(s)</label>
                  <input type="text" id="firstName" name="firstName" className="input" defaultValue={candidate.firstName ?? ""} required />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="lastName">Apellidos</label>
                  <input type="text" id="lastName" name="lastName" className="input" defaultValue={candidate.lastName ?? ""} required />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="country">País de origen</label>
                  <input type="text" id="country" name="country" className="input" defaultValue={candidate.country ?? ""} />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="nationality">Nacionalidad</label>
                  <input type="text" id="nationality" name="nationality" className="input" defaultValue={candidate.nationality ?? ""} />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="phone">Teléfono</label>
                  <input type="tel" id="phone" name="phone" className="input" defaultValue={candidate.phone ?? ""} />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" className="input" defaultValue={candidate.email ?? ""} />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Documentación"
              description="Datos principales del pasaporte y de la residencia en Polonia."
            >
              <div className="dashboard-grid">
                <div className="input-group">
                  <label className="label" htmlFor="passportNumber">Pasaporte</label>
                  <input type="text" id="passportNumber" name="passportNumber" className="input" defaultValue={candidate.passportNumber ?? ""} />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="passportBiometric">Pasaporte biométrico</label>
                  <select
                    id="passportBiometric"
                    name="passportBiometric"
                    className="input"
                    defaultValue={candidate.passportBiometric === null ? "" : candidate.passportBiometric ? "true" : "false"}
                  >
                    <option value="">Sin definir</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="passportIssueDate">Fecha de expedición pasaporte</label>
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
                  <label className="label" htmlFor="kartaPobytuIssueDate">Fecha de expedición karta</label>
                  <input type="date" id="kartaPobytuIssueDate" name="kartaPobytuIssueDate" className="input" defaultValue={toDateInputValue(candidate.kartaPobytuIssueDate)} />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="kartaPobytuExpiry">Fecha de vencimiento karta</label>
                  <input type="date" id="kartaPobytuExpiry" name="kartaPobytuExpiry" className="input" defaultValue={toDateInputValue(candidate.kartaPobytuExpiry)} />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Residencia y operación"
              description="Atributos que impactan la gestión operativa del candidato."
              wide
            >
              <div className="dashboard-grid">
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
                  <label className="label" htmlFor="birthCountry">País de nacimiento</label>
                  <input type="text" id="birthCountry" name="birthCountry" className="input" defaultValue={candidate.birthCountry ?? ""} />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="heightCm">Estatura (cm)</label>
                  <input type="number" id="heightCm" name="heightCm" className="input" min={0} step={1} defaultValue={candidate.heightCm ?? ""} />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="polishCity">Ciudad en Polonia</label>
                  <input type="text" id="polishCity" name="polishCity" className="input" defaultValue={candidate.polishCity ?? ""} />
                </div>

                <div className="input-group candidate-form-span-full">
                  <label className="label" htmlFor="polishAddress">Dirección en Polonia</label>
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

                <div className="input-group candidate-form-span-full">
                  <label className="label" htmlFor="notes">Notas</label>
                  <textarea id="notes" name="notes" className="input" rows={5} defaultValue={candidate.notes ?? ""} />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="candidate-form-actions">
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
    </div>
  );
}
