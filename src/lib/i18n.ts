export const SUPPORTED_LANGUAGES = ["es", "en", "pl"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "es";

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  es: "Español",
  en: "English",
  pl: "Polski",
};

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export function normalizeLanguage(value: unknown): AppLanguage {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

const translations = {
  es: {
    "common.save": "Guardar",
    "common.saving": "Guardando...",
    "common.saved": "Guardado",
    "common.savePreferences": "Guardar preferencias",
    "common.noPermission": "Sin permisos",
    "nav.dashboard": "Dashboard",
    "nav.candidates": "Candidatos",
    "nav.documents": "Documentos",
    "nav.logistics": "Logistica",
    "nav.legal": "Legal",
    "nav.settings": "Ajustes",
    "nav.platformAdmin": "Platform Admin",
    "settings.profileSecurity": "Perfil y Seguridad",
    "settings.interfaceLanguage": "Idioma de interfaz",
    "settings.preferredLanguage": "Idioma preferido",
    "settings.languageHelp":
      "Base preparada para ES, PL y EN. Las pantallas se iran conectando por modulo.",
    "settings.emailNotifications": "Notificaciones por email",
    "public.nav.features": "Funcionalidades",
    "public.nav.pricing": "Precios",
    "public.nav.login": "Iniciar sesion",
    "public.hero.titleA": "De WhatsApp y Excel al",
    "public.hero.titleB": "Control Total",
    "public.hero.description":
      "La plataforma ATS especializada en reclutamiento internacional. OCR automatico, flujos legales y logistica en un solo lugar.",
    "public.hero.primaryCta": "Empieza gratis ahora",
    "public.hero.secondaryCta": "Solicitar demo",
    "public.problem.title": "El caos del reclutamiento internacional",
    "public.features.title": "Centraliza tu crecimiento",
    "public.features.description":
      "ORI CRUIT HUB automatiza las tareas administrativas para que tu equipo se enfoque en el talento.",
    "public.pricing.title": "Planes hechos para crecer",
    "public.pricing.description": "Elige el plan que mejor se adapte al volumen de tu agencia.",
    "public.footer.description":
      "Sustituyendo el caos de WhatsApp y Excel con tecnologia disenada para el reclutamiento internacional.",
    "login.badge": "Acceso seguro",
    "login.shellTitle": "Entra a tu mesa de control",
    "login.shellDescription":
      "Accede al flujo operativo de ORI CRUIT HUB para revisar candidatos, documentos y tareas pendientes.",
    "login.footer":
      "Si tu cuenta aun no tiene organizacion asignada, el sistema te llevara al onboarding despues de entrar.",
    "login.title": "Iniciar sesion",
    "login.description": "Usa tus credenciales para continuar con el trabajo diario del equipo.",
    "login.email": "Correo electronico",
    "login.password": "Contrasena",
    "login.passwordPlaceholder": "Introduce tu contrasena",
    "login.submit": "Entrar",
    "login.submitting": "Entrando...",
    "login.clearSession": "Limpiar sesion antigua",
    "login.invalidCredentials": "Correo o contrasena incorrectos.",
    "login.genericError": "Error al iniciar sesion.",
  },
  en: {
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.saved": "Saved",
    "common.savePreferences": "Save preferences",
    "common.noPermission": "No permission",
    "nav.dashboard": "Dashboard",
    "nav.candidates": "Candidates",
    "nav.documents": "Documents",
    "nav.logistics": "Logistics",
    "nav.legal": "Legal",
    "nav.settings": "Settings",
    "nav.platformAdmin": "Platform Admin",
    "settings.profileSecurity": "Profile and Security",
    "settings.interfaceLanguage": "Interface language",
    "settings.preferredLanguage": "Preferred language",
    "settings.languageHelp":
      "Foundation ready for ES, PL and EN. Screens will be connected module by module.",
    "settings.emailNotifications": "Email notifications",
    "public.nav.features": "Features",
    "public.nav.pricing": "Pricing",
    "public.nav.login": "Sign in",
    "public.hero.titleA": "From WhatsApp and Excel to",
    "public.hero.titleB": "Total Control",
    "public.hero.description":
      "The ATS platform built for international recruitment. Automatic OCR, legal workflows and logistics in one place.",
    "public.hero.primaryCta": "Start free now",
    "public.hero.secondaryCta": "Request demo",
    "public.problem.title": "The chaos of international recruitment",
    "public.features.title": "Centralize your growth",
    "public.features.description":
      "ORI CRUIT HUB automates administrative work so your team can focus on talent.",
    "public.pricing.title": "Plans built to scale",
    "public.pricing.description": "Choose the plan that fits your agency volume.",
    "public.footer.description":
      "Replacing WhatsApp and Excel chaos with software designed for international recruitment.",
    "login.badge": "Secure access",
    "login.shellTitle": "Enter your control desk",
    "login.shellDescription":
      "Access ORI CRUIT HUB operations to review candidates, documents and pending work.",
    "login.footer":
      "If your account has no organization assigned yet, the system will take you to onboarding after sign in.",
    "login.title": "Sign in",
    "login.description": "Use your credentials to continue your team's daily work.",
    "login.email": "Email",
    "login.password": "Password",
    "login.passwordPlaceholder": "Enter your password",
    "login.submit": "Sign in",
    "login.submitting": "Signing in...",
    "login.clearSession": "Clear old session",
    "login.invalidCredentials": "Incorrect email or password.",
    "login.genericError": "Could not sign in.",
  },
  pl: {
    "common.save": "Zapisz",
    "common.saving": "Zapisywanie...",
    "common.saved": "Zapisano",
    "common.savePreferences": "Zapisz preferencje",
    "common.noPermission": "Brak uprawnień",
    "nav.dashboard": "Panel",
    "nav.candidates": "Kandydaci",
    "nav.documents": "Dokumenty",
    "nav.logistics": "Logistyka",
    "nav.legal": "Legalizacja",
    "nav.settings": "Ustawienia",
    "nav.platformAdmin": "Admin platformy",
    "settings.profileSecurity": "Profil i bezpieczeństwo",
    "settings.interfaceLanguage": "Język interfejsu",
    "settings.preferredLanguage": "Preferowany język",
    "settings.languageHelp":
      "Podstawa gotowa dla ES, PL i EN. Ekrany będą podłączane moduł po module.",
    "settings.emailNotifications": "Powiadomienia e-mail",
    "public.nav.features": "Funkcje",
    "public.nav.pricing": "Cennik",
    "public.nav.login": "Logowanie",
    "public.hero.titleA": "Od WhatsAppa i Excela do",
    "public.hero.titleB": "Pełnej kontroli",
    "public.hero.description":
      "Platforma ATS dla rekrutacji międzynarodowej. Automatyczny OCR, procesy legalizacji i logistyka w jednym miejscu.",
    "public.hero.primaryCta": "Zacznij za darmo",
    "public.hero.secondaryCta": "Poproś o demo",
    "public.problem.title": "Chaos rekrutacji międzynarodowej",
    "public.features.title": "Centralizuj wzrost",
    "public.features.description":
      "ORI CRUIT HUB automatyzuje pracę administracyjną, aby zespół mógł skupić się na kandydatach.",
    "public.pricing.title": "Plany stworzone do skalowania",
    "public.pricing.description": "Wybierz plan dopasowany do wolumenu Twojej agencji.",
    "public.footer.description":
      "Zastępujemy chaos WhatsAppa i Excela technologią stworzoną dla rekrutacji międzynarodowej.",
    "login.badge": "Bezpieczny dostęp",
    "login.shellTitle": "Wejdź do centrum kontroli",
    "login.shellDescription":
      "Pracuj w ORI CRUIT HUB nad kandydatami, dokumentami i zadaniami operacyjnymi.",
    "login.footer":
      "Jeśli konto nie ma jeszcze przypisanej organizacji, system przeniesie Cię do onboardingu po zalogowaniu.",
    "login.title": "Logowanie",
    "login.description": "Użyj danych logowania, aby kontynuować codzienną pracę zespołu.",
    "login.email": "Adres e-mail",
    "login.password": "Hasło",
    "login.passwordPlaceholder": "Wpisz hasło",
    "login.submit": "Zaloguj",
    "login.submitting": "Logowanie...",
    "login.clearSession": "Wyczyść starą sesję",
    "login.invalidCredentials": "Nieprawidłowy e-mail lub hasło.",
    "login.genericError": "Nie udało się zalogować.",
  },
} as const;

type TranslationKey = keyof typeof translations.es;

export function t(language: AppLanguage, key: TranslationKey): string {
  return translations[language][key] ?? translations[DEFAULT_LANGUAGE][key];
}

export function localizedHref(href: string, language: AppLanguage): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}
