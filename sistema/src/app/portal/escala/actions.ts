"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUsuario } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bombeiroAptidao } from "@/lib/domain";
import { registrarAuditoria } from "@/lib/auditoria";
import type { Bombeiro } from "@/lib/types";

async function bombeiroIdDaSessaoOuRedireciona(): Promise<string> {
  const sessao = await getSessionUsuario();
  if (!sessao.configured || !sessao.loggedIn) redirect("/login");
  const bombeiroId = sessao.usuario?.bombeiro_id;
  if (!bombeiroId) redirect("/login");
  return bombeiroId;
}

/**
 * Fase 7 do roadmap: "bombeiro visualiza e se candidata a eventos em
 * aberto". Candidatura é só manifestação de interesse — quem vira
 * escala de fato (data/turno) é decidido pelo staff depois, pela tela
 * já existente de "Escalar bombeiro" em /eventos/[id]. evento_id vem
 * do formulário mas é revalidado no servidor (existe, está Confirmado
 * e realmente tem vaga aberta) — nunca confiado sozinho, mesmo padrão
 * de adicionarEscala em eventos/[id]/actions.ts.
 */
export async function candidatarEvento(formData: FormData): Promise<void> {
  const bombeiroId = await bombeiroIdDaSessaoOuRedireciona();

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  if (!eventoId) redirect("/portal/escala?erro=1");

  const supabase = createServerSupabaseClient();

  const { data: bombeiro, error: bombeiroError } = await supabase
    .from("bombeiros")
    .select("*")
    .eq("id", bombeiroId)
    .maybeSingle();
  if (bombeiroError || !bombeiro) redirect("/portal/escala?erro=1");
  if (bombeiroAptidao(bombeiro as Bombeiro).level === "crit") {
    redirect("/portal/escala?erro=inapto");
  }

  const { data: evento, error: eventoError } = await supabase
    .from("eventos")
    .select("id, status, quantitativo_bombeiros")
    .eq("id", eventoId)
    .eq("status", "Confirmado")
    .maybeSingle();
  if (eventoError || !evento) redirect("/portal/escala?erro=1");

  const { count: titulares } = await supabase
    .from("escalas")
    .select("id", { count: "exact", head: true })
    .eq("evento_id", eventoId)
    .eq("tipo", "titular");
  if ((titulares ?? 0) >= evento.quantitativo_bombeiros) {
    redirect("/portal/escala?erro=sem-vaga");
  }

  const { error } = await supabase.from("candidaturas").insert({
    evento_id: eventoId,
    bombeiro_id: bombeiroId,
  });

  if (error) {
    // 23505 = já se candidatou a esse evento (índice único da migração 0016).
    redirect(error.code === "23505" ? "/portal/escala?erro=duplicada" : "/portal/escala?erro=1");
  }

  revalidatePath("/portal/escala");
}

/**
 * Item essencial do PRD: "confirmação de escala pelo bombeiro via
 * WhatsApp/app" — a parte "app" (sem depender do provedor de WhatsApp,
 * ainda não escolhido pelo cliente). Bombeiro confirma presença numa
 * escala futura já montada pelo staff; escala_id vem do formulário mas
 * o update é sempre escopado também a bombeiro_id da sessão — nunca
 * confia que o id sozinho pertence a quem está confirmando.
 */
export async function confirmarEscala(formData: FormData): Promise<void> {
  const bombeiroId = await bombeiroIdDaSessaoOuRedireciona();

  const escalaId = String(formData.get("escala_id") ?? "").trim();
  if (!escalaId) redirect("/portal/escala?erro=1");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("escalas")
    .update({ status_confirmacao: "confirmado" })
    .eq("id", escalaId)
    .eq("bombeiro_id", bombeiroId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect("/portal/escala?erro=1");

  const sessao = await getSessionUsuario();
  await registrarAuditoria({
    supabase,
    usuarioId: sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined,
    tabela: "escalas",
    registroId: escalaId,
    acao: "editar",
    valorDepois: { status_confirmacao: "confirmado" },
  });

  revalidatePath("/portal/escala");
}
