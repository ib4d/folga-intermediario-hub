import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { AppLanguage, normalizeLanguage } from "@/lib/i18n";

const copy = {
  es: {
    title: "Registro exitoso",
    description:
      "Tus datos han sido recibidos correctamente y estan siendo procesados por nuestro departamento Legal.",
    note: "Recibiras una notificacion o contacto de tu intermediario cuando tu documentacion sea revisada.",
    nextTitle: "Siguientes pasos",
    steps: [
      "Revision de documentos por legal",
      "Confirmacion de pago de 400 PLN",
      "Asignacion de logistica de llegada",
    ],
    thanks: "Gracias por confiar en ORI CRUIT HUB.",
  },
  en: {
    title: "Registration completed",
    description:
      "Your information has been received and is now being processed by our Legal team.",
    note: "You will receive a notification or contact from your intermediary once your documents are reviewed.",
    nextTitle: "Next steps",
    steps: [
      "Legal document review",
      "400 PLN payment confirmation",
      "Arrival logistics assignment",
    ],
    thanks: "Thank you for trusting ORI CRUIT HUB.",
  },
  pl: {
    title: "Rejestracja zakonczona",
    description:
      "Twoje dane zostaly odebrane i sa przetwarzane przez zespol legalizacji.",
    note: "Otrzymasz powiadomienie lub kontakt od rekrutera po sprawdzeniu dokumentow.",
    nextTitle: "Nastepne kroki",
    steps: [
      "Weryfikacja dokumentow przez legal",
      "Potwierdzenie platnosci 400 PLN",
      "Przypisanie logistyki przyjazdu",
    ],
    thanks: "Dziekujemy za zaufanie do ORI CRUIT HUB.",
  },
} satisfies Record<AppLanguage, { title: string; description: string; note: string; nextTitle: string; steps: string[]; thanks: string }>;

export default async function RegistrationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const text = copy[language];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div
        style={{
          backgroundColor: "white",
          padding: "3rem",
          border: "4px solid var(--pitch-black)",
          boxShadow: "12px 12px 0px var(--pitch-black)",
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <LanguageSwitcher currentLanguage={language} />
        </div>
        <div
          style={{
            width: "80px",
            height: "80px",
            backgroundColor: "#4ade80",
            border: "4px solid var(--pitch-black)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 2rem",
            fontSize: "2.5rem",
            fontWeight: 900,
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 900,
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          {text.title}
        </h1>

        <div style={{ fontWeight: 900, lineHeight: 1.6, marginBottom: "2rem" }}>
          <p style={{ marginBottom: "1rem" }}>{text.description}</p>
          <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>{text.note}</p>
        </div>

        <div
          style={{
            backgroundColor: "var(--white-smoke)",
            padding: "1.5rem",
            border: "2px solid var(--pitch-black)",
            textAlign: "left",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 900,
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            {text.nextTitle}
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontWeight: 900, lineHeight: 1.8 }}>
            {text.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        <p style={{ fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", opacity: 0.65 }}>
          {text.thanks}
        </p>
      </div>
    </div>
  );
}
