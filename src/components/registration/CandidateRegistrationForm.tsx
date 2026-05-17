"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitCandidateRegistration } from "@/app/actions/public-registration";
import { CandidateRegistrationData } from "@/lib/validations/candidate-registration";

interface Props {
  token: string;
  initialData?: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

export default function CandidateRegistrationForm({ token, initialData }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  
  const [formData, setFormData] = useState<Partial<CandidateRegistrationData>>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    birthPlace: "",
    birthCountry: "",
    citizenship: "",
    nationality: "",
    country: "COL",
    locationStatus: "EN_ORIGEN",
    passportNumber: "",
    passportExpiry: "",
    passportBiometric: false,
    gdprConsent: false,
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, 8));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 8) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    
    try {
      const result = await submitCandidateRegistration(token, formData);
      if (result.error) {
        const nextErrors = result.error as Record<string, string[]>;
        setErrors(nextErrors);
        alert(nextErrors._global?.[0] ?? "Hay errores en el formulario. Por favor revise los datos.");
      } else {
        router.push(`/registro/${token}/success`);
      }
    } catch (error) {
      console.error("[registration-form] Submit failed", error);
      alert("Error al enviar el formulario. Intentalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (step / 8) * 100;

  return (
    <div className="card" style={{ maxWidth: '700px', margin: '0 auto', padding: '2.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '900', textTransform: 'uppercase' }}>PASO {step} DE 8</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '900' }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ width: '100%', backgroundColor: 'var(--white-smoke)', border: '2px solid var(--pitch-black)', height: '14px' }}>
          <div 
            style={{ 
              width: `${progress}%`, 
              backgroundColor: 'var(--amber-flame)', 
              height: '100%', 
              transition: 'width 0.3s ease-in-out',
              borderRight: progress > 0 ? '2px solid var(--pitch-black)' : 'none'
            }} 
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* STEP 1: Datos personales */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>1. DATOS PERSONALES</h2>
            <div className="input-group">
              <label className="label">Nombre</label>
              <input 
                type="text" name="firstName" value={formData.firstName} 
                onChange={handleChange} className="input" required 
              />
              {errors.firstName && <p style={{ color: '#e63946', fontSize: '0.75rem', fontWeight: 'bold' }}>{errors.firstName[0]}</p>}
            </div>
            <div className="input-group">
              <label className="label">Apellido</label>
              <input 
                type="text" name="lastName" value={formData.lastName} 
                onChange={handleChange} className="input" required 
              />
              {errors.lastName && <p style={{ color: '#e63946', fontSize: '0.75rem', fontWeight: 'bold' }}>{errors.lastName[0]}</p>}
            </div>
            <div className="input-group">
              <label className="label">Género</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="select" required>
                <option value="">SELECCIONE...</option>
                <option value="M">MASCULINO</option>
                <option value="F">FEMENINO</option>
                <option value="OTHER">OTRO</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label">Fecha de Nacimiento</label>
              <input 
                type="date" name="dateOfBirth" value={formData.dateOfBirth} 
                onChange={handleChange} className="input" required 
              />
            </div>
          </div>
        )}

        {/* STEP 2: Contacto */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>2. CONTACTO</h2>
            <div className="input-group">
              <label className="label">Email</label>
              <input 
                type="email" name="email" value={formData.email || ""} 
                onChange={handleChange} className="input" 
              />
            </div>
            <div className="input-group">
              <label className="label">Teléfono (con código de país)</label>
              <input 
                type="tel" name="phone" value={formData.phone || ""} 
                onChange={handleChange} className="input" placeholder="+57..." required 
              />
            </div>
          </div>
        )}

        {/* STEP 3: Nacionalidad y ubicación */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>3. NACIONALIDAD Y UBICACIÓN</h2>
            <div className="input-group">
              <label className="label">Lugar de Nacimiento</label>
              <input 
                type="text" name="birthPlace" value={formData.birthPlace} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div className="input-group">
              <label className="label">País de Nacimiento</label>
              <input 
                type="text" name="birthCountry" value={formData.birthCountry} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div className="input-group">
              <label className="label">Ciudadanía</label>
              <input 
                type="text" name="citizenship" value={formData.citizenship} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div className="input-group">
              <label className="label">Nacionalidad</label>
              <input 
                type="text" name="nationality" value={formData.nationality} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div className="input-group">
              <label className="label">País de Residencia Actual</label>
              <input 
                type="text" name="country" value={formData.country} 
                onChange={handleChange} className="input" required 
              />
            </div>
          </div>
        )}

        {/* STEP 4: Documentos migratorios */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>4. DOCUMENTOS MIGRATORIOS</h2>
            <div style={{ padding: '1rem', backgroundColor: 'var(--ghost-white)', border: '2px dashed var(--pitch-black)', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
              POR FAVOR, INGRESE LOS DATOS EXACTOS DE SU PASAPORTE.
            </div>
            <div className="input-group">
              <label className="label">Número de Pasaporte</label>
              <input 
                type="text" name="passportNumber" value={formData.passportNumber} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div className="input-group">
              <label className="label">Fecha de Expiración del Pasaporte</label>
              <input 
                type="date" name="passportExpiry" value={formData.passportExpiry} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
              <input 
                type="checkbox" name="passportBiometric" checked={formData.passportBiometric} 
                onChange={handleChange} id="passportBiometric" 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="passportBiometric" style={{ fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>¿ES PASAPORTE BIOMÉTRICO?</label>
            </div>

            <hr style={{ border: 'none', borderTop: '2px solid var(--pitch-black)', margin: '1rem 0' }} />
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', textTransform: 'uppercase' }}>KARTA POBYTU (SI TIENE)</h3>
            <div className="input-group">
              <label className="label">Número de Karta</label>
              <input 
                type="text" name="kartaPobytuNumber" value={formData.kartaPobytuNumber || ""} 
                onChange={handleChange} className="input" 
              />
            </div>
            <div className="input-group">
              <label className="label">Expiración Karta</label>
              <input 
                type="date" name="kartaPobytuExpiry" value={formData.kartaPobytuExpiry || ""} 
                onChange={handleChange} className="input" 
              />
            </div>
          </div>
        )}

        {/* STEP 5: Situación en Polonia */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>5. SITUACIÓN EN POLONIA</h2>
            <div className="input-group">
              <label className="label">Estado de Ubicación</label>
              <select 
                name="locationStatus" value={formData.locationStatus} 
                onChange={handleChange} className="select" required
              >
                <option value="EN_ORIGEN">EN MI PAÍS DE ORIGEN</option>
                <option value="EN_TRANSITO">EN TRÁNSITO</option>
                <option value="EN_POLONIA">YA ESTOY EN POLONIA</option>
              </select>
            </div>
            {formData.locationStatus === "EN_POLONIA" && (
              <>
                <div className="input-group">
                  <label className="label">Dirección en Polonia</label>
                  <input 
                    type="text" name="polishAddress" value={formData.polishAddress || ""} 
                    onChange={handleChange} className="input" 
                  />
                </div>
                <div className="input-group">
                  <label className="label">Ciudad en Polonia</label>
                  <input 
                    type="text" name="polishCity" value={formData.polishCity || ""} 
                    onChange={handleChange} className="input" 
                  />
                </div>
                <div className="input-group">
                  <label className="label">Número PESEL (Si tiene)</label>
                  <input 
                    type="text" name="peselNumber" value={formData.peselNumber || ""} 
                    onChange={handleChange} className="input" 
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 6: Llegada / Transporte */}
        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>6. LLEGADA Y TRANSPORTE</h2>
            <div className="input-group">
              <label className="label">Fecha Estimada de Llegada</label>
              <input 
                type="date" name="arrivalDate" value={formData.arrivalDate || ""} 
                onChange={handleChange} className="input" 
              />
            </div>
            <div className="input-group">
              <label className="label">¿Necesita Alojamiento?</label>
              <select name="accommodation" value={formData.accommodation || ""} onChange={handleChange} className="select">
                <option value="">SELECCIONE...</option>
                <option value="YES">SÍ, NECESITO ALOJAMIENTO</option>
                <option value="NO">NO, TENGO MI PROPIO ALOJAMIENTO</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label">Notas adicionales sobre su llegada</label>
              <textarea 
                name="arrivalNotes" value={formData.arrivalNotes || ""} 
                onChange={handleChange} className="input" rows={3}
                style={{ resize: 'none' }}
              ></textarea>
            </div>
          </div>
        )}

        {/* STEP 7: Pago */}
        {step === 7 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>7. PAGO DE RESERVA (400 PLN)</h2>
            <div style={{ padding: '1rem', backgroundColor: 'var(--primary)', color: 'var(--pitch-black)', fontWeight: 'bold', fontSize: '0.875rem', border: '2px solid var(--pitch-black)', boxShadow: '4px 4px 0px var(--pitch-black)', marginBottom: '1rem' }}>
              LA RESERVA DE 400 PLN ES OBLIGATORIA PARA GARANTIZAR SU CUPO Y TRÁMITES LEGALES.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '2px solid var(--pitch-black)', backgroundColor: 'var(--ghost-white)' }}>
              <input 
                type="checkbox" name="paid400pln" checked={formData.paid400pln} 
                onChange={handleChange} id="paid400pln" 
                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
              />
              <label htmlFor="paid400pln" style={{ fontWeight: '900', textTransform: 'uppercase', cursor: 'pointer' }}>YA REALICÉ EL PAGO DE 400 PLN</label>
            </div>
            {formData.paid400pln && (
              <div className="input-group">
                <label className="label">Fecha del Pago</label>
                <input 
                  type="date" name="paymentDate" value={formData.paymentDate || ""} 
                  onChange={handleChange} className="input" 
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 8: Consentimiento / Confirmación */}
        {step === 8 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>8. CONFIRMACIÓN Y CONSENTIMIENTO</h2>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--white-smoke)', border: '2px solid var(--pitch-black)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '1.5rem' }}>
                AL HACER CLIC EN ENVIAR, CONFIRMO QUE TODOS LOS DATOS PROPORCIONADOS SON VERÍDICOS Y AUTORIZO A 
                <strong> FOLGA SP. Z O.O.</strong> A PROCESAR MIS DATOS PERSONALES PARA FINES DE RECLUTAMIENTO 
                Y TRÁMITES DE LEGALIZACIÓN EN POLONIA, DE ACUERDO CON EL REGLAMENTO GENERAL DE PROTECCIÓN DE DATOS (GDPR).
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input 
                  type="checkbox" name="gdprConsent" checked={formData.gdprConsent} 
                  onChange={handleChange} id="gdprConsent" 
                  style={{ width: '20px', height: '20px', marginTop: '3px', cursor: 'pointer' }} required
                />
                <label htmlFor="gdprConsent" style={{ fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}>
                  ACEPTO EL TRATAMIENTO DE MIS DATOS PERSONALES Y LOS TÉRMINOS Y CONDICIONES.
                </label>
              </div>
              {errors.gdprConsent && <p style={{ color: '#e63946', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{errors.gdprConsent[0]}</p>}
            </div>

            <div style={{ borderTop: '2px solid var(--pitch-black)', paddingTop: '1.5rem' }}>
              <p style={{ fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem' }}>RESUMEN DE DATOS:</p>
              <ul style={{ listStyle: 'none', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>• {formData.firstName?.toUpperCase()} {formData.lastName?.toUpperCase()}</li>
                <li>• PASAPORTE: {formData.passportNumber?.toUpperCase()}</li>
                <li>• TEL: {formData.phone}</li>
                <li>• EMAIL: {formData.email?.toUpperCase()}</li>
              </ul>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
          {step > 1 && (
            <button 
              type="button" onClick={prevStep} 
              className="button button-secondary"
            >
              ANTERIOR
            </button>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="button"
            style={{ 
              marginLeft: 'auto',
              backgroundColor: step === 8 ? '#4ade80' : 'var(--primary)',
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? "ENVIANDO..." : step === 8 ? "FINALIZAR REGISTRO" : "SIGUIENTE"}
          </button>
        </div>
      </form>
    </div>
  );
}
