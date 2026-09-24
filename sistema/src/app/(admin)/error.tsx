"use client";

/**
 * Mesmo raciocínio de src/app/portal/error.tsx, só que pro admin —
 * achado real: um timeout do Supabase (src/lib/supabase/fetch-com-timeout.ts)
 * disparando numa ação do admin (ex.: "Escalar bombeiro") caía na tela
 * de erro genérica do Next.js, fora do visual do sistema, sem nenhuma
 * ação clara — só existia essa proteção pro Portal do bombeiro até
 * agora.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-[15px] font-semibold">Não foi possível carregar esta página</p>
      <p className="max-w-xs text-[13px]" style={{ color: "var(--text-soft)" }}>
        Pode ter sido uma falha temporária de conexão. Tente novamente — se continuar, faça login de novo.
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn btn--primary" onClick={() => reset()}>
          Tentar novamente
        </button>
        <a href="/login" className="btn">
          Fazer login novamente
        </a>
      </div>
    </div>
  );
}
