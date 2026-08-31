import type { Papel } from "@/lib/constants";

/**
 * Módulo puro (sem import de Next.js/Supabase) para que a regra de
 * quais rotas exigem sessão — e quais rotas cada papel pode acessar —
 * possa ser testada isoladamente do runtime do proxy (src/proxy.ts).
 */

/** Prefixos de rota que cada papel pode acessar. Staff cobre 4 áreas
 * administrativas, não só a home (/painel) — um bombeiro só cobre /portal. */
export const ROTAS_POR_PAPEL: Record<Papel, readonly string[]> = {
  staff: ["/painel", "/bombeiros", "/clientes", "/eventos", "/precos", "/financeiro", "/auditoria"],
  bombeiro: ["/portal"],
};

export const ROTAS_PROTEGIDAS = Object.values(ROTAS_POR_PAPEL).flat();

function combinaComPrefixo(pathname: string, prefixo: string): boolean {
  return pathname === prefixo || pathname.startsWith(`${prefixo}/`);
}

export function ehRotaProtegida(pathname: string): boolean {
  return ROTAS_PROTEGIDAS.some((prefixo) => combinaComPrefixo(pathname, prefixo));
}

/** A rota pedida pertence a alguma das áreas liberadas para esse papel? */
export function ehAreaDoPapel(papel: Papel, pathname: string): boolean {
  return ROTAS_POR_PAPEL[papel].some((prefixo) => combinaComPrefixo(pathname, prefixo));
}
