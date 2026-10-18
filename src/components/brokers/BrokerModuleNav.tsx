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
  const currentSection = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0];

  return (
    <div className="broker-module-nav">
      {links.map((link) => {
        const active = currentSection?.href === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`button broker-module-nav-link ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
