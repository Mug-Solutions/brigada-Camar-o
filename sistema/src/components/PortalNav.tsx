"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/portal", label: "Início", icon: "⌂" },
  { href: "/portal/escala", label: "Escala", icon: "▦" },
  { href: "/portal/documentos", label: "Documentos", icon: "▤" },
  { href: "/portal/meus-dados", label: "Meus Dados", icon: "◉" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t"
      style={{ background: "var(--shell-bg)", borderColor: "var(--shell-line)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold"
            style={{ color: active ? "var(--accent)" : "var(--shell-text-soft)" }}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
