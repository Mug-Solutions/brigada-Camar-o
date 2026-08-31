"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUsuario } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";
import { DIAS_SEMANA, TURNOS, type DiaSemana, type Turno } from "@/lib/constants";

const MAXIMO_DISPONIBILIDADES = 50;
const TAMANHO_MAXIMO_REGIAO = 80;

async function bombeiroIdDaSessaoOuRedireciona(): Promise<string> {
  const sessao = await getSessionUsuario();
  if (!sessao.configured || !sessao.loggedIn) redirect("/login");
  const bombeiroId = sessao.usuario?.bombeiro_id;
  if (!bombeiroId) redirect("/login");
  return bombeiroId;
}

/** Fase 7 do roadmap: "registro de disponibilidade do bombeiro". Mesmo
 * padrão de solicitarAtualizacaoDocumento — bombeiro_id vem da sessão,
 * nunca de um campo de formulário. */
export async function adicionarDisponibilidade(formData: FormData): Promise<void> {
  const bombeiroId = await bombeiroIdDaSessaoOuRedireciona();

  const diaSemana = String(formData.get("dia_semana") ?? "");
  const turno = String(formData.get("turno") ?? "");
  const regiao = String(formData.get("regiao") ?? "").trim();

  if (!DIAS_SEMANA.includes(diaSemana as DiaSemana)) redirect("/portal/meus-dados?erro=1");
  if (!Object.keys(TURNOS).includes(turno)) redirect("/portal/meus-dados?erro=1");
  if (regiao.length > TAMANHO_MAXIMO_REGIAO) redirect("/portal/meus-dados?erro=1");
  if (regiao && comecaComCaractereFormula(regiao)) redirect("/portal/meus-dados?erro=1");

  const supabase = createServerSupabaseClient();

  // Teto de linhas por bombeiro — achado de revisão de segurança: sem
  // isso, chamar esta action repetidamente (mesmo com valores
  // diferentes, então sem esbarrar no índice único de duplicata)
  // acumularia disponibilidades sem limite nenhum.
  const { count } = await supabase
    .from("disponibilidades")
    .select("id", { count: "exact", head: true })
    .eq("bombeiro_id", bombeiroId);
  if ((count ?? 0) >= MAXIMO_DISPONIBILIDADES) {
    redirect("/portal/meus-dados?erro=limite");
  }

  const { error } = await supabase.from("disponibilidades").insert({
    bombeiro_id: bombeiroId,
    dia_semana: diaSemana,
    turno: turno as Turno,
    regiao: regiao || null,
  });

  if (error) {
    // 23505 = já existe essa combinação exata (índice único da
    // migração 0015) — não é erro de verdade, só um lembrete amigável.
    redirect(error.code === "23505" ? "/portal/meus-dados?erro=duplicada" : "/portal/meus-dados?erro=1");
  }

  revalidatePath("/portal/meus-dados");
}

export async function removerDisponibilidade(formData: FormData): Promise<void> {
  const bombeiroId = await bombeiroIdDaSessaoOuRedireciona();

  const disponibilidadeId = String(formData.get("disponibilidade_id") ?? "");
  if (!disponibilidadeId) redirect("/portal/meus-dados?erro=1");

  const supabase = createServerSupabaseClient();
  // Escopado também a bombeiro_id (não só o id) — mesma disciplina de
  // "nunca confiar num id sozinho" usada em toda Server Action de
  // portal (ver marcarNotificacaoLida).
  await supabase.from("disponibilidades").delete().eq("id", disponibilidadeId).eq("bombeiro_id", bombeiroId);

  revalidatePath("/portal/meus-dados");
}
