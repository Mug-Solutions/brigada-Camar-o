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

export interface GrupoFinanceiro {
  chave: string;
  label: string;
  eventos: number;
  receita: number;
  custo: number;
}

/** `chave` precisa ser ordenável como string (ISO-like: "2026-08",
 * "2026-Q3", "2026") — `label` é só o texto exibido. Bug real
 * corrigido aqui: agrupar direto por "Ago/2026" e ordenar como string
 * dava ordem alfabética ("Abr" antes de "Ago" antes de "Dez"...), não
 * cronológica. Compartilhado entre /financeiro/dre e /painel (gráficos
 * de faturamento/lucro por mês) — mesmo cálculo, sem duplicar.
 */
export function agruparFinanceiro(
  linhas: LinhaFinanceiro[],
  chaveDe: (l: LinhaFinanceiro) => { chave: string; label: string }
): GrupoFinanceiro[] {
  const grupos = new Map<string, GrupoFinanceiro>();
  for (const l of linhas) {
    const { chave, label } = chaveDe(l);
    const atual = grupos.get(chave) ?? { chave, label, eventos: 0, receita: 0, custo: 0 };
    atual.eventos += 1;
    atual.receita += l.receita;
    atual.custo += l.custo;
    grupos.set(chave, atual);
  }
  return Array.from(grupos.values()).sort((a, b) => (a.chave < b.chave ? 1 : a.chave > b.chave ? -1 : 0));
}

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function chaveMes(dataIso: string): { chave: string; label: string } {
  const [anoStr, mesStr] = dataIso.split("-");
  return { chave: `${anoStr}-${mesStr}`, label: `${NOMES_MES[Number(mesStr) - 1]}/${anoStr}` };
}

export function chaveTrimestre(dataIso: string): { chave: string; label: string } {
  const [anoStr, mesStr] = dataIso.split("-");
  const trimestre = Math.ceil(Number(mesStr) / 3);
  return { chave: `${anoStr}-Q${trimestre}`, label: `T${trimestre}/${anoStr}` };
}

export function chaveAno(dataIso: string): { chave: string; label: string } {
  const anoStr = dataIso.split("-")[0];
  return { chave: anoStr, label: anoStr };
}
