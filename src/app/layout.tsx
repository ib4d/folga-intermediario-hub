import type { Metadata } from "next";
import "./globals.css";
import "./editorial.css";
import PWALoader from "@/components/PWALoader";
import { Providers } from "@/components/Providers";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import { isSupportedLanguage, normalizeLanguage } from "@/lib/i18n";
import { PUBLIC_SITE_URL } from "@/lib/public-seo";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-editorial-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], variable: "--font-editorial-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: PUBLIC_SITE_URL,
  title: "ORI CRUIT HUB | International recruitment operations",
  description: "Coordinate candidates, documents, reviews, and logistics in one workflow for international recruitment agencies.",
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#e4ff4d",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const languageHeader = (await headers()).get("x-ori-language");
  const language = isSupportedLanguage(languageHeader) ? languageHeader : normalizeLanguage(languageHeader);
  return (
    <html lang={language} className={`${inter.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <PWALoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
