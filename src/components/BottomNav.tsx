"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Plane, ShieldAlert, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { normalizeLanguage, t } from "@/lib/i18n";
import { canAccessModule, type AppModule } from "@/lib/permissions";

type BottomNavRole = "SUPERADMIN" | "ADMIN" | "INTERMEDIARIO" | "LEGAL" | "LOGISTICA";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as BottomNavRole | undefined;
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  const navItems = [
    { name: labels("nav.dashboard"), href: "/dashboard", icon: Home, module: "dashboard" as AppModule },
    { name: labels("nav.candidates"), href: "/candidatos", icon: Users, module: "candidates" as AppModule },
    { name: labels("nav.documents"), href: "/documentos", icon: FileText, module: "documents" as AppModule },
    { name: labels("nav.logistics"), href: "/logistica", icon: Plane, module: "logistics" as AppModule },
    { name: labels("nav.legal"), href: "/legal", icon: ShieldAlert, module: "legal" as AppModule },
  ];
  const visibleItems = navItems.filter((item) => role && canAccessModule(role, item.module));

  return (
    <nav className="bottom-nav">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`bottom-nav-item ${isActive ? "active" : ""}`}>
            <Icon size={22} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
