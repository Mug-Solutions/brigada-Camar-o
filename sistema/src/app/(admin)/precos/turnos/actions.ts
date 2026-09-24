"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff, getSessionUsuario } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria";
import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";

async function usuarioIdDaSessao(): Promise<string | undefined> {
  const sessao = await getSessionUsuario();
  return sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;
}

// Revalida toda tela que oferece o <select> de turno pra escolher —
// sem isso, um turno novo/desativado só apareceria depois de um
// hard refresh nessas telas (mesmo achado real já corrigido antes
// nesta área do sistema pro Portal/admin ficarem sincronizados).
function revalidarTelasComTurno(): void {
  revalidatePath("/precos/turnos");
  revalidatePath("/eventos/[id]", "page");
  revalidatePath("/portal/meus-dados");
}

function validarValor(valorRaw: string): number | null {
  const valor = Number(valorRaw);
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

export async function criarTurno(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const horaInicio = String(formData.get("hora_inicio") ?? "").trim();
  const horaFim = String(formData.get("hora_fim") ?? "").trim();
  const valor = validarValor(String(formData.get("valor") ?? "").trim());

  if (!nome || nome.length > 80) redirect("/precos/turnos?erro=1");
  if (comecaComCaractereFormula(nome)) redirect("/precos/turnos?erro=1");
  if (!horaInicio || !horaFim) redirect("/precos/turnos?erro=1");
  if (horaInicio === horaFim) redirect("/precos/turnos?erro=horario-igual");
  if (valor === null) redirect("/precos/turnos?erro=1");

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("turnos_config").insert({
    nome,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    valor,
  });

  if (error) {
    redirect(error.code === "23505" ? "/precos/turnos?erro=duplicada" : "/precos/turnos?erro=1");
  }

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "turnos_config",
    registroId: null,
    acao: "criar",
    valorDepois: { nome, hora_inicio: horaInicio, hora_fim: horaFim, valor },
  });

  revalidarTelasComTurno();
}

/** Horário e valor são seguros de editar a qualquer momento — não
 * afetam escalas já registradas (cada escala guarda o próprio `valor`
 * no momento em que foi criada, não referencia turnos_config ao vivo).
 * O nome não é editável aqui de propósito: é a chave estrangeira
 * referenciada por escalas/disponibilidades (mesmo raciocínio de
 * funcoes_bombeiro — renomear reescreveria o rótulo de registros
 * históricos). */
export async function atualizarTurno(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const horaInicio = String(formData.get("hora_inicio") ?? "").trim();
  const horaFim = String(formData.get("hora_fim") ?? "").trim();
  const valor = validarValor(String(formData.get("valor") ?? "").trim());

  if (!nome || !horaInicio || !horaFim) redirect("/precos/turnos?erro=1");
  if (horaInicio === horaFim) redirect("/precos/turnos?erro=horario-igual");
  if (valor === null) redirect("/precos/turnos?erro=1");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("turnos_config")
    .update({ hora_inicio: horaInicio, hora_fim: horaFim, valor })
    .eq("nome", nome)
    .select("nome")
    .maybeSingle();
  if (error || !data) redirect("/precos/turnos?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "turnos_config",
    registroId: null,
    acao: "editar",
    valorDepois: { nome, hora_inicio: horaInicio, hora_fim: horaFim, valor },
  });

  revalidarTelasComTurno();
}

/** Desativar só tira o turno da lista oferecida pra escalar/cadastrar
 * disponibilidade nova — nunca apaga a linha nem afeta quem já usou
 * esse turno. */
export async function alternarTurnoAtivo(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const ativo = formData.get("ativo") === "on";
  if (!nome) redirect("/precos/turnos?erro=1");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("turnos_config")
    .update({ ativo })
    .eq("nome", nome)
    .select("nome")
    .maybeSingle();
  if (error || !data) redirect("/precos/turnos?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "turnos_config",
    registroId: null,
    acao: "editar",
    valorDepois: { nome, ativo },
  });

  revalidarTelasComTurno();
}

/** Exclusão de verdade (DELETE), diferente de "desativar" — só
 * permitida se o turno nunca foi usado em nenhuma escala/disponibilidade.
 * Turno em uso: desativa em vez de excluir (a FK bloquearia o DELETE
 * de qualquer forma, mas a checagem prévia dá uma mensagem amigável
 * em vez do erro bruto do Postgres). */
export async function excluirTurno(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) redirect("/precos/turnos?erro=1");

  const supabase = createServerSupabaseClient();

  const [{ count: countEscalas }, { count: countDisponibilidades }] = await Promise.all([
    supabase.from("escalas").select("id", { count: "exact", head: true }).eq("turno", nome),
    supabase.from("disponibilidades").select("id", { count: "exact", head: true }).eq("turno", nome),
  ]);
  if ((countEscalas ?? 0) > 0 || (countDisponibilidades ?? 0) > 0) {
    redirect("/precos/turnos?erro=em-uso");
  }

  const { error } = await supabase.from("turnos_config").delete().eq("nome", nome);
  if (error) redirect("/precos/turnos?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "turnos_config",
    registroId: null,
    acao: "excluir",
    valorAntes: { nome },
  });

  revalidarTelasComTurno();
}
