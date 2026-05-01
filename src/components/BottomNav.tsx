"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plane, ShieldAlert } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inicio", href: "/", icon: Home },
    { name: "Candidatos", href: "/candidatos", icon: Users },
    { name: "Logística", href: "/logistica", icon: Plane },
    { name: "Legal", href: "/legal", icon: ShieldAlert },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={24} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
