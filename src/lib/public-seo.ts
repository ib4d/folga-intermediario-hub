import type { Metadata } from "next";
import type { AppLanguage } from "@/lib/i18n";

export const PUBLIC_SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://app.ori-craftlabs.com"
);

const LANGUAGE_URLS: Record<AppLanguage, string> = {
  es: "?lang=es",
  en: "?lang=en",
  pl: "?lang=pl",
};

export function publicPageMetadata({
  language,
  path,
  title,
  description,
}: {
  language: AppLanguage;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const canonical = `${path}${LANGUAGE_URLS[language]}`;
  const localizedAlternates = Object.fromEntries(
    Object.entries(LANGUAGE_URLS).map(([locale, query]) => [locale, `${path}${query}`])
  );

  return {
    title,
    description,
    alternates: { canonical, languages: { ...localizedAlternates, "x-default": `${path}?lang=es` } },
    openGraph: {
      type: "website",
      siteName: "ORI CRUIT HUB",
      title,
      description,
      url: canonical,
      locale: language === "es" ? "es_ES" : language === "pl" ? "pl_PL" : "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
