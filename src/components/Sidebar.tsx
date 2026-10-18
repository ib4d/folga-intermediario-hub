"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, BriefcaseBusiness, Car, ChevronRight, FileText, Globe, Menu, Settings, Users, X, Wallet, KeyRound, Palette, TrendingUp, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeLanguage, t } from "@/lib/i18n";
import { canAccessModule, type AppModule } from "@/lib/permissions";
import BrandLogo from "@/components/BrandLogo";

type SidebarRole = "SUPERADMIN" | "ADMIN" | "INTERMEDIARIO" | "LEGAL" | "LOGISTICA";

type SidebarProps = {
  role: SidebarRole | null;
  interfaceLanguage?: string;
  isPlatformAdmin: boolean;
};

export default function Sidebar({ role, interfaceLanguage, isPlatformAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const language = normalizeLanguage(interfaceLanguage);
  const labels = t.bind(null, language);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const links = [
    { name: labels("nav.dashboard"), href: "/dashboard", icon: BarChart3, module: "dashboard" as AppModule, group: "operations" },
    { name: labels("nav.candidates"), href: "/candidatos", icon: Users, module: "candidates" as AppModule, group: "operations" },
    { name: labels("nav.documents"), href: "/documentos", icon: FileText, module: "documents" as AppModule, group: "operations" },
    { name: labels("nav.legal"), href: "/legal", icon: Briefcase, module: "legal" as AppModule, group: "operations" },
    { name: labels("nav.logistics"), href: "/logistica", icon: Car, module: "logistics" as AppModule, group: "operations" },
    { name: labels("nav.brokers"), href: "/brokers", icon: BriefcaseBusiness, module: "brokers" as AppModule, group: "partners" },
    { name: labels("module.leads"), href: "/leads", icon: TrendingUp, module: "leads" as AppModule, group: "business" },
    { name: labels("module.revenue"), href: "/revenue", icon: Wallet, module: "revenue" as AppModule, group: "business" },
    { name: labels("module.marketplace"), href: "/marketplace", icon: Store, module: "marketplace" as AppModule, group: "business" },
    { name: labels("module.billing"), href: "/billing", icon: Wallet, module: "billing" as AppModule, group: "administration" },
    { name: labels("nav.settings"), href: "/ajustes", icon: Settings, module: "settings" as AppModule, group: "administration" },
    { name: labels("module.apiKeys"), href: "/ajustes/api-keys", icon: KeyRound, module: "apiKeys" as AppModule, group: "administration" },
    { name: labels("module.branding"), href: "/ajustes/branding", icon: Palette, module: "branding" as AppModule, group: "administration" },
  ];
  const navGroups = [
    { id: "operations", label: labels("nav.group.operations") },
    { id: "partners", label: labels("nav.group.partners") },
    { id: "business", label: labels("nav.group.business") },
    { id: "administration", label: labels("nav.group.administration") },
  ].map((group) => ({
    ...group,
    links: links.filter((link) => link.group === group.id && role !== null && canAccessModule(role, link.module)),
  })).filter((group) => group.links.length > 0);

  return (
    <>
      <button
        type="button"
        className={`button sidebar-menu-toggle ${isOpen ? "is-open" : ""}`}
        aria-label={isOpen ? "Cerrar menú" : isCollapsed ? "Expandir menú" : "Contraer menú"}
        aria-expanded={isOpen || !isCollapsed}
        aria-controls="app-sidebar"
        onClick={() => {
          if (window.matchMedia("(max-width: 768px)").matches) setIsOpen(!isOpen);
          else setIsCollapsed(!isCollapsed);
        }}
      >
        {isOpen ? <X size={20} /> : isCollapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
      </button>

      {isOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={`sidebar ${isOpen ? "sidebar--mobile-open" : ""} ${isCollapsed ? "sidebar--collapsed" : ""}`}
      >
        <div className="sidebar-header">
          <Link
            href={role ? "/dashboard" : "/platform"}
            className="sidebar-brand-link"
            aria-label={role ? "ORI CRUIT HUB dashboard" : labels("nav.platformAdmin")}
          >
            <BrandLogo variant="green-dark" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="sidebar-nav-group" key={group.id}>
              <p className="sidebar-nav-label">{group.label}</p>
              {group.links.map((link) => {
                const Icon = link.icon;
                const isActive = isSidebarItemActive(link.href, pathname);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    aria-label={link.name}
                    title={isCollapsed ? link.name : undefined}
                    className={`nav-link ${isActive ? "active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={18} />
                    <span className="nav-link-label">{link.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {isPlatformAdmin ? (
            <div className="sidebar-nav-group sidebar-nav-group-platform">
              <p className="sidebar-nav-label">{labels("nav.group.platform")}</p>
              <Link
                href="/platform"
                aria-label={labels("nav.platformAdmin")}
                title={isCollapsed ? labels("nav.platformAdmin") : undefined}
                className={`nav-link sidebar-platform-link ${pathname.startsWith("/platform") ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Globe size={18} />
                <span className="nav-link-label">{labels("nav.platformAdmin")}</span>
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-title">{labels("nav.saasVersion")}</div>
          <div className="sidebar-footer-copy">{labels("nav.multiTenantReady")}</div>
        </div>
      </aside>
    </>
  );
}

function isSidebarItemActive(href: string, pathname: string) {
  if (href === "/brokers") {
    return ["/brokers", "/broker-invoices", "/broker-dashboard"].some(
      (basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`),
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
