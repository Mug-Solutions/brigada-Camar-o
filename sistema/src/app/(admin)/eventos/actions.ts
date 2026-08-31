"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff, getSessionUsuario } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria";
import { revalidarTelasFinanceiras } from "@/lib/revalidar-financeiro";
import { validarDadosEvento } from "./validacao";

export type CriarEventoState = { error: string | null };

async function usuarioIdDaSessao(): Promise<string | undefined> {
  const sessao = await getSessionUsuario();
  return sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;
}

export async function criarEvento(
  _prevState: CriarEventoState,
  formData: FormData
): Promise<CriarEventoState> {
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error };

  const validado = validarDadosEvento(formData);
  if (validado.error !== null) return { error: validado.error };
  const { dados } = validado;

  const supabase = createServerSupabaseClient();
  const { data: evento, error } = await supabase
    .from("eventos")
    .insert({
      nome: dados.nome,
      cliente_id: dados.clienteId,
      local: dados.local,
      data_inicio: dados.dataInicio,
      data_fim: dados.dataFim,
      quantitativo_bombeiros: dados.quantitativoBombeiros,
      materiais: dados.materiais,
      valor_fechamento: dados.valorFechamento,
      status: "Planejamento",
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "eventos",
    registroId: evento.id,
    acao: "criar",
    valorDepois: { nome: dados.nome, cliente_id: dados.clienteId, valor_fechamento: dados.valorFechamento },
  });

  revalidatePath("/eventos");
  revalidarTelasFinanceiras();
  redirect("/eventos");
}

async function transicionarStatus(
  eventoId: string,
  statusAtual: "Planejamento" | "Confirmado",
  statusNovo: "Confirmado" | "Concluído"
): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  if (!eventoId) redirect("/eventos?erro=1");

  const supabase = createServerSupabaseClient();

  // Escopado ao status atual esperado (não só o id) — mesma disciplina
  // de concorrência já usada em aprovarSolicitacao/recusarSolicitacao
  // (src/app/(admin)/bombeiros/aprovacoes/actions.ts): evita que duas
  // pessoas clicando quase ao mesmo tempo pulem um estágio ou
  // reescrevam uma transição já feita por outra pessoa.
  const { data, error } = await supabase
    .from("eventos")
    .update({ status: statusNovo })
    .eq("id", eventoId)
    .eq("status", statusAtual)
    .select("id")
    .maybeSingle();

  if (error || !data) redirect("/eventos?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "eventos",
    registroId: eventoId,
    acao: "editar",
    valorAntes: { status: statusAtual },
    valorDepois: { status: statusNovo },
  });

  revalidatePath("/eventos");
  revalidarTelasFinanceiras();
}

/** "Fluxo de aprovação de orçamento" do roadmap: o valor de fechamento
 * proposto em Planejamento passa a valer de fato quando o evento é
 * confirmado — esta é a ação que representa essa aprovação. */
export async function aprovarOrcamentoEvento(formData: FormData): Promise<void> {
  const eventoId = String(formData.get("evento_id") ?? "");
  await transicionarStatus(eventoId, "Planejamento", "Confirmado");
}

export async function concluirEvento(formData: FormData): Promise<void> {
  const eventoId = String(formData.get("evento_id") ?? "");
  await transicionarStatus(eventoId, "Confirmado", "Concluído");
}

/** Custo do evento é um valor que o staff ajusta manualmente — a tela
 * pré-preenche o campo com a soma calculada das escalas (o que é pago
 * aos bombeiros), mas materiais tem custo variável não rastreado
 * numericamente, então precisa de ajuste humano antes de salvar. */
export async function atualizarCustoEvento(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  const custoRaw = String(formData.get("custo_estimado") ?? "").trim();
  if (!eventoId || !custoRaw) redirect("/eventos?erro=1");

  const custo = Number(custoRaw);
  if (!Number.isFinite(custo) || custo < 0) redirect("/eventos?erro=1");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("eventos")
    .update({ custo_estimado: custo })
    .eq("id", eventoId)
    .select("id")
    .maybeSingle();

  if (error || !data) redirect("/eventos?erro=1");

  revalidatePath("/eventos");
  revalidarTelasFinanceiras();
}
