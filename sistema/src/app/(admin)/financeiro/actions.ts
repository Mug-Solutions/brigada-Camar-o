"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff, getSessionUsuario } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria";

const STATUS_PAGAMENTO = ["Pendente", "Pago", "Atrasado"] as const;
const STATUS_RECEBIMENTO = ["Pendente", "Recebido", "Atrasado"] as const;

async function guardStaffOuRedireciona() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");
}

async function usuarioIdDaSessao(): Promise<string | undefined> {
  const sessao = await getSessionUsuario();
  return sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;
}

/**
 * `eventos_financeiro` não ganha uma linha automaticamente quando um
 * evento é criado — a primeira mudança de status aqui faz upsert,
 * criando a linha na hora se ainda não existir (chave primária é o
 * próprio evento_id).
 */
export async function atualizarStatusPagamentoBombeiros(formData: FormData): Promise<void> {
  await guardStaffOuRedireciona();

  const eventoId = String(formData.get("evento_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!eventoId || !STATUS_PAGAMENTO.includes(status as (typeof STATUS_PAGAMENTO)[number])) {
    redirect("/financeiro?erro=1");
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("eventos_financeiro").upsert({
    evento_id: eventoId,
    pago_bombeiros_status: status,
    pago_bombeiros_data: status === "Pago" ? new Date().toISOString().slice(0, 10) : null,
  });

  if (error) redirect("/financeiro?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "eventos_financeiro",
    registroId: eventoId,
    acao: "editar",
    valorDepois: { pago_bombeiros_status: status },
  });

  // /painel também depende disso — a seção "Alertas pendentes" lê
  // pago_bombeiros_status/recebido_cliente_status pra sinalizar
  // pagamento/recebimento atrasado (achado real: mudança de status
  // fica presa em /financeiro, Painel só atualiza o alerta depois).
  revalidatePath("/financeiro");
  revalidatePath("/painel");
}

export async function atualizarStatusRecebimentoCliente(formData: FormData): Promise<void> {
  await guardStaffOuRedireciona();

  const eventoId = String(formData.get("evento_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!eventoId || !STATUS_RECEBIMENTO.includes(status as (typeof STATUS_RECEBIMENTO)[number])) {
    redirect("/financeiro?erro=1");
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("eventos_financeiro").upsert({
    evento_id: eventoId,
    recebido_cliente_status: status,
    recebido_cliente_data: status === "Recebido" ? new Date().toISOString().slice(0, 10) : null,
  });

  if (error) redirect("/financeiro?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "eventos_financeiro",
    registroId: eventoId,
    acao: "editar",
    valorDepois: { recebido_cliente_status: status },
  });

  // /painel também depende disso — a seção "Alertas pendentes" lê
  // pago_bombeiros_status/recebido_cliente_status pra sinalizar
  // pagamento/recebimento atrasado (achado real: mudança de status
  // fica presa em /financeiro, Painel só atualiza o alerta depois).
  revalidatePath("/financeiro");
  revalidatePath("/painel");
}
