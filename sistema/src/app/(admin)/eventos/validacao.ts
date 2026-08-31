import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";

export interface DadosEventoValidados {
  nome: string;
  clienteId: string;
  local: string | null;
  dataInicio: string;
  dataFim: string;
  quantitativoBombeiros: number;
  materiais: string | null;
  valorFechamento: number;
}

export type ResultadoValidacaoEvento =
  | { error: string; dados?: undefined }
  | { error: null; dados: DadosEventoValidados };

/**
 * Validação dos campos de evento, compartilhada entre criarEvento
 * (eventos/actions.ts) e editarEvento (eventos/[id]/actions.ts) — só
 * extraída pra cá quando a segunda ação de fato precisou da mesma
 * checagem, não especulativamente.
 */
export function validarDadosEvento(formData: FormData): ResultadoValidacaoEvento {
  const nome = String(formData.get("nome") ?? "").trim();
  const clienteId = String(formData.get("cliente_id") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const dataInicio = String(formData.get("data_inicio") ?? "").trim();
  const dataFim = String(formData.get("data_fim") ?? "").trim();
  const quantitativoRaw = String(formData.get("quantitativo_bombeiros") ?? "").trim();
  const materiais = String(formData.get("materiais") ?? "").trim();
  const valorRaw = String(formData.get("valor_fechamento") ?? "").trim();

  if (!nome || !clienteId || !dataInicio || !dataFim) {
    return { error: "Preencha nome, cliente, data de início e data de fim." };
  }
  if (comecaComCaractereFormula(nome)) {
    return { error: "Nome do evento não pode começar com =, +, - ou @." };
  }
  if (dataFim < dataInicio) {
    return { error: "A data de fim não pode ser anterior à data de início." };
  }

  const quantitativoBombeiros = Number(quantitativoRaw);
  if (!Number.isInteger(quantitativoBombeiros) || quantitativoBombeiros < 0) {
    return { error: "Quantitativo de bombeiros inválido." };
  }

  const valorFechamento = valorRaw ? Number(valorRaw) : 0;
  if (!Number.isFinite(valorFechamento) || valorFechamento < 0) {
    return { error: "Valor de fechamento inválido." };
  }

  return {
    error: null,
    dados: {
      nome,
      clienteId,
      local: local || null,
      dataInicio,
      dataFim,
      quantitativoBombeiros,
      materiais: materiais || null,
      valorFechamento,
    },
  };
}
