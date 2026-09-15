/**
 * Estado de carregamento padrão entre navegações — usado pelos
 * `loading.tsx` de cada área (ver src/app/(admin)/loading.tsx e
 * src/app/portal/loading.tsx). O App Router do Next.js mostra esse
 * componente automaticamente enquanto o Server Component da página de
 * destino busca dados, sem precisar de estado manual em cada tela —
 * cobre o delay perceptível na troca de menu com um retorno visual
 * imediato em vez de tela em branco/travada.
 */
export function LoadingSpinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
        style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
        aria-hidden="true"
      />
      <p className="text-[12.5px] font-medium" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
    </div>
  );
}
