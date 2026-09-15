"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/logout";
import { LogoBadge } from "./LogoBadge";

const NAV_ITEMS = [
  { href: "/painel", label: "Painel", icon: "◆" },
  { href: "/bombeiros", label: "Bombeiros", icon: "☰" },
  { href: "/clientes", label: "Clientes", icon: "◈" },
  { href: "/eventos", label: "Eventos & Escalas", icon: "▦" },
  { href: "/precos", label: "Preços", icon: "%" },
  { href: "/financeiro", label: "Financeiro", icon: "$" },
  { href: "/auditoria", label: "Auditoria", icon: "⌕" },
];

// Preferência de UI (não é dado do usuário) — localStorage é o lugar
// certo pra isso, sobrevive a reload mas não precisa ir pro banco nem
// ser sincronizado entre dispositivos.
const CHAVE_RECOLHIDA = "brigada:sidebar-recolhida";

export function Sidebar() {
  const pathname = usePathname();
  // Começa expandida (mesmo valor renderizado no servidor) — o estado
  // real só é lido depois de montar, em um efeito client-only, pra não
  // causar mismatch de hidratação (o servidor nunca tem acesso ao
  // localStorage do navegador).
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    // Sincroniza com localStorage (sistema externo) só uma vez ao montar,
    // pra ler a preferência sem arriscar mismatch de hidratação (o servidor
    // nunca vê o localStorage do navegador) — não é resposta a props/state,
    // é exatamente o caso que o próprio react.dev cita como legítimo pra
    // setState dentro de efeito.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === "1");
    } catch {
      // localStorage indisponível (navegação privada, etc.) — mantém expandida.
    }
  }, []);

  function alternar() {
    setRecolhida((atual) => {
      const proximo = !atual;
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, proximo ? "1" : "0");
      } catch {
        // idem — não é crítico, só não persiste entre sessões.
      }
      return proximo;
    });
  }

  return (
    <aside
      className={`sidebar flex min-h-screen shrink-0 flex-col p-4 transition-[width] duration-200 ease-out ${
        recolhida ? "w-[76px]" : "w-[236px]"
      }`}
    >
      <div
        className={`mb-1 flex items-center pb-2 pt-0.5 ${recolhida ? "flex-col gap-2" : "justify-between gap-2 px-1.5"}`}
      >
        <div className={`flex items-center gap-2.5 ${recolhida ? "" : "min-w-0"}`}>
          <LogoBadge size={38} />
          {!recolhida && (
            <div className="flex min-w-0 flex-col" style={{ fontFamily: "var(--font-display)" }}>
              <span className="text-[15px] tracking-wide" style={{ color: "var(--shell-text-soft)" }}>
                BRIGADA
              </span>
              <span className="text-[22px] leading-tight" style={{ color: "var(--accent)" }}>
                CAMARÃO
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={alternar}
          aria-expanded={!recolhida}
          aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
          title={recolhida ? "Expandir menu" : "Recolher menu"}
          className="flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors"
          style={{ borderColor: "var(--shell-line)", color: "var(--shell-text-soft)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: recolhida ? "rotate(180deg)" : "none", transition: "transform 200ms ease-out" }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {!recolhida && (
        <div
          className="mb-4 border-b px-1.5 pb-5 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ borderColor: "var(--shell-line)", color: "var(--shell-text-soft)" }}
        >
          Gestão de Bombeiros Civis para Eventos
        </div>
      )}

      <nav className={`flex flex-col gap-0.5 ${recolhida ? "mt-4" : ""}`}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={recolhida ? item.label : undefined}
              className={`nav-item ${active ? "active" : ""}`}
              style={recolhida ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
            >
              <span className="w-4 text-center text-sm">{item.icon}</span>
              {!recolhida && item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto pt-4">
        <button
          type="submit"
          title={recolhida ? "Sair" : undefined}
          className="nav-item w-full text-left"
          style={recolhida ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
        >
          <span className="w-4 text-center text-sm">↩</span>
          {!recolhida && "Sair"}
        </button>
      </form>
    </aside>
  );
}
