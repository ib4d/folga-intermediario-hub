"use client";

import { useState, use } from "react";
import { submitCandidateRegistration } from "@/app/actions/public-registration";
import { fullRegistrationSchema } from "@/lib/validations/candidate-registration";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function RegistroPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, string>>({
    gender: "Hombre",
    country: "Colombia",
    locationStatus: "EN_ORIGEN",
    passportHasVisa: "No",
    hasPesel: "No",
    hasKartaPobytu: "No",
    hasWorkedForFolga: "No",
    understands400pln: "Sí",
    gdprConsent: "true",
    dataAccuracy: "true",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const totalSteps = 8;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < totalSteps) {
      nextStep();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await submitCandidateRegistration(resolvedParams.token, formData);
      if (res.error) {
        setError(JSON.stringify(res.error, null, 2));
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: "500px" }}>
          <CheckCircle size={64} color="#065F46" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ color: "#065F46" }}>¡Solicitud Completada!</h2>
          <p>Tu solicitud ha sido recibida. El equipo de FOLGA se pondrá en contacto contigo muy pronto.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "1rem", backgroundColor: "var(--ghost-white)" }}>
      <div className="card" style={{ maxWidth: "600px", margin: "2rem auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Registro FOLGA</h1>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontWeight: "bold" }}>Paso {step} de {totalSteps}</span>
          <div style={{ flex: 1, marginLeft: "1rem", height: "10px", backgroundColor: "var(--white-smoke)", border: "1px solid var(--pitch-black)" }}>
            <div style={{ height: "100%", backgroundColor: "var(--amber-flame)", width: `${(step / totalSteps) * 100}%` }} />
          </div>
        </div>

        {error && (
          <div style={{ padding: "1rem", backgroundColor: "#fee2e2", border: "2px solid #991b1b", color: "#991b1b", marginBottom: "1rem" }}>
            <AlertTriangle style={{ marginBottom: "0.5rem" }} />
            <pre style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>{error}</pre>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {step === 1 && (
            <>
              <h3>1. Datos Básicos</h3>
              <input type="email" name="email" className="input" placeholder="Correo Electrónico" onChange={handleChange} required />
              <input type="text" name="firstName" className="input" placeholder="Nombres" onChange={handleChange} required />
              <input type="text" name="lastName" className="input" placeholder="Apellidos" onChange={handleChange} required />
              <select name="gender" className="input" onChange={handleChange}>
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
              </select>
              <input type="date" name="dateOfBirth" className="input" onChange={handleChange} required />
              <input type="text" name="birthPlace" className="input" placeholder="Lugar de Nacimiento" onChange={handleChange} required />
              <input type="text" name="birthCountry" className="input" placeholder="País de Nacimiento" onChange={handleChange} required />
              <input type="text" name="citizenship" className="input" placeholder="Ciudadanía" onChange={handleChange} required />
              <input type="text" name="nationality" className="input" placeholder="Nacionalidad" onChange={handleChange} required />
              <input type="number" name="heightCm" className="input" placeholder="Altura (cm)" onChange={handleChange} required />
            </>
          )}

          {step === 2 && (
            <>
              <h3>2. Contacto y Localización</h3>
              <input type="tel" name="phone" className="input" placeholder="Teléfono" onChange={handleChange} required />
              <input type="tel" name="whatsapp" className="input" placeholder="WhatsApp (opcional)" onChange={handleChange} />
              <select name="country" className="input" onChange={handleChange}>
                <option value="Colombia">Colombia</option>
                <option value="Perú">Perú</option>
                <option value="Guatemala">Guatemala</option>
                <option value="Venezuela">Venezuela</option>
                <option value="Cuba">Cuba</option>
                <option value="Otro">Otro</option>
              </select>
              <input type="text" name="currentCity" className="input" placeholder="Ciudad Actual" onChange={handleChange} required />
              <select name="locationStatus" className="input" onChange={handleChange}>
                <option value="EN_ORIGEN">En país de origen</option>
                <option value="EN_TRANSITO">En tránsito</option>
                <option value="EN_POLONIA">Ya estoy en Polonia</option>
              </select>
            </>
          )}

          {step === 3 && (
            <>
              <h3>3. Datos de Pasaporte</h3>
              <input type="text" name="passportNumber" className="input" placeholder="Número de Pasaporte" onChange={handleChange} required />
              <input type="text" name="passportCountry" className="input" placeholder="País de Emisión" onChange={handleChange} required />
              <label className="label">Fecha de Expiración</label>
              <input type="date" name="passportExpiry" className="input" onChange={handleChange} required />
              <label className="label">¿Tiene Visa Polaca?</label>
              <select name="passportHasVisa" className="input" onChange={handleChange}>
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </>
          )}

          {step === 4 && (
            <>
              <h3>4. Documentos Adicionales</h3>
              <input type="text" name="peselNumber" className="input" placeholder="Número PESEL (si tiene)" onChange={handleChange} />
              <label className="label">¿Tiene Karta Pobytu?</label>
              <select name="hasKartaPobytu" className="input" onChange={handleChange}>
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </>
          )}

          {step === 5 && (
            <>
              <h3>5. Alojamiento y Viaje</h3>
              <input type="text" name="accommodation" className="input" placeholder="Preferencias de Alojamiento" onChange={handleChange} />
              <textarea name="arrivalNotes" className="input" placeholder="Notas de llegada o detalles de viaje" onChange={handleChange} />
            </>
          )}

          {step === 6 && (
            <>
              <h3>6. Experiencia Laboral</h3>
              <label className="label">¿Ha trabajado antes para Folga?</label>
              <select name="hasWorkedForFolga" className="input" onChange={handleChange}>
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
              <textarea name="workExperience" className="input" placeholder="Experiencia laboral previa" onChange={handleChange} />
            </>
          )}

          {step === 7 && (
            <>
              <h3>7. Pagos y Términos</h3>
              <label className="label">¿Comprende que el proceso requiere un pago inicial de 400 PLN?</label>
              <select name="understands400pln" className="input" onChange={handleChange}>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </>
          )}

          {step === 8 && (
            <>
              <h3>8. Consentimiento Final</h3>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "1rem" }}>
                <input type="checkbox" required name="gdprConsent" value="true" style={{ marginTop: "5px" }} />
                <span>Acepto el tratamiento de mis datos personales según la normativa GDPR para fines de reclutamiento por Folga Sp. z o.o.</span>
              </label>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input type="checkbox" required name="dataAccuracy" value="true" style={{ marginTop: "5px" }} />
                <span>Confirmo que todos los datos ingresados son reales y exactos bajo mi responsabilidad.</span>
              </label>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
            {step > 1 && (
              <button type="button" className="button button-secondary" onClick={prevStep} disabled={loading}>
                Atrás
              </button>
            )}
            <button type="submit" className="button" style={{ marginLeft: "auto" }} disabled={loading}>
              {step < totalSteps ? "Siguiente" : (loading ? "Enviando..." : "Enviar Solicitud")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
