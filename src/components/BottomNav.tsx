"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Plane, ShieldAlert, Users } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inicio", href: "/dashboard", icon: Home },
    { name: "Candidatos", href: "/candidatos", icon: Users },
    { name: "Docs", href: "/documentos", icon: FileText },
    { name: "Logistica", href: "/logistica", icon: Plane },
    { name: "Legal", href: "/legal", icon: ShieldAlert },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
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
