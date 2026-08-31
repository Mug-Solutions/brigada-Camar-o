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

export async function criarFuncao(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) redirect("/bombeiros/funcoes?erro=1");
  if (nome.length > 80) redirect("/bombeiros/funcoes?erro=1");
  if (comecaComCaractereFormula(nome)) redirect("/bombeiros/funcoes?erro=1");

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("funcoes_bombeiro").insert({ nome });

  if (error) {
    redirect(error.code === "23505" ? "/bombeiros/funcoes?erro=duplicada" : "/bombeiros/funcoes?erro=1");
  }

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "funcoes_bombeiro",
    registroId: null,
    acao: "criar",
    valorDepois: { nome },
  });

  revalidatePath("/bombeiros/funcoes");
}

/** Desativar só tira a função da lista oferecida pra bombeiro novo —
 * nunca apaga a linha (é referenciada por bombeiros.funcao via FK,
 * migração 0021) nem afeta quem já tem essa função hoje. */
export async function alternarFuncaoAtiva(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const ativo = formData.get("ativo") === "on";
  if (!nome) redirect("/bombeiros/funcoes?erro=1");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("funcoes_bombeiro")
    .update({ ativo })
    .eq("nome", nome)
    .select("nome")
    .maybeSingle();
  if (error || !data) redirect("/bombeiros/funcoes?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "funcoes_bombeiro",
    registroId: null,
    acao: "editar",
    valorDepois: { nome, ativo },
  });

  revalidatePath("/bombeiros/funcoes");
}
