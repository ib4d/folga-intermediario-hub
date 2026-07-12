import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { AppLanguage, normalizeLanguage } from "@/lib/i18n";

const copy = {
  es: {
    title: "Registro exitoso",
    description:
      "Tus datos han sido recibidos correctamente y están siendo procesados por nuestro departamento Legal.",
    note: "Recibirás una notificación o contacto de tu intermediario cuando tu documentación sea revisada.",
    nextTitle: "Siguientes pasos",
    steps: [
      "Revisión de documentos por legal",
      "Confirmación de pago de 400 PLN",
      "Asignación de logística de llegada",
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
    title: "Rejestracja zakończona",
    description:
      "Twoje dane zostały odebrane i są przetwarzane przez zespół legalizacji.",
    note: "Otrzymasz powiadomienie lub kontakt od rekrutera po sprawdzeniu dokumentów.",
    nextTitle: "Następne kroki",
    steps: [
      "Weryfikacja dokumentów przez legal",
      "Potwierdzenie płatności 400 PLN",
      "Przypisanie logistyki przyjazdu",
    ],
    thanks: "Dziękujemy za zaufanie do ORI CRUIT HUB.",
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
    <div className="public-registration-shell public-registration-shell--centered">
      <div className="public-registration-panel public-registration-panel--success">
        <div className="public-registration-language">
          <LanguageSwitcher currentLanguage={language} />
        </div>
        <div className="public-registration-success-mark">✓</div>
        <h1 className="public-registration-success-title">{text.title}</h1>
        <div className="public-registration-success-copy">
          <p>{text.description}</p>
          <p>{text.note}</p>
        </div>
        <div className="public-registration-next-steps">
          <h2>{text.nextTitle}</h2>
          <ul>
            {text.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
        <p className="public-registration-thanks">{text.thanks}</p>
      </div>
    </div>
  );
}
