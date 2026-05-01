import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Folga Hub - Reclutamiento Inteligente",
  description: "Plataforma de gestión de candidatos y logística para Folga Sp. z o.o.",
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
    >
      <body>
        <div className="app-layout">
          <div className="desktop-only">
            <Sidebar />
          </div>
          <div className="main-container">
            <Header />
            <main className="main-content">
              {children}
            </main>
          </div>
          <div className="mobile-only">
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  );
}
