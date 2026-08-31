import type { LinhaFinanceiro } from "./FinanceiroTabela";

export type EventoFinanceiroRow = {
  id: string;
  nome: string;
  data_inicio: string;
  valor_fechamento: number;
  custo_estimado: number | null;
  clientes: { nome: string } | null;
  eventos_financeiro: {
    pago_bombeiros_status: "Pendente" | "Pago" | "Atrasado";
    recebido_cliente_status: "Pendente" | "Recebido" | "Atrasado";
  } | null;
};

/** Custo real (ajustado pelo staff em /eventos, já considerado o
 * valor final por completo) ou, na ausência dele, soma dos titulares
 * escalados + alimentação (diárias × valor configurado em /precos) —
 * achado real comparando com a planilha financeira que a Brigada
 * Camarão já usa: custo total = pago aos bombeiros + alimentação, não
 * só o pagamento. `precoAlimentacao` vem de precos_config (chave
 * `alimentacao_dia`), buscado pela página que chama esta função. */
export function calcularLinhasFinanceiro(
  eventos: EventoFinanceiroRow[],
  escalas: { evento_id: string; valor: number }[],
  precoAlimentacao: number
): LinhaFinanceiro[] {
  const somaTitularesPorEvento = new Map<string, number>();
  const qtdDiariasPorEvento = new Map<string, number>();
  for (const esc of escalas) {
    somaTitularesPorEvento.set(esc.evento_id, (somaTitularesPorEvento.get(esc.evento_id) ?? 0) + Number(esc.valor));
    qtdDiariasPorEvento.set(esc.evento_id, (qtdDiariasPorEvento.get(esc.evento_id) ?? 0) + 1);
  }

  return eventos.map((e) => {
    const custoEstimado = e.custo_estimado === null;
    const custoAutomatico =
      (somaTitularesPorEvento.get(e.id) ?? 0) + (qtdDiariasPorEvento.get(e.id) ?? 0) * precoAlimentacao;
    const custo = e.custo_estimado ?? custoAutomatico;
    return {
      eventoId: e.id,
      nome: e.nome,
      cliente: e.clientes?.nome ?? "—",
      dataInicio: e.data_inicio,
      receita: Number(e.valor_fechamento),
      custo,
      custoEstimado,
      statusPagamento: e.eventos_financeiro?.pago_bombeiros_status ?? "Pendente",
      statusRecebimento: e.eventos_financeiro?.recebido_cliente_status ?? "Pendente",
    };
  });
}
