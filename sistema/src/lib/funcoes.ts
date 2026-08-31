import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FUNCOES as FUNCOES_PADRAO } from "./constants";

/**
 * Lista de funções configurável pelo staff (`funcoes_bombeiro`, migração
 * 0021) — substitui a lista fixa que existia em `src/lib/constants.ts`.
 * `FUNCOES_PADRAO` fica só como default do modo de demonstração (sem
 * Supabase configurado) e como fallback se a tabela ainda não tiver
 * sido populada por algum motivo.
 */
export async function buscarFuncoesAtivas(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("funcoes_bombeiro")
    .select("nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  const nomes = (data ?? []).map((f) => f.nome as string);
  return nomes.length > 0 ? nomes : [...FUNCOES_PADRAO];
}
