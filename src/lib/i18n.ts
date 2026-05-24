export const SUPPORTED_LANGUAGES = ["es", "en", "pl"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "es";

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  es: "Espanol",
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
    "settings.systemTitle": "Ajustes del Sistema",
    "settings.systemDescription":
      "Configuracion de usuarios, notificaciones y exportacion de datos.",
    "settings.organization": "Organizacion",
    "settings.branding": "Branding",
    "settings.logoColors": "Logo y colores",
    "settings.apiKeys": "API Keys",
    "settings.integrations": "Integraciones",
    "settings.billing": "Facturacion",
    "settings.planPayments": "Plan y pagos",
    "settings.currentAccess": "Tu Acceso Actual",
    "settings.currentAccessDescription":
      "Resumen operativo del rol con el que estas trabajando ahora.",
    "settings.scope": "Alcance",
    "settings.management": "Gestion",
    "settings.manageAccess": "Puede administrar accesos",
    "settings.readOnly": "Solo lectura",
    "settings.visibleUsers": "Usuarios visibles",
    "settings.allowedDirectory": "Directorio permitido",
    "settings.enabledModules": "Modulos habilitados",
    "settings.membersTitleManage": "Miembros de la Organizacion",
    "settings.membersTitleRead": "Usuarios Visibles Para Tu Rol",
    "settings.inviteUser": "Invitar Usuario",
    "settings.superadminAdminOnly": "Solo Superadmin o Administrador",
    "settings.name": "Nombre",
    "settings.email": "Email",
    "settings.role": "Rol",
    "settings.status": "Estado",
    "settings.permissions": "Permisos",
    "settings.active": "Activo",
    "settings.inactive": "Inactivo",
    "settings.saveRole": "Guardar rol",
    "settings.removeAccess": "Quitar acceso",
    "settings.enableAccess": "Activar acceso",
    "settings.permissionMatrix": "Matriz de Permisos",
    "settings.permissionMatrixDescription":
      "Control de visibilidad y administracion por jerarquia.",
    "settings.activeMatrixAdmin":
      "Matriz activa: Superadmin ve y gestiona todo. Admin gestiona Legal, Logistica e Intermediarios.",
    "settings.activeMatrixRead":
      "Vista restringida: solo puedes consultar usuarios permitidos para tu mismo rango operativo.",
    "settings.dataExport": "Exportacion de Datos",
    "settings.dataExportDescription":
      "Genera reportes para RRHH, marketing o direccion basados en la base de datos actual.",
    "settings.interfaceLanguage": "Idioma de interfaz",
    "settings.preferredLanguage": "Idioma preferido",
    "settings.languageHelp":
      "Base preparada para ES, PL y EN. Las pantallas se iran conectando por modulo.",
    "settings.emailNotifications": "Notificaciones por email",
    "settings.avatar": "Avatar / Foto de Perfil",
    "settings.avatarPlaceholder": "URL de la imagen (ej: https://ejemplo.com/foto.jpg)",
    "settings.avatarHelp":
      "Pega una URL publica o subela a tu proveedor de almacenamiento.",
    "settings.twoFactor": "Autenticacion en 2 Pasos (2FA)",
    "settings.disabled": "Desactivado",
    "settings.twoFactorHelp":
      "Se activara cuando el flujo 2FA este conectado a correo o autenticador.",
    "settings.changePassword": "Cambiar Contrasena",
    "settings.currentPassword": "Contrasena actual",
    "settings.newPassword": "Nueva contrasena",
    "settings.confirmPassword": "Confirmar nueva contrasena",
    "settings.passwordMinLength":
      "La nueva contrasena necesita minimo 12 caracteres.",
    "settings.passwordMismatch": "La confirmacion no coincide.",
    "settings.passwordUpdateFailed": "No se pudo actualizar la contrasena.",
    "settings.passwordUpdated": "Contrasena actualizada correctamente.",
    "settings.preferencesSaved": "Preferencias guardadas correctamente.",
    "settings.preferencesSaveError": "Error al guardar preferencias.",
    "settings.notifyNewCandidates": "Nuevos candidatos",
    "settings.notifyLegalAlerts": "Alertas legales urgentes",
    "settings.notifyExpiringDocs": "Documentos a punto de expirar",
    "invite.title": "Invitar Nuevo Usuario",
    "invite.manualDeliveryRequired": "Entrega manual requerida",
    "invite.manualDeliveryHelp":
      "Comparte esta contrasena temporal con el usuario por un canal seguro.",
    "invite.copyPassword": "Copiar clave",
    "invite.copied": "Copiada",
    "invite.name": "Nombre",
    "invite.fullNamePlaceholder": "Nombre completo",
    "invite.email": "Correo Electronico",
    "invite.emailPlaceholder": "correo@ejemplo.com",
    "invite.role": "Rol",
    "invite.roleHelp": "Solo veras roles que tu nivel puede conceder.",
    "invite.submitting": "Enviando...",
    "invite.submit": "Crear usuario e invitar",
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
    "public.pricing.description":
      "Elige el plan que mejor se adapte al volumen de tu agencia.",
    "public.footer.description":
      "Sustituyendo el caos de WhatsApp y Excel con tecnologia disenada para el reclutamiento internacional.",
    "login.badge": "Acceso seguro",
    "login.shellTitle": "Entra a tu mesa de control",
    "login.shellDescription":
      "Accede al flujo operativo de ORI CRUIT HUB para revisar candidatos, documentos y tareas pendientes.",
    "login.footer":
      "Si tu cuenta aun no tiene organizacion asignada, el sistema te llevara al onboarding despues de entrar.",
    "login.title": "Iniciar sesion",
    "login.description":
      "Usa tus credenciales para continuar con el trabajo diario del equipo.",
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
    "settings.systemTitle": "System Settings",
    "settings.systemDescription":
      "User configuration, notifications and data export.",
    "settings.organization": "Organization",
    "settings.branding": "Branding",
    "settings.logoColors": "Logo and colors",
    "settings.apiKeys": "API Keys",
    "settings.integrations": "Integrations",
    "settings.billing": "Billing",
    "settings.planPayments": "Plan and payments",
    "settings.currentAccess": "Your Current Access",
    "settings.currentAccessDescription":
      "Operational summary of the role you are currently using.",
    "settings.scope": "Scope",
    "settings.management": "Management",
    "settings.manageAccess": "Can manage access",
    "settings.readOnly": "Read only",
    "settings.visibleUsers": "Visible users",
    "settings.allowedDirectory": "Allowed directory",
    "settings.enabledModules": "Enabled modules",
    "settings.membersTitleManage": "Organization Members",
    "settings.membersTitleRead": "Users Visible To Your Role",
    "settings.inviteUser": "Invite User",
    "settings.superadminAdminOnly": "Only Superadmin or Administrator",
    "settings.name": "Name",
    "settings.email": "Email",
    "settings.role": "Role",
    "settings.status": "Status",
    "settings.permissions": "Permissions",
    "settings.active": "Active",
    "settings.inactive": "Inactive",
    "settings.saveRole": "Save role",
    "settings.removeAccess": "Remove access",
    "settings.enableAccess": "Enable access",
    "settings.permissionMatrix": "Permission Matrix",
    "settings.permissionMatrixDescription":
      "Visibility and administration control by hierarchy.",
    "settings.activeMatrixAdmin":
      "Active matrix: Superadmin sees and manages everything. Admin manages Legal, Logistics and Intermediaries.",
    "settings.activeMatrixRead":
      "Restricted view: you can only consult users allowed for your own operational tier.",
    "settings.dataExport": "Data Export",
    "settings.dataExportDescription":
      "Generate reports for HR, marketing or management based on current data.",
    "settings.interfaceLanguage": "Interface language",
    "settings.preferredLanguage": "Preferred language",
    "settings.languageHelp":
      "Foundation ready for ES, PL and EN. Screens will be connected module by module.",
    "settings.emailNotifications": "Email notifications",
    "settings.avatar": "Avatar / Profile Photo",
    "settings.avatarPlaceholder": "Image URL (e.g. https://example.com/photo.jpg)",
    "settings.avatarHelp":
      "Paste a public URL or upload it to your storage provider.",
    "settings.twoFactor": "Two-Factor Authentication (2FA)",
    "settings.disabled": "Disabled",
    "settings.twoFactorHelp":
      "It will become available when the 2FA flow is connected to email or an authenticator.",
    "settings.changePassword": "Change Password",
    "settings.currentPassword": "Current password",
    "settings.newPassword": "New password",
    "settings.confirmPassword": "Confirm new password",
    "settings.passwordMinLength":
      "The new password must contain at least 12 characters.",
    "settings.passwordMismatch": "Confirmation does not match.",
    "settings.passwordUpdateFailed": "Could not update the password.",
    "settings.passwordUpdated": "Password updated successfully.",
    "settings.preferencesSaved": "Preferences saved successfully.",
    "settings.preferencesSaveError": "Error saving preferences.",
    "settings.notifyNewCandidates": "New candidates",
    "settings.notifyLegalAlerts": "Urgent legal alerts",
    "settings.notifyExpiringDocs": "Documents about to expire",
    "invite.title": "Invite New User",
    "invite.manualDeliveryRequired": "Manual delivery required",
    "invite.manualDeliveryHelp":
      "Share this temporary password with the user through a secure channel.",
    "invite.copyPassword": "Copy password",
    "invite.copied": "Copied",
    "invite.name": "Name",
    "invite.fullNamePlaceholder": "Full name",
    "invite.email": "Email",
    "invite.emailPlaceholder": "email@example.com",
    "invite.role": "Role",
    "invite.roleHelp": "You will only see roles your level can grant.",
    "invite.submitting": "Sending...",
    "invite.submit": "Create user and invite",
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
    "public.pricing.description":
      "Choose the plan that fits your agency volume.",
    "public.footer.description":
      "Replacing WhatsApp and Excel chaos with software designed for international recruitment.",
    "login.badge": "Secure access",
    "login.shellTitle": "Enter your control desk",
    "login.shellDescription":
      "Access ORI CRUIT HUB operations to review candidates, documents and pending work.",
    "login.footer":
      "If your account has no organization assigned yet, the system will take you to onboarding after sign in.",
    "login.title": "Sign in",
    "login.description":
      "Use your credentials to continue your team's daily work.",
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
    "common.noPermission": "Brak uprawnien",
    "nav.dashboard": "Panel",
    "nav.candidates": "Kandydaci",
    "nav.documents": "Dokumenty",
    "nav.logistics": "Logistyka",
    "nav.legal": "Legalizacja",
    "nav.settings": "Ustawienia",
    "nav.platformAdmin": "Admin platformy",
    "settings.profileSecurity": "Profil i bezpieczenstwo",
    "settings.systemTitle": "Ustawienia systemu",
    "settings.systemDescription":
      "Konfiguracja uzytkownikow, powiadomien i eksportu danych.",
    "settings.organization": "Organizacja",
    "settings.branding": "Branding",
    "settings.logoColors": "Logo i kolory",
    "settings.apiKeys": "Klucze API",
    "settings.integrations": "Integracje",
    "settings.billing": "Rozliczenia",
    "settings.planPayments": "Plan i platnosci",
    "settings.currentAccess": "Twoj obecny dostep",
    "settings.currentAccessDescription":
      "Operacyjne podsumowanie roli, z ktorej teraz korzystasz.",
    "settings.scope": "Zakres",
    "settings.management": "Zarzadzanie",
    "settings.manageAccess": "Moze zarzadzac dostepem",
    "settings.readOnly": "Tylko odczyt",
    "settings.visibleUsers": "Widoczni uzytkownicy",
    "settings.allowedDirectory": "Dozwolony katalog",
    "settings.enabledModules": "Aktywne moduly",
    "settings.membersTitleManage": "Czlonkowie organizacji",
    "settings.membersTitleRead": "Uzytkownicy widoczni dla Twojej roli",
    "settings.inviteUser": "Zapros uzytkownika",
    "settings.superadminAdminOnly": "Tylko Superadmin lub Administrator",
    "settings.name": "Nazwa",
    "settings.email": "E-mail",
    "settings.role": "Rola",
    "settings.status": "Status",
    "settings.permissions": "Uprawnienia",
    "settings.active": "Aktywny",
    "settings.inactive": "Nieaktywny",
    "settings.saveRole": "Zapisz role",
    "settings.removeAccess": "Odbierz dostep",
    "settings.enableAccess": "Aktywuj dostep",
    "settings.permissionMatrix": "Matryca uprawnien",
    "settings.permissionMatrixDescription":
      "Kontrola widocznosci i administracji wedlug hierarchii.",
    "settings.activeMatrixAdmin":
      "Aktywna matryca: Superadmin widzi i zarzadza wszystkim. Admin zarzadza Legal, Logistyka i Posrednikami.",
    "settings.activeMatrixRead":
      "Widok ograniczony: mozesz przegladac tylko uzytkownikow dozwolonych dla Twojego poziomu operacyjnego.",
    "settings.dataExport": "Eksport danych",
    "settings.dataExportDescription":
      "Generuj raporty dla HR, marketingu lub zarzadu na podstawie obecnych danych.",
    "settings.interfaceLanguage": "Jezyk interfejsu",
    "settings.preferredLanguage": "Preferowany jezyk",
    "settings.languageHelp":
      "Podstawa jest gotowa dla ES, PL i EN. Ekrany beda podlaczane modul po module.",
    "settings.emailNotifications": "Powiadomienia e-mail",
    "settings.avatar": "Avatar / Zdjecie profilowe",
    "settings.avatarPlaceholder": "URL obrazu (np. https://example.com/photo.jpg)",
    "settings.avatarHelp":
      "Wklej publiczny URL lub przeslij go do swojego dostawcy storage.",
    "settings.twoFactor": "Uwierzytelnianie dwuskladnikowe (2FA)",
    "settings.disabled": "Wylaczone",
    "settings.twoFactorHelp":
      "Opcja bedzie dostepna, gdy przeplyw 2FA zostanie podlaczony do e-maila lub aplikacji uwierzytelniajacej.",
    "settings.changePassword": "Zmien haslo",
    "settings.currentPassword": "Obecne haslo",
    "settings.newPassword": "Nowe haslo",
    "settings.confirmPassword": "Potwierdz nowe haslo",
    "settings.passwordMinLength":
      "Nowe haslo musi miec co najmniej 12 znakow.",
    "settings.passwordMismatch": "Potwierdzenie nie zgadza sie.",
    "settings.passwordUpdateFailed": "Nie udalo sie zaktualizowac hasla.",
    "settings.passwordUpdated": "Haslo zostalo zaktualizowane.",
    "settings.preferencesSaved": "Preferencje zapisano poprawnie.",
    "settings.preferencesSaveError": "Blad podczas zapisywania preferencji.",
    "settings.notifyNewCandidates": "Nowi kandydaci",
    "settings.notifyLegalAlerts": "Pilne alerty prawne",
    "settings.notifyExpiringDocs": "Dokumenty bliskie wygasniecia",
    "invite.title": "Zapros nowego uzytkownika",
    "invite.manualDeliveryRequired": "Wymagane reczne przekazanie",
    "invite.manualDeliveryHelp":
      "Przekaz to tymczasowe haslo uzytkownikowi bezpiecznym kanalem.",
    "invite.copyPassword": "Kopiuj haslo",
    "invite.copied": "Skopiowano",
    "invite.name": "Nazwa",
    "invite.fullNamePlaceholder": "Pelne imie i nazwisko",
    "invite.email": "Adres e-mail",
    "invite.emailPlaceholder": "email@example.com",
    "invite.role": "Rola",
    "invite.roleHelp": "Zobaczysz tylko role, ktore Twoj poziom moze nadac.",
    "invite.submitting": "Wysylanie...",
    "invite.submit": "Utworz uzytkownika i zapros",
    "public.nav.features": "Funkcje",
    "public.nav.pricing": "Cennik",
    "public.nav.login": "Logowanie",
    "public.hero.titleA": "Od WhatsAppa i Excela do",
    "public.hero.titleB": "Pelnej kontroli",
    "public.hero.description":
      "Platforma ATS dla rekrutacji miedzynarodowej. Automatyczny OCR, procesy legalizacji i logistyka w jednym miejscu.",
    "public.hero.primaryCta": "Zacznij za darmo",
    "public.hero.secondaryCta": "Popros o demo",
    "public.problem.title": "Chaos rekrutacji miedzynarodowej",
    "public.features.title": "Centralizuj wzrost",
    "public.features.description":
      "ORI CRUIT HUB automatyzuje prace administracyjna, aby zespol mogl skupic sie na kandydatach.",
    "public.pricing.title": "Plany stworzone do skalowania",
    "public.pricing.description":
      "Wybierz plan dopasowany do wolumenu Twojej agencji.",
    "public.footer.description":
      "Zastepujemy chaos WhatsAppa i Excela technologia stworzona dla rekrutacji miedzynarodowej.",
    "login.badge": "Bezpieczny dostep",
    "login.shellTitle": "Wejdz do centrum kontroli",
    "login.shellDescription":
      "Pracuj w ORI CRUIT HUB nad kandydatami, dokumentami i zadaniami operacyjnymi.",
    "login.footer":
      "Jesli konto nie ma jeszcze przypisanej organizacji, system przeniesie Cie do onboardingu po zalogowaniu.",
    "login.title": "Logowanie",
    "login.description":
      "Uzyj danych logowania, aby kontynuowac codzienna prace zespolu.",
    "login.email": "Adres e-mail",
    "login.password": "Haslo",
    "login.passwordPlaceholder": "Wpisz haslo",
    "login.submit": "Zaloguj",
    "login.submitting": "Logowanie...",
    "login.clearSession": "Wyczysc stara sesje",
    "login.invalidCredentials": "Nieprawidlowy e-mail lub haslo.",
    "login.genericError": "Nie udalo sie zalogowac.",
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
