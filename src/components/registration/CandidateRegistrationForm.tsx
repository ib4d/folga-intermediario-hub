"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitCandidateRegistration } from "@/app/actions/public-registration";
import { CandidateRegistrationData } from "@/lib/validations/candidate-registration";
import { RecruitmentSource, LocationStatus } from "@prisma/client";

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
        setErrors(result.error as Record<string, string[]>);
        // If there's an error, we might need to jump to the step with the error, 
        // but for now let's just show them.
        alert("Hay errores en el formulario. Por favor revise los datos.");
      } else {
        router.push(`/registro/${token}/success`);
      }
    } catch (_err) {
      alert("Error al enviar el formulario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (step / 8) * 100;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-500">Paso {step} de 8</span>
          <span className="text-sm font-medium text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Datos personales */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">1. Datos Personales</h2>
            <div>
              <label className="label">Nombre</label>
              <input 
                type="text" name="firstName" value={formData.firstName} 
                onChange={handleChange} className="input" required 
              />
              {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName[0]}</p>}
            </div>
            <div>
              <label className="label">Apellido</label>
              <input 
                type="text" name="lastName" value={formData.lastName} 
                onChange={handleChange} className="input" required 
              />
              {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName[0]}</p>}
            </div>
            <div>
              <label className="label">Género</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="input" required>
                <option value="">Seleccione...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">2. Contacto</h2>
            <div>
              <label className="label">Email</label>
              <input 
                type="email" name="email" value={formData.email || ""} 
                onChange={handleChange} className="input" 
              />
            </div>
            <div>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">3. Nacionalidad y Ubicación</h2>
            <div>
              <label className="label">Lugar de Nacimiento</label>
              <input 
                type="text" name="birthPlace" value={formData.birthPlace} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div>
              <label className="label">País de Nacimiento</label>
              <input 
                type="text" name="birthCountry" value={formData.birthCountry} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div>
              <label className="label">Ciudadanía</label>
              <input 
                type="text" name="citizenship" value={formData.citizenship} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div>
              <label className="label">Nacionalidad</label>
              <input 
                type="text" name="nationality" value={formData.nationality} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">4. Documentos Migratorios</h2>
            <div className="p-4 bg-blue-50 rounded-lg mb-4 text-sm text-blue-800">
              Por favor, ingrese los datos exactos de su pasaporte.
            </div>
            <div>
              <label className="label">Número de Pasaporte</label>
              <input 
                type="text" name="passportNumber" value={formData.passportNumber} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div>
              <label className="label">Fecha de Expiración del Pasaporte</label>
              <input 
                type="date" name="passportExpiry" value={formData.passportExpiry} 
                onChange={handleChange} className="input" required 
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" name="passportBiometric" checked={formData.passportBiometric} 
                onChange={handleChange} id="passportBiometric" 
              />
              <label htmlFor="passportBiometric">¿Es pasaporte biométrico?</label>
            </div>

            <hr className="my-4" />
            
            <h3 className="font-semibold">Karta Pobytu (Si tiene)</h3>
            <div>
              <label className="label">Número de Karta</label>
              <input 
                type="text" name="kartaPobytuNumber" value={formData.kartaPobytuNumber || ""} 
                onChange={handleChange} className="input" 
              />
            </div>
            <div>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">5. Situación en Polonia</h2>
            <div>
              <label className="label">Estado de Ubicación</label>
              <select 
                name="locationStatus" value={formData.locationStatus} 
                onChange={handleChange} className="input" required
              >
                <option value="EN_ORIGEN">En mi país de origen</option>
                <option value="EN_TRANSITO">En tránsito</option>
                <option value="EN_POLONIA">Ya estoy en Polonia</option>
              </select>
            </div>
            {formData.locationStatus === "EN_POLONIA" && (
              <>
                <div>
                  <label className="label">Dirección en Polonia</label>
                  <input 
                    type="text" name="polishAddress" value={formData.polishAddress || ""} 
                    onChange={handleChange} className="input" 
                  />
                </div>
                <div>
                  <label className="label">Ciudad en Polonia</label>
                  <input 
                    type="text" name="polishCity" value={formData.polishCity || ""} 
                    onChange={handleChange} className="input" 
                  />
                </div>
                <div>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">6. Llegada y Transporte</h2>
            <div>
              <label className="label">Fecha Estimada de Llegada</label>
              <input 
                type="date" name="arrivalDate" value={formData.arrivalDate || ""} 
                onChange={handleChange} className="input" 
              />
            </div>
            <div>
              <label className="label">¿Necesita Alojamiento?</label>
              <select name="accommodation" value={formData.accommodation || ""} onChange={handleChange} className="input">
                <option value="">Seleccione...</option>
                <option value="YES">Sí, necesito alojamiento</option>
                <option value="NO">No, tengo mi propio alojamiento</option>
              </select>
            </div>
            <div>
              <label className="label">Notas adicionales sobre su llegada</label>
              <textarea 
                name="arrivalNotes" value={formData.arrivalNotes || ""} 
                onChange={handleChange} className="input" rows={3}
              ></textarea>
            </div>
          </div>
        )}

        {/* STEP 7: Pago */}
        {step === 7 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">7. Pago de Reserva (400 PLN)</h2>
            <div className="p-4 bg-amber-50 rounded-lg text-amber-900 text-sm">
              La reserva de 400 PLN es obligatoria para garantizar su cupo y trámites legales.
            </div>
            <div className="flex items-center gap-2 p-4 border rounded-lg">
              <input 
                type="checkbox" name="paid400pln" checked={formData.paid400pln} 
                onChange={handleChange} id="paid400pln" className="w-5 h-5"
              />
              <label htmlFor="paid400pln" className="font-medium">Ya realicé el pago de 400 PLN</label>
            </div>
            {formData.paid400pln && (
              <div>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold">8. Confirmación y Consentimiento</h2>
            <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-4">
              <p>
                Al hacer clic en enviar, confirmo que todos los datos proporcionados son verídicos y autorizo a 
                <strong> FOLGA SP. Z O.O.</strong> a procesar mis datos personales para fines de reclutamiento 
                y trámites de legalización en Polonia, de acuerdo con el Reglamento General de Protección de Datos (GDPR).
              </p>
              <div className="flex items-start gap-2">
                <input 
                  type="checkbox" name="gdprConsent" checked={formData.gdprConsent} 
                  onChange={handleChange} id="gdprConsent" className="mt-1" required
                />
                <label htmlFor="gdprConsent" className="text-sm">
                  Acepto el tratamiento de mis datos personales y los términos y condiciones.
                </label>
              </div>
              {errors.gdprConsent && <p className="text-red-500 text-sm">{errors.gdprConsent[0]}</p>}
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold mb-2">Resumen de datos:</p>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• {formData.firstName} {formData.lastName}</li>
                <li>• {formData.passportNumber}</li>
                <li>• {formData.phone}</li>
                <li>• {formData.email}</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6">
          {step > 1 && (
            <button 
              type="button" onClick={prevStep} 
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`ml-auto px-8 py-2 rounded-lg font-bold text-white transition-all ${
              step === 8 ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? "Enviando..." : step === 8 ? "Finalizar Registro" : "Siguiente"}
          </button>
        </div>
      </form>
    </div>
  );
}
