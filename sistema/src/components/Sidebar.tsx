"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/painel", label: "Painel", icon: "◆" },
  { href: "/bombeiros", label: "Bombeiros", icon: "☰" },
  { href: "/eventos", label: "Eventos & Escalas", icon: "▦" },
  { href: "/financeiro", label: "Financeiro", icon: "$" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar flex w-[236px] shrink-0 flex-col p-4">
      <div className="px-1.5 pb-2 pt-0.5">
        <div className="flex flex-col" style={{ fontFamily: "var(--font-display)" }}>
          <span className="text-[15px] tracking-wide" style={{ color: "var(--shell-text-soft)" }}>
            BRIGADA
          </span>
          <span className="text-[22px] leading-tight" style={{ color: "var(--accent)" }}>
            CAMARÃO
          </span>
        </div>
      </div>
      <div
        className="mb-4 border-b px-1.5 pb-5 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ borderColor: "var(--shell-line)", color: "var(--shell-text-soft)" }}
      >
        Gestão de Bombeiros Civis para Eventos
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
            >
              <span className="w-4 text-center text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
