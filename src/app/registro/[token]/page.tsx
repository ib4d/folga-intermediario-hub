import { getCandidateByToken } from "@/app/actions/public-registration";
import CandidateRegistrationForm from "@/components/registration/CandidateRegistrationForm";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { AppLanguage, normalizeLanguage } from "@/lib/i18n";

const copy = {
  es: {
    invalidTitle: "Enlace invalido",
    invalidDescription:
      "Este enlace de registro no es valido o ha expirado. Por favor, contacte a su reclutador.",
    usedTitle: "Ya registrado",
    usedDescription:
      "Este enlace ya ha sido utilizado. Si necesita realizar cambios, contacte con su reclutador.",
    badge: "Registro oficial",
    description: "Complete su informacion para iniciar el proceso de legalizacion.",
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
    invalidTitle: "Nieprawidlowy link",
    invalidDescription:
      "Ten link rejestracyjny jest nieprawidlowy albo wygasl. Skontaktuj sie z rekruterem.",
    usedTitle: "Juz zarejestrowano",
    usedDescription:
      "Ten link zostal juz uzyty. Jesli potrzebujesz zmian, skontaktuj sie z rekruterem.",
    badge: "Oficjalna rejestracja",
    description: "Uzupelnij dane, aby rozpoczac proces legalizacji.",
    recruiter: "Rekruter",
    footer: "ORI CRUIT HUB. Wszelkie prawa zastrzezone.",
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div
        style={{
          backgroundColor: "white",
          padding: "2.5rem",
          border: "4px solid var(--pitch-black)",
          boxShadow: "8px 8px 0px var(--pitch-black)",
          maxWidth: "460px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <LanguageSwitcher currentLanguage={language} />
        </div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 900,
            color: tone === "danger" ? "#ef4444" : "var(--pitch-black)",
            marginBottom: "1rem",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h1>
        <p style={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.5 }}>{description}</p>
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
    return (
      <MessageCard
        language={language}
        title={text.usedTitle}
        description={text.usedDescription}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div
            style={{
              display: "inline-block",
              padding: "0.5rem 1.5rem",
              marginBottom: "1rem",
              fontSize: "0.8rem",
              fontWeight: 900,
              textTransform: "uppercase",
              backgroundColor: "var(--pitch-black)",
              color: "white",
              letterSpacing: "2px",
            }}
          >
            {text.badge}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <LanguageSwitcher currentLanguage={language} />
          </div>
          <h1
            style={{
              fontSize: "clamp(2.8rem, 8vw, 4rem)",
              fontWeight: 900,
              marginBottom: "0.5rem",
            }}
          >
            ORI CRUIT HUB
          </h1>
          <p style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--muted)" }}>
            {text.description}
          </p>
          {candidate.intermediary?.name && (
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", fontWeight: 900 }}>
              {text.recruiter.toUpperCase()}:{" "}
              <span style={{ backgroundColor: "var(--amber-flame)", padding: "0 0.5rem" }}>
                {candidate.intermediary.name.toUpperCase()}
              </span>
            </p>
          )}
        </div>

        <div
          style={{
            backgroundColor: "white",
            border: "4px solid var(--pitch-black)",
            boxShadow: "12px 12px 0px var(--pitch-black)",
            padding: "2rem",
          }}
        >
          <CandidateRegistrationForm
            token={token}
            language={language}
            initialData={{
              firstName: candidate.firstName,
              lastName: candidate.lastName,
            }}
          />
        </div>

        <div
          style={{
            marginTop: "4rem",
            textAlign: "center",
            fontSize: "0.75rem",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          &copy; {new Date().getFullYear()} {text.footer}
        </div>
      </div>
    </div>
  );
}
