import { createCandidate } from "@/app/actions/candidates";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function NuevoCandidatoPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/candidatos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', textDecoration: 'none', fontWeight: 'bold' }}>
          <ArrowLeft size={16} /> Volver a Candidatos
        </Link>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-header" style={{ marginBottom: '2rem', borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem' }}>
          <h2>Añadir Nuevo Candidato</h2>
        </div>

        <form action={async (formData) => { "use server"; await createCandidate(formData); }}>
          <div className="dashboard-grid" style={{ gap: '1rem' }}>
            <div className="input-group">
              <label className="label" htmlFor="firstName">Nombre(s)</label>
              <input type="text" id="firstName" name="firstName" className="input" required />
            </div>
            
            <div className="input-group">
              <label className="label" htmlFor="lastName">Apellidos</label>
              <input type="text" id="lastName" name="lastName" className="input" required />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="country">País de Origen</label>
              <select id="country" name="country" className="input" required>
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
              <label className="label" htmlFor="phone">WhatsApp / Teléfono</label>
              <input type="tel" id="phone" name="phone" className="input" placeholder="+57 300 000 0000" />
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="label" htmlFor="notes">Notas Iniciales (Opcional)</label>
            <textarea 
              id="notes" 
              name="notes" 
              className="input" 
              rows={4} 
              placeholder="Información adicional sobre el candidato o su situación migratoria..."
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <Link href="/candidatos" className="button button-secondary">
              Cancelar
            </Link>
            <button type="submit" className="button">
              <Save size={18} />
              Guardar Candidato
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
