import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ALIMENTACAO_DIA, CHAVE_PRECO_ALIMENTACAO } from "./constants";

/** Usado por /eventos (pré-preencher custo do evento) e /financeiro
 * (calcular custo/lucro) — mesma régua configurável em /precos, uma
 * consulta só, sem duplicar em cada página. Cai no default do modo de
 * demonstração se a linha ainda não existir (ex.: migração 0008 não
 * aplicada). */
export async function buscarPrecoAlimentacao(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("precos_config")
    .select("valor")
    .eq("chave", CHAVE_PRECO_ALIMENTACAO)
    .maybeSingle();
  return data ? Number(data.valor) : ALIMENTACAO_DIA;
}
