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
  },
} as const;

type TranslationKey = keyof typeof translations.es;

export function t(language: AppLanguage, key: TranslationKey): string {
  return translations[language][key] ?? translations[DEFAULT_LANGUAGE][key];
}
