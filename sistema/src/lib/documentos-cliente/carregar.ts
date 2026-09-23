import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventoProgramacao } from "@/lib/types";
import type { DadosDocumento } from "./dados";

export type EventoParaDocumento = DadosDocumento["evento"] & { id: string };
export type LinhaProgramacao = Pick<EventoProgramacao, "id" | "data" | "hora_inicio" | "hora_fim" | "quantidade">;

export type ResultadoCarregarDocumento =
  | { ok: true; evento: EventoParaDocumento; programacao: LinhaProgramacao[]; dados: DadosDocumento }
  | { ok: false; motivo: "nao-encontrado" }
  | { ok: false; motivo: "erro"; mensagem: string };

/**
 * Busca tudo que os documentos usam, num formato só — a tela do evento
 * (pra mostrar pendências e a programação) e a rota do PDF (pra gerar)
 * leem daqui, e por isso nunca discordam sobre "o que falta".
 *
 * Erro de consulta volta como erro, nunca como lista vazia: tratar
 * falha como "nada cadastrado" faria a tela dizer "Programação não
 * cadastrada" quando o problema real é outro (ex.: migração 0023 não
 * aplicada) — exatamente o tipo de mensagem enganosa que o
 * "Função inválida" já causou uma vez (tabela da 0021 faltando).
 */
export async function carregarDadosDocumento(
  supabase: SupabaseClient,
  eventoId: string
): Promise<ResultadoCarregarDocumento> {
  const [{ data: evento, error: eventoError }, { data: programacao, error: programacaoError }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, nome, local, quantitativo_bombeiros, valor_fechamento, clientes(nome, cnpj, endereco)")
      .eq("id", eventoId)
      .maybeSingle(),
    supabase
      .from("evento_programacao")
      .select("id, data, hora_inicio, hora_fim, quantidade")
      .eq("evento_id", eventoId)
      .order("data", { ascending: true })
      .order("hora_inicio", { ascending: true }),
  ]);
  if (eventoError) return { ok: false, motivo: "erro", mensagem: eventoError.message };
  if (!evento) return { ok: false, motivo: "nao-encontrado" };
  if (programacaoError) return { ok: false, motivo: "erro", mensagem: programacaoError.message };

  const cliente = evento.clientes as unknown as DadosDocumento["cliente"];
  const eventoDoc: EventoParaDocumento = {
    id: evento.id,
    nome: evento.nome,
    local: evento.local,
    quantitativo_bombeiros: Number(evento.quantitativo_bombeiros),
    valor_fechamento: Number(evento.valor_fechamento),
  };
  const linhas = (programacao ?? []) as LinhaProgramacao[];
  return {
    ok: true,
    evento: eventoDoc,
    programacao: linhas,
    dados: { evento: eventoDoc, cliente: cliente ?? null, programacao: linhas },
  };
}
