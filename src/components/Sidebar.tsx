"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  FileText, 
  Car, 
  Briefcase, 
  BarChart3, 
  Settings,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Candidatos", href: "/candidatos", icon: Users },
    { name: "Documentos", href: "/documentos", icon: FileText },
    { name: "Logística", href: "/logistica", icon: Car },
    { name: "Legal", href: "/legal", icon: Briefcase },
    { name: "Ajustes", href: "/ajustes", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden p-4 fixed top-0 left-0 z-50">
        <button 
          className="button"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static h-full z-40 transition-transform duration-300 ease-in-out`}>
        <div className="sidebar-header">
          <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--pitch-black)' }}></div>
          <span>FOLGA HUB</span>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--muted)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>VERSION 1.0</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Zero-Border UI</div>
        </div>
      </aside>
    </>
  );
}
