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
      <button
        type="button"
        className="button md:hidden sidebar-menu-toggle"
        aria-label={isOpen ? "Cerrar menÄ‚Ĺź" : "Abrir menÄ‚Ĺź"}
        aria-expanded={isOpen}
        aria-controls="app-sidebar"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen ? (
        <button
          type="button"
          className="sidebar-backdrop md:hidden"
          aria-label="Cerrar menÄ‚Ĺź"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={`sidebar ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed h-full z-40 transition-transform duration-300 ease-in-out`}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand-mark" />
          <span className="sidebar-brand-text">ORI CRUIT HUB</span>
        </div>

        <nav className="sidebar-nav">
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
              className={`nav-link sidebar-platform-link ${pathname.startsWith("/platform") ? "active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              <Globe size={18} />
              {labels("nav.platformAdmin")}
            </Link>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-title">
            {labels("nav.saasVersion")}
          </div>
          <div className="sidebar-footer-copy">
            {labels("nav.multiTenantReady")}
          </div>
        </div>
      </aside>
    </>
  );
}
