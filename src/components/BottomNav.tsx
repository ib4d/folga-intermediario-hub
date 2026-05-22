"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Plane, ShieldAlert, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { normalizeLanguage, t } from "@/lib/i18n";

type BottomNavRole = "SUPERADMIN" | "ADMIN" | "INTERMEDIARIO" | "LEGAL" | "LOGISTICA";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as BottomNavRole | undefined;
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  const navItems = [
    { name: labels("nav.dashboard"), href: "/dashboard", icon: Home, roles: ["SUPERADMIN", "ADMIN", "INTERMEDIARIO", "LEGAL", "LOGISTICA"] },
    { name: labels("nav.candidates"), href: "/candidatos", icon: Users, roles: ["SUPERADMIN", "ADMIN", "INTERMEDIARIO", "LEGAL", "LOGISTICA"] },
    { name: labels("nav.documents"), href: "/documentos", icon: FileText, roles: ["SUPERADMIN", "ADMIN", "INTERMEDIARIO", "LEGAL"] },
    { name: labels("nav.logistics"), href: "/logistica", icon: Plane, roles: ["SUPERADMIN", "ADMIN", "LOGISTICA"] },
    { name: labels("nav.legal"), href: "/legal", icon: ShieldAlert, roles: ["SUPERADMIN", "ADMIN", "LEGAL"] },
  ];
  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));

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
