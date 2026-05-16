import type { Metadata } from "next";
import "./globals.css";
import PWALoader from "@/components/PWALoader";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "ORI CRUIT HUB - SaaS Reclutamiento",
  description: "Plataforma SaaS de gestión de candidatos extranjeros y logística.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#fcba04",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <PWALoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
