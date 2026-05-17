"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppLanguage, LANGUAGE_LABELS, SUPPORTED_LANGUAGES, normalizeLanguage } from "@/lib/i18n";

export default function LanguageSwitcher({ currentLanguage }: { currentLanguage?: AppLanguage }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLanguage = currentLanguage ?? normalizeLanguage(searchParams.get("lang"));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }} aria-label="Language selector">
      {SUPPORTED_LANGUAGES.map((language) => {
        const params = new URLSearchParams(searchParams);
        params.set("lang", language);
        const isActive = language === activeLanguage;

        return (
          <Link
            key={language}
            href={`${pathname}?${params.toString()}`}
            title={LANGUAGE_LABELS[language]}
            style={{
              color: isActive ? "var(--pitch-black)" : "inherit",
              backgroundColor: isActive ? "var(--amber-flame)" : "transparent",
              border: "1px solid currentColor",
              padding: "0.25rem 0.45rem",
              fontSize: "0.72rem",
              fontWeight: 900,
              textDecoration: "none",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {language}
          </Link>
        );
      })}
    </div>
  );
}
