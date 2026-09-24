"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff, getSessionUsuario } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria";

/**
 * Check por turno na folha de pagamento (/financeiro/[id]) — pedido do
 * cliente. Cada linha da folha já é uma escala (titular), então o
 * check marca `escalas.pago` daquela linha específica, não um bombeiro
 * agregado (o mesmo bombeiro pode ter mais de uma escala no evento,
 * cada uma paga/marcada independente).
 *
 * Depois de marcar/desmarcar, recalcula se TODO titular do evento está
 * pago e ajusta `eventos_financeiro.pago_bombeiros_status` sozinho:
 * vira 'Pago' quando o último check completa; volta pra 'Pendente' se
 * alguém desmarcar depois de já estar 'Pago' (a alegação de "todos
 * pagos" deixou de ser verdade). Não mexe num status 'Atrasado' já
 * definido manualmente em /financeiro, exceto pra promovê-lo a 'Pago'
 * quando os checks realmente completam — esse é um sinal mais
 * específico que o dropdown genérico.
 */
export async function marcarEscalaPaga(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const escalaId = String(formData.get("escala_id") ?? "").trim();
  const eventoId = String(formData.get("evento_id") ?? "").trim();
  // Checkbox desmarcado não manda o campo no FormData — ausência
  // significa "false", não "campo faltando por engano" (diferente de
  // escala_id/evento_id, que são hidden inputs sempre presentes).
  const pago = formData.get("pago") === "on";
  if (!escalaId || !eventoId) redirect(`/financeiro/${eventoId}?erro=1`);

  const supabase = createServerSupabaseClient();

  // Escopado a evento_id (não só o id da escala) — mesma disciplina já
  // usada em removerEscala/registrarPonto.
  const { data: escalaAtualizada, error } = await supabase
    .from("escalas")
    .update({ pago })
    .eq("id", escalaId)
    .eq("evento_id", eventoId)
    .eq("tipo", "titular")
    .select("id")
    .maybeSingle();
  if (error || !escalaAtualizada) redirect(`/financeiro/${eventoId}?erro=1`);

  const sessao = await getSessionUsuario();
  const usuarioId = sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;

  await registrarAuditoria({
    supabase,
    usuarioId,
    tabela: "escalas",
    registroId: escalaId,
    acao: "editar",
    valorDepois: { pago },
  });

  // Recalcula e escreve o status atomicamente dentro da function (ver
  // migração 0020) — não em vários round-trips separados aqui em JS,
  // que tinha um TOCTOU real contra uma mudança manual concorrente de
  // status em /financeiro (achado de revisão de segurança).
  const { data: novoStatus, error: statusError } = await supabase.rpc("recalcular_status_pagamento_evento", {
    p_evento_id: eventoId,
  });
  if (statusError) redirect(`/financeiro/${eventoId}?erro=1`);

  if (novoStatus) {
    await registrarAuditoria({
      supabase,
      usuarioId,
      tabela: "eventos_financeiro",
      registroId: eventoId,
      acao: "editar",
      valorDepois: { pago_bombeiros_status: novoStatus, origem: "checkbox_folha_pagamento" },
    });
  }

  revalidatePath(`/financeiro/${eventoId}`);
  revalidatePath(`/financeiro/${eventoId}/pix`);
  revalidatePath("/financeiro");
  revalidatePath("/painel");
}
