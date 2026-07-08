"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/brokers", label: "Brokers" },
  { href: "/brokers/leads", label: "Broker Leads" },
  { href: "/broker-invoices", label: "Broker Invoices" },
  { href: "/broker-dashboard", label: "Broker Dashboard" },
];

export default function BrokerModuleNav() {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="button"
            style={{
              textDecoration: "none",
              backgroundColor: active ? "var(--primary)" : "white",
              color: "var(--pitch-black)",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
