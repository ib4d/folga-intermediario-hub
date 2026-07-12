import { createCandidate } from "@/app/actions/candidates";
import PageHeader from "@/components/ui/PageHeader";
import { canCreateCandidates } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NuevoCandidatoPage() {
  const tenant = await requireTenant();
  if (!canCreateCandidates(tenant.role)) redirect("/sin-permisos");

  return (
    <div className="candidate-form-shell">
      <PageHeader
        eyebrow="Candidatos"
        title="Nuevo candidato"
        description="Crea un perfil base con los datos mínimos y completa el resto después sin depender de la importación."
        icon={<ArrowLeft size={18} />}
        actions={
          <Link href="/candidatos" className="button button-secondary">
            <ArrowLeft size={16} />
            Volver
          </Link>
        }
      />

      <div className="card candidate-form-card">
        <form
          action={async (formData) => {
            "use server";
            await createCandidate(formData);
          }}
        >
          <div className="candidate-form-grid">
            <section className="card candidate-form-section">
              <div className="card-header candidate-form-section-header">
                <h2>Datos básicos</h2>
              </div>

              <div className="dashboard-grid">
                <div className="input-group">
                  <label className="label" htmlFor="firstName">
                    Nombre(s)
                  </label>
                  <input type="text" id="firstName" name="firstName" className="input" required />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="lastName">
                    Apellidos
                  </label>
                  <input type="text" id="lastName" name="lastName" className="input" required />
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="country">
                    País de origen
                  </label>
                  <select id="country" name="country" className="input" required defaultValue="">
                    <option value="">Seleccionar país...</option>
                    <option value="Colombia">Colombia</option>
                    <option value="Perú">Perú</option>
                    <option value="Guatemala">Guatemala</option>
                    <option value="Venezuela">Venezuela</option>
                    <option value="Cuba">Cuba</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="phone">
                    WhatsApp / teléfono
                  </label>
                  <input type="tel" id="phone" name="phone" className="input" placeholder="+57 300 000 0000" />
                </div>
              </div>
            </section>

            <section className="card candidate-form-section candidate-form-section--wide">
              <div className="card-header candidate-form-section-header">
                <h2>Notas iniciales</h2>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="notes">
                  Notas opcionales
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  className="input"
                  rows={5}
                  placeholder="Información adicional sobre el candidato o su situación migratoria..."
                />
              </div>
            </section>
          </div>

          <div className="candidate-form-actions">
            <Link href="/candidatos" className="button button-secondary">
              Cancelar
            </Link>
            <button type="submit" className="button">
              <Save size={18} />
              Guardar candidato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
