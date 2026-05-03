import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWALoader from "@/components/PWALoader";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Folga Hub - SaaS Reclutamiento",
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
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <PWALoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
