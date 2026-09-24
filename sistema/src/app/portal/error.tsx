"use client";

/**
 * Sem isso, qualquer erro não tratado num Server Component do Portal
 * (ex.: o timeout de src/lib/supabase/fetch-com-timeout.ts disparando)
 * cai na tela de erro padrão do Next.js — genérica, fora do visual do
 * sistema e sem nenhuma ação clara pro bombeiro. Erros do tipo
 * "achou uma conexão travada" são exatamente o caso que esse timeout
 * existe pra transformar em algo recuperável em vez de uma tela presa.
 */
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
