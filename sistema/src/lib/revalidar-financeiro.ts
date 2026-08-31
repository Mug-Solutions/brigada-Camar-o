import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Toda tela que soma/mostra dinheiro ou contagem derivada de
 * eventos/escalas — chamar depois de qualquer escrita que altere
 * status, valor_fechamento, custo ou escalas de um evento.
 *
 * Achado real testando: marcar um evento como Concluído atualizava
 * `/eventos` (a única tela revalidada por transicionarStatus) mas o
 * Painel continuava mostrando os números de antes — Faturamento,
 * Lucro e a contagem de "Eventos Confirmados" ficaram presos na
 * versão anterior até alguém mexer no Painel por outro caminho.
 * Nenhuma das telas que dependem desse mesmo dado (Painel, Financeiro,
 * DRE) era revalidada — só a tela de onde a ação foi disparada.
 */
export function revalidarTelasFinanceiras(): void {
  revalidatePath("/painel");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/dre");
}
