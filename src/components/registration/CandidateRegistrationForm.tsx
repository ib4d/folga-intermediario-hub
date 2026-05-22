"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitCandidateRegistration } from "@/app/actions/public-registration";
import { CandidateRegistrationData } from "@/lib/validations/candidate-registration";
import { AppLanguage, DEFAULT_LANGUAGE } from "@/lib/i18n";

type FieldErrors = Record<string, string[]>;

type RegistrationCopy = {
  step: string;
  of: string;
  previous: string;
  next: string;
  submitting: string;
  submit: string;
  select: string;
  error: string;
  unexpected: string;
  sections: string[];
  labels: Record<string, string>;
  hints: Record<string, string>;
  options: Record<string, string>;
};

interface Props {
  token: string;
  language?: AppLanguage;
  initialData?: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

const copy = {
  es: {
    step: "Paso",
    of: "de",
    previous: "Anterior",
    next: "Siguiente",
    submitting: "Enviando...",
    submit: "Finalizar registro",
    select: "Seleccione...",
    error: "Hay errores en el formulario. Por favor revise los datos.",
    unexpected: "Error al enviar el formulario. Intentalo de nuevo.",
    sections: [
      "Datos personales",
      "Contacto",
      "Nacionalidad y ubicacion",
      "Documentos migratorios",
      "Situacion en Polonia",
      "Llegada y transporte",
      "Pago de reserva",
      "Confirmacion y consentimiento",
    ],
    labels: {
      firstName: "Nombre",
      lastName: "Apellido",
      gender: "Genero",
      dateOfBirth: "Fecha de nacimiento",
      email: "Email",
      phone: "Telefono con codigo de pais",
      birthPlace: "Lugar de nacimiento",
      birthCountry: "Pais de nacimiento",
      citizenship: "Ciudadania",
      nationality: "Nacionalidad",
      country: "Pais de residencia actual",
      passportNumber: "Numero de pasaporte",
      passportIssueDate: "Fecha de expedicion del pasaporte",
      passportExpiry: "Fecha de expiracion del pasaporte",
      passportBiometric: "Es pasaporte biometrico",
      kartaPobytuNumber: "Numero de Karta Pobytu",
      kartaPobytuIssueDate: "Fecha de emision de Karta Pobytu",
      kartaPobytuExpiry: "Expiracion de Karta Pobytu",
      kartaPobytuType: "Tipo de permiso",
      locationStatus: "Estado de ubicacion",
      polishAddress: "Direccion en Polonia",
      polishCity: "Ciudad en Polonia",
      peselNumber: "Numero PESEL",
      arrivalDate: "Fecha estimada de llegada",
      accommodation: "Necesita alojamiento",
      arrivalNotes: "Notas adicionales sobre su llegada",
      paid400pln: "Ya realice el pago de 400 PLN",
      paymentDate: "Fecha del pago",
      gdprConsent: "Acepto el tratamiento de mis datos personales y los terminos y condiciones.",
    },
    hints: {
      passport: "Ingrese los datos exactos de su pasaporte.",
      payment: "La reserva de 400 PLN ayuda a confirmar cupo, coordinacion y tramites.",
      consent:
        "Confirmo que los datos proporcionados son verdaderos y autorizo a ORI CRUIT HUB a procesarlos para reclutamiento, legalizacion y coordinacion operativa en Polonia, conforme a GDPR.",
      summary: "Resumen de datos",
    },
    options: {
      male: "Masculino",
      female: "Femenino",
      other: "Otro",
      origin: "En mi pais de origen",
      transit: "En transito",
      poland: "Ya estoy en Polonia",
      needsHousing: "Si, necesito alojamiento",
      hasHousing: "No, tengo alojamiento",
    },
  },
  en: {
    step: "Step",
    of: "of",
    previous: "Previous",
    next: "Next",
    submitting: "Submitting...",
    submit: "Complete registration",
    select: "Select...",
    error: "There are errors in the form. Please review the details.",
    unexpected: "Could not submit the form. Please try again.",
    sections: [
      "Personal details",
      "Contact",
      "Nationality and location",
      "Migration documents",
      "Situation in Poland",
      "Arrival and transport",
      "Reservation payment",
      "Confirmation and consent",
    ],
    labels: {
      firstName: "First name",
      lastName: "Last name",
      gender: "Gender",
      dateOfBirth: "Date of birth",
      email: "Email",
      phone: "Phone with country code",
      birthPlace: "Place of birth",
      birthCountry: "Country of birth",
      citizenship: "Citizenship",
      nationality: "Nationality",
      country: "Current country of residence",
      passportNumber: "Passport number",
      passportIssueDate: "Passport issue date",
      passportExpiry: "Passport expiry date",
      passportBiometric: "Biometric passport",
      kartaPobytuNumber: "Karta Pobytu number",
      kartaPobytuIssueDate: "Karta Pobytu issue date",
      kartaPobytuExpiry: "Karta Pobytu expiry",
      kartaPobytuType: "Permit type",
      locationStatus: "Location status",
      polishAddress: "Address in Poland",
      polishCity: "City in Poland",
      peselNumber: "PESEL number",
      arrivalDate: "Estimated arrival date",
      accommodation: "Accommodation needed",
      arrivalNotes: "Additional arrival notes",
      paid400pln: "I have already paid 400 PLN",
      paymentDate: "Payment date",
      gdprConsent: "I accept personal data processing and the terms and conditions.",
    },
    hints: {
      passport: "Enter the exact details from your passport.",
      payment: "The 400 PLN reservation helps confirm place, coordination and paperwork.",
      consent:
        "I confirm that the provided data is true and authorize ORI CRUIT HUB to process it for recruitment, legalization and operational coordination in Poland under GDPR.",
      summary: "Data summary",
    },
    options: {
      male: "Male",
      female: "Female",
      other: "Other",
      origin: "In my country of origin",
      transit: "In transit",
      poland: "Already in Poland",
      needsHousing: "Yes, I need accommodation",
      hasHousing: "No, I have accommodation",
    },
  },
  pl: {
    step: "Krok",
    of: "z",
    previous: "Wstecz",
    next: "Dalej",
    submitting: "Wysylanie...",
    submit: "Zakoncz rejestracje",
    select: "Wybierz...",
    error: "Formularz zawiera bledy. Sprawdz dane.",
    unexpected: "Nie udalo sie wyslac formularza. Sprobuj ponownie.",
    sections: [
      "Dane osobowe",
      "Kontakt",
      "Obywatelstwo i lokalizacja",
      "Dokumenty migracyjne",
      "Sytuacja w Polsce",
      "Przyjazd i transport",
      "Oplata rezerwacyjna",
      "Potwierdzenie i zgoda",
    ],
    labels: {
      firstName: "Imie",
      lastName: "Nazwisko",
      gender: "Plec",
      dateOfBirth: "Data urodzenia",
      email: "Email",
      phone: "Telefon z numerem kierunkowym",
      birthPlace: "Miejsce urodzenia",
      birthCountry: "Kraj urodzenia",
      citizenship: "Obywatelstwo",
      nationality: "Narodowosc",
      country: "Aktualny kraj pobytu",
      passportNumber: "Numer paszportu",
      passportIssueDate: "Data wydania paszportu",
      passportExpiry: "Data waznosci paszportu",
      passportBiometric: "Paszport biometryczny",
      kartaPobytuNumber: "Numer Karty Pobytu",
      kartaPobytuIssueDate: "Data wydania Karty Pobytu",
      kartaPobytuExpiry: "Data waznosci Karty Pobytu",
      kartaPobytuType: "Rodzaj zezwolenia",
      locationStatus: "Status lokalizacji",
      polishAddress: "Adres w Polsce",
      polishCity: "Miasto w Polsce",
      peselNumber: "Numer PESEL",
      arrivalDate: "Planowana data przyjazdu",
      accommodation: "Zakwaterowanie",
      arrivalNotes: "Dodatkowe informacje o przyjezdzie",
      paid400pln: "Oplacilem/am 400 PLN",
      paymentDate: "Data platnosci",
      gdprConsent: "Akceptuje przetwarzanie danych osobowych oraz regulamin.",
    },
    hints: {
      passport: "Wpisz dokladne dane z paszportu.",
      payment: "Rezerwacja 400 PLN pomaga potwierdzic miejsce, koordynacje i formalnosci.",
      consent:
        "Potwierdzam prawdziwosc danych i upowazniam ORI CRUIT HUB do ich przetwarzania w celu rekrutacji, legalizacji i koordynacji operacyjnej w Polsce zgodnie z GDPR.",
      summary: "Podsumowanie danych",
    },
    options: {
      male: "Mezczyzna",
      female: "Kobieta",
      other: "Inne",
      origin: "W kraju pochodzenia",
      transit: "W tranzycie",
      poland: "Jestem juz w Polsce",
      needsHousing: "Tak, potrzebuje zakwaterowania",
      hasHousing: "Nie, mam zakwaterowanie",
    },
  },
} satisfies Record<AppLanguage, RegistrationCopy>;

function fieldError(errors: FieldErrors, name: string) {
  return errors[name]?.[0] ? (
    <p style={{ color: "#b91c1c", fontSize: "0.75rem", fontWeight: 900, marginTop: "0.35rem" }}>
      {errors[name][0]}
    </p>
  ) : null;
}

function flattenFieldErrors(errors: FieldErrors) {
  return Object.entries(errors)
    .flatMap(([field, messages]) =>
      field === "_global" ? [] : messages.map((message) => `${field}: ${message}`)
    )
    .slice(0, 5);
}

function stepForField(field: string): number | null {
  if (["firstName", "lastName", "gender", "dateOfBirth"].includes(field)) return 1;
  if (["email", "phone"].includes(field)) return 2;
  if (["birthPlace", "birthCountry", "citizenship", "nationality", "country"].includes(field)) return 3;
  if (["passportNumber", "passportIssueDate", "passportExpiry", "passportBiometric", "kartaPobytuNumber", "kartaPobytuIssueDate", "kartaPobytuExpiry", "kartaPobytuType"].includes(field)) return 4;
  if (["locationStatus", "polishAddress", "polishCity", "peselNumber"].includes(field)) return 5;
  if (["arrivalDate", "arrivalNotes", "accommodation", "accommodationNotes"].includes(field)) return 6;
  if (["paid400pln", "paymentDate"].includes(field)) return 7;
  if (["gdprConsent"].includes(field)) return 8;
  return null;
}

function firstErrorStep(errors: FieldErrors): number | null {
  for (const field of Object.keys(errors)) {
    const step = stepForField(field);
    if (step) return step;
  }

  return null;
}

function FormField({
  label,
  name,
  value,
  onChange,
  errors,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: keyof CandidateRegistrationData;
  value: string | undefined | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  errors: FieldErrors;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="input-group">
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="input"
        required={required}
        placeholder={placeholder}
      />
      {fieldError(errors, name)}
    </div>
  );
}

export default function CandidateRegistrationForm({
  token,
  language = DEFAULT_LANGUAGE,
  initialData,
}: Props) {
  const router = useRouter();
  const text = copy[language];
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitMessage, setSubmitMessage] = useState("");

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
    passportIssueDate: "",
    passportExpiry: "",
    passportBiometric: false,
    kartaPobytuNumber: "",
    kartaPobytuIssueDate: "",
    kartaPobytuExpiry: "",
    kartaPobytuType: "",
    peselNumber: "",
    arrivalDate: "",
    arrivalNotes: "",
    accommodation: "",
    paid400pln: false,
    paymentDate: "",
    gdprConsent: false,
  });

  const progress = (step / 8) * 100;

  const nextStep = () => setStep((current) => Math.min(current + 1, 8));
  const prevStep = () => setStep((current) => Math.max(current - 1, 1));

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" ? (event.target as HTMLInputElement).checked : value;
    setFormData((current) => ({ ...current, [name]: nextValue }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < 8) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSubmitMessage("");

    try {
      const result = await submitCandidateRegistration(token, formData);
      if (result.error) {
        const nextErrors = result.error as FieldErrors;
        setErrors(nextErrors);
        setSubmitMessage(nextErrors._global?.[0] ?? text.error);
        const details = flattenFieldErrors(nextErrors);
        const targetStep = firstErrorStep(nextErrors);
        if (targetStep) setStep(targetStep);
        if (details.length > 0) {
          setSubmitMessage(`${nextErrors._global?.[0] ?? text.error} ${details.join(" ")}`);
        }
        return;
      }

      router.push(`/registro/${token}/success?lang=${language}`);
    } catch (error) {
      console.error("[registration-form] Submit failed", error);
      setSubmitMessage(text.unexpected);
      setErrors({ _global: [text.unexpected] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const labels = text.labels;

  return (
    <div className="card" style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <span style={{ fontSize: "0.875rem", fontWeight: 900, textTransform: "uppercase" }}>
            {text.step} {step} {text.of} 8
          </span>
          <span style={{ fontSize: "0.875rem", fontWeight: 900 }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            backgroundColor: "var(--white-smoke)",
            border: "2px solid var(--pitch-black)",
            height: "14px",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              backgroundColor: "var(--amber-flame)",
              height: "100%",
              transition: "width 0.2s ease-in-out",
              borderRight: progress > 0 ? "2px solid var(--pitch-black)" : "none",
            }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {submitMessage ? (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              border: "2px solid #b91c1c",
              backgroundColor: "#fee2e2",
              color: "#7f1d1d",
              fontWeight: 900,
              lineHeight: 1.5,
            }}
          >
            {submitMessage}
          </div>
        ) : null}

        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: 900,
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          {step}. {text.sections[step - 1]}
        </h2>

        {step === 1 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <FormField label={labels.firstName} name="firstName" value={formData.firstName} onChange={handleChange} errors={errors} required />
            <FormField label={labels.lastName} name="lastName" value={formData.lastName} onChange={handleChange} errors={errors} required />
            <div className="input-group">
              <label className="label" htmlFor="gender">{labels.gender}</label>
              <select id="gender" name="gender" value={formData.gender ?? ""} onChange={handleChange} className="select" required>
                <option value="">{text.select}</option>
                <option value="M">{text.options.male}</option>
                <option value="F">{text.options.female}</option>
                <option value="OTHER">{text.options.other}</option>
              </select>
              {fieldError(errors, "gender")}
            </div>
            <FormField label={labels.dateOfBirth} name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} errors={errors} required />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <FormField label={labels.email} name="email" type="email" value={formData.email} onChange={handleChange} errors={errors} />
            <FormField label={labels.phone} name="phone" type="tel" value={formData.phone} onChange={handleChange} errors={errors} required placeholder="+57..." />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <FormField label={labels.birthPlace} name="birthPlace" value={formData.birthPlace} onChange={handleChange} errors={errors} required />
            <FormField label={labels.birthCountry} name="birthCountry" value={formData.birthCountry} onChange={handleChange} errors={errors} required />
            <FormField label={labels.citizenship} name="citizenship" value={formData.citizenship} onChange={handleChange} errors={errors} required />
            <FormField label={labels.nationality} name="nationality" value={formData.nationality} onChange={handleChange} errors={errors} required />
            <FormField label={labels.country} name="country" value={formData.country} onChange={handleChange} errors={errors} required />
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ padding: "1rem", backgroundColor: "var(--ghost-white)", border: "2px dashed var(--pitch-black)", fontSize: "0.85rem", fontWeight: 900 }}>
              {text.hints.passport}
            </div>
            <FormField label={labels.passportNumber} name="passportNumber" value={formData.passportNumber} onChange={handleChange} errors={errors} required />
            <FormField label={labels.passportIssueDate} name="passportIssueDate" type="date" value={formData.passportIssueDate} onChange={handleChange} errors={errors} />
            <FormField label={labels.passportExpiry} name="passportExpiry" type="date" value={formData.passportExpiry} onChange={handleChange} errors={errors} required />
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 900 }}>
              <input type="checkbox" name="passportBiometric" checked={Boolean(formData.passportBiometric)} onChange={handleChange} style={{ width: "20px", height: "20px" }} />
              {labels.passportBiometric}
            </label>
            <hr style={{ border: 0, borderTop: "2px solid var(--pitch-black)", margin: "0.5rem 0" }} />
            <FormField label={labels.kartaPobytuNumber} name="kartaPobytuNumber" value={formData.kartaPobytuNumber} onChange={handleChange} errors={errors} />
            <FormField label={labels.kartaPobytuIssueDate} name="kartaPobytuIssueDate" type="date" value={formData.kartaPobytuIssueDate} onChange={handleChange} errors={errors} />
            <FormField label={labels.kartaPobytuExpiry} name="kartaPobytuExpiry" type="date" value={formData.kartaPobytuExpiry} onChange={handleChange} errors={errors} />
            <FormField label={labels.kartaPobytuType} name="kartaPobytuType" value={formData.kartaPobytuType} onChange={handleChange} errors={errors} />
          </div>
        )}

        {step === 5 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div className="input-group">
              <label className="label" htmlFor="locationStatus">{labels.locationStatus}</label>
              <select id="locationStatus" name="locationStatus" value={formData.locationStatus ?? "EN_ORIGEN"} onChange={handleChange} className="select" required>
                <option value="EN_ORIGEN">{text.options.origin}</option>
                <option value="EN_TRANSITO">{text.options.transit}</option>
                <option value="EN_POLONIA">{text.options.poland}</option>
              </select>
            </div>
            <FormField label={labels.polishAddress} name="polishAddress" value={formData.polishAddress} onChange={handleChange} errors={errors} />
            <FormField label={labels.polishCity} name="polishCity" value={formData.polishCity} onChange={handleChange} errors={errors} />
            <FormField label={labels.peselNumber} name="peselNumber" value={formData.peselNumber} onChange={handleChange} errors={errors} />
          </div>
        )}

        {step === 6 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <FormField label={labels.arrivalDate} name="arrivalDate" type="date" value={formData.arrivalDate} onChange={handleChange} errors={errors} />
            <div className="input-group">
              <label className="label" htmlFor="accommodation">{labels.accommodation}</label>
              <select id="accommodation" name="accommodation" value={formData.accommodation ?? ""} onChange={handleChange} className="select">
                <option value="">{text.select}</option>
                <option value="YES">{text.options.needsHousing}</option>
                <option value="NO">{text.options.hasHousing}</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label" htmlFor="arrivalNotes">{labels.arrivalNotes}</label>
              <textarea id="arrivalNotes" name="arrivalNotes" value={formData.arrivalNotes ?? ""} onChange={handleChange} className="input" rows={4} />
            </div>
          </div>
        )}

        {step === 7 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ padding: "1rem", backgroundColor: "var(--primary)", border: "2px solid var(--pitch-black)", fontWeight: 900 }}>
              {text.hints.payment}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 900, textTransform: "uppercase" }}>
              <input type="checkbox" name="paid400pln" checked={Boolean(formData.paid400pln)} onChange={handleChange} style={{ width: "22px", height: "22px" }} />
              {labels.paid400pln}
            </label>
            {formData.paid400pln && (
              <FormField label={labels.paymentDate} name="paymentDate" type="date" value={formData.paymentDate} onChange={handleChange} errors={errors} />
            )}
          </div>
        )}

        {step === 8 && (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <div style={{ padding: "1.5rem", backgroundColor: "var(--white-smoke)", border: "2px solid var(--pitch-black)", lineHeight: 1.6 }}>
              <p style={{ marginBottom: "1.25rem" }}>{text.hints.consent}</p>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontWeight: 900, textTransform: "uppercase" }}>
                <input type="checkbox" name="gdprConsent" checked={Boolean(formData.gdprConsent)} onChange={handleChange} required style={{ width: "20px", height: "20px", marginTop: "3px" }} />
                {labels.gdprConsent}
              </label>
              {fieldError(errors, "gdprConsent")}
            </div>
            <div style={{ borderTop: "2px solid var(--pitch-black)", paddingTop: "1.25rem" }}>
              <p style={{ fontWeight: 900, textTransform: "uppercase", marginBottom: "0.75rem" }}>{text.hints.summary}</p>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontWeight: 900, lineHeight: 1.8 }}>
                <li>{formData.firstName} {formData.lastName}</li>
                <li>{labels.passportNumber}: {formData.passportNumber}</li>
                <li>{labels.phone}: {formData.phone}</li>
                <li>{labels.email}: {formData.email || "-"}</li>
              </ul>
            </div>
          </div>
        )}

        {errors._global?.[0] && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", border: "2px solid #b91c1c", backgroundColor: "#fee2e2", color: "#7f1d1d", fontWeight: 900 }}>
            {errors._global[0]}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginTop: "3rem" }}>
          {step > 1 && (
            <button type="button" onClick={prevStep} className="button button-secondary">
              {text.previous}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="button"
            style={{
              marginLeft: "auto",
              backgroundColor: step === 8 ? "#4ade80" : "var(--primary)",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? text.submitting : step === 8 ? text.submit : text.next}
          </button>
        </div>
      </form>
    </div>
  );
}
