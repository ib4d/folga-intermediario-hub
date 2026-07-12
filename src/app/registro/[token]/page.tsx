import { getCandidateByToken } from "@/app/actions/public-registration";
import CandidateRegistrationForm from "@/components/registration/CandidateRegistrationForm";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { AppLanguage, normalizeLanguage } from "@/lib/i18n";

const copy = {
  es: {
    invalidTitle: "Enlace inválido",
    invalidDescription:
      "Este enlace de registro no es válido o ha expirado. Por favor, contacte a su reclutador.",
    usedTitle: "Ya registrado",
    usedDescription:
      "Este enlace ya ha sido utilizado. Si necesita realizar cambios, contacte con su reclutador.",
    badge: "Registro oficial",
    description: "Complete su información para iniciar el proceso de legalización.",
    recruiter: "Reclutador",
    footer: "ORI CRUIT HUB. Todos los derechos reservados.",
  },
  en: {
    invalidTitle: "Invalid link",
    invalidDescription:
      "This registration link is not valid or has expired. Please contact your recruiter.",
    usedTitle: "Already registered",
    usedDescription:
      "This link has already been used. If you need changes, contact your recruiter.",
    badge: "Official registration",
    description: "Complete your information to start the legalization process.",
    recruiter: "Recruiter",
    footer: "ORI CRUIT HUB. All rights reserved.",
  },
  pl: {
    invalidTitle: "Nieprawidłowy link",
    invalidDescription:
      "Ten link rejestracyjny jest nieprawidłowy albo wygasł. Skontaktuj się z rekruterem.",
    usedTitle: "Już zarejestrowano",
    usedDescription:
      "Ten link został już użyty. Jeśli potrzebujesz zmian, skontaktuj się z rekruterem.",
    badge: "Oficjalna rejestracja",
    description: "Uzupełnij dane, aby rozpocząć proces legalizacji.",
    recruiter: "Rekruter",
    footer: "ORI CRUIT HUB. Wszelkie prawa zastrzeżone.",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

function MessageCard({
  language,
  title,
  description,
  tone = "warning",
}: {
  language: AppLanguage;
  title: string;
  description: string;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="public-registration-shell public-registration-shell--centered">
      <div className="public-registration-panel public-registration-panel--compact">
        <div className="public-registration-language">
          <LanguageSwitcher currentLanguage={language} />
        </div>
        <h1 className={`public-registration-message-title ${tone === "danger" ? "is-danger" : ""}`.trim()}>
          {title}
        </h1>
        <p className="public-registration-message-copy">{description}</p>
      </div>
    </div>
  );
}

export default async function RegistroPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const text = copy[language];
  const candidate = await getCandidateByToken(token);

  if (!candidate) {
    return (
      <MessageCard
        language={language}
        title={text.invalidTitle}
        description={text.invalidDescription}
        tone="danger"
      />
    );
  }

  if (candidate.selfRegistered) {
    return <MessageCard language={language} title={text.usedTitle} description={text.usedDescription} />;
  }

  return (
    <div className="public-registration-shell">
      <div className="public-registration-layout">
        <div className="public-registration-hero">
          <div className="public-registration-language">
            <LanguageSwitcher currentLanguage={language} />
          </div>
          <div className="public-registration-badge">{text.badge}</div>
          <h1 className="public-registration-title">ORI CRUIT HUB</h1>
          <p className="public-registration-description">{text.description}</p>
          {candidate.intermediary?.name ? (
            <p className="public-registration-recruiter">
              {text.recruiter.toUpperCase()}:{" "}
              <span className="public-registration-recruiter-pill">
                {candidate.intermediary.name.toUpperCase()}
              </span>
            </p>
          ) : null}
        </div>

        <div className="public-registration-panel">
          <CandidateRegistrationForm
            token={token}
            language={language}
            initialData={{
              firstName: candidate.firstName,
              lastName: candidate.lastName,
            }}
          />
        </div>

        <div className="public-registration-footer">{`© ${new Date().getFullYear()} ${text.footer}`}</div>
      </div>
    </div>
  );
}
