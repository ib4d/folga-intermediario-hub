"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, BriefcaseBusiness, Car, FileText, Globe, Menu, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { normalizeLanguage, t } from "@/lib/i18n";
import { canAccessModule, type AppModule } from "@/lib/permissions";

type SidebarRole = "SUPERADMIN" | "ADMIN" | "INTERMEDIARIO" | "LEGAL" | "LOGISTICA";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  const role = session?.user?.role as SidebarRole | undefined;
  const links = [
    { name: labels("nav.dashboard"), href: "/dashboard", icon: BarChart3, module: "dashboard" as AppModule },
    { name: labels("nav.brokers"), href: "/brokers", icon: BriefcaseBusiness, module: "brokers" as AppModule },
    { name: labels("nav.candidates"), href: "/candidatos", icon: Users, module: "candidates" as AppModule },
    { name: labels("nav.documents"), href: "/documentos", icon: FileText, module: "documents" as AppModule },
    { name: labels("nav.logistics"), href: "/logistica", icon: Car, module: "logistics" as AppModule },
    { name: labels("nav.legal"), href: "/legal", icon: Briefcase, module: "legal" as AppModule },
    { name: labels("nav.settings"), href: "/ajustes", icon: Settings, module: "settings" as AppModule },
  ];
  const visibleLinks = links.filter((link) => role && canAccessModule(role, link.module));

  const isPlatformAdmin = session?.user?.isPlatformAdmin;

  return (
    <>
      <div className="md:hidden p-4 fixed top-0 left-0 z-50">
        <button className="button" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`sidebar ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed h-full z-40 transition-transform duration-300 ease-in-out`}>
        <div className="sidebar-header">
          <div
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: "var(--pitch-black)",
              border: "1px solid rgba(11, 5, 0, 0.12)",
              boxShadow: "inset 0 0 0 4px var(--primary)",
            }}
          />
          <span>ORI CRUIT HUB</span>
        </div>

        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`nav-link ${isActive ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                {link.name}
              </Link>
            );
          })}

          {isPlatformAdmin ? (
            <Link
              href="/platform"
              className={`nav-link ${pathname.startsWith("/platform") ? "active" : ""}`}
              style={{ marginTop: "1rem", borderTop: "1px solid rgba(111, 104, 99, 0.16)", paddingTop: "1rem" }}
              onClick={() => setIsOpen(false)}
            >
              <Globe size={18} />
              {labels("nav.platformAdmin")}
            </Link>
          ) : null}
        </nav>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid rgba(111, 104, 99, 0.16)", backgroundColor: "rgba(243, 243, 243, 0.7)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {labels("nav.saasVersion")}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>
            {labels("nav.multiTenantReady")}
          </div>
        </div>
      </aside>
    </>
  );
}
