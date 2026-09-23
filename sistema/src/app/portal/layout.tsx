import type { ReactNode } from "react";
import { PortalNav } from "@/components/PortalNav";
import { RegisterSW } from "@/components/RegisterSW";
import { LogoBadge } from "@/components/LogoBadge";
import { TemaToggle } from "@/components/TemaToggle";
import { signOut } from "@/lib/auth/logout";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col" style={{ background: "var(--bg)" }}>
      <RegisterSW />
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3"
        style={{ background: "var(--shell-bg)", borderColor: "var(--shell-line)" }}
      >
        <div className="flex items-center gap-2">
          <LogoBadge size={26} />
          <div style={{ fontFamily: "var(--font-display)" }}>
            <span className="text-[11px] tracking-wide" style={{ color: "var(--shell-text-soft)" }}>
              BRIGADA
            </span>
            <span className="ml-1.5 text-[15px]" style={{ color: "var(--accent)" }}>
              CAMARÃO
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TemaToggle compacto />
          <form action={signOut}>
            <button type="submit" className="text-[11px] font-semibold" style={{ color: "var(--shell-text-soft)" }}>
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-5 pb-24">{children}</main>
      <PortalNav />
    </div>
  );
}
