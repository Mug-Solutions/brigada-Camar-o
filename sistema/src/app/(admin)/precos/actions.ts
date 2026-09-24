"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff, getSessionUsuario } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria";
import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";
import { CHAVE_PRECO_ALIMENTACAO } from "@/lib/constants";

const TAMANHO_MAXIMO_DESCRICAO = 140;

async function usuarioIdDaSessao(): Promise<string | undefined> {
  const sessao = await getSessionUsuario();
  return sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;
}

export async function atualizarPreco(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const chave = String(formData.get("chave") ?? "").trim();
  const valorRaw = String(formData.get("valor") ?? "").trim();
  if (!chave) redirect("/precos?erro=1");

  // Number("") é 0, não NaN — checagem explícita pra não zerar um
  // preço silenciosamente se o campo for limpo e enviado em branco.
  if (!valorRaw) redirect("/precos?erro=1");
  const valor = Number(valorRaw);
  if (!Number.isFinite(valor) || valor < 0) redirect("/precos?erro=1");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("precos_config")
    .update({ valor, updated_at: new Date().toISOString() })
    .eq("chave", chave)
    .select("chave")
    .maybeSingle();

  if (error || !data) redirect("/precos?erro=1");

  revalidatePath("/precos");
}

export async function atualizarDescricaoPreco(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const chave = String(formData.get("chave") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!chave || !descricao || descricao.length > TAMANHO_MAXIMO_DESCRICAO) redirect("/precos?erro=1");
  if (comecaComCaractereFormula(descricao)) redirect("/precos?erro=1");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("precos_config")
    .update({ descricao, updated_at: new Date().toISOString() })
    .eq("chave", chave)
    .select("chave")
    .maybeSingle();

  if (error || !data) redirect("/precos?erro=1");

  revalidatePath("/precos");
}

function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/** Cria um novo "tipo de gasto" — pedido do cliente: a régua de preços
 * até agora só tinha 4 linhas fixas (3 turnos, já migrados pra
 * turnos_config, + alimentação). O usuário só digita a descrição; a
 * `chave` (identificador técnico interno, nunca exibido) é derivada
 * dela aqui — evita pedir pro staff inventar um identificador de
 * banco de dados. */
export async function criarPreco(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorRaw = String(formData.get("valor") ?? "").trim();
  if (!descricao || descricao.length > TAMANHO_MAXIMO_DESCRICAO) redirect("/precos?erro=1");
  if (comecaComCaractereFormula(descricao)) redirect("/precos?erro=1");
  if (!valorRaw) redirect("/precos?erro=1");
  const valor = Number(valorRaw);
  if (!Number.isFinite(valor) || valor < 0) redirect("/precos?erro=1");

  const supabase = createServerSupabaseClient();

  const base = slugificar(descricao) || "gasto";
  const { data: existente } = await supabase.from("precos_config").select("chave").eq("chave", base).maybeSingle();
  const chave = existente ? `${base}_${Date.now().toString(36).slice(-4)}` : base;

  const { error } = await supabase.from("precos_config").insert({ chave, valor, descricao });
  if (error) redirect("/precos?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "precos_config",
    registroId: null,
    acao: "criar",
    valorDepois: { chave, descricao, valor },
  });

  revalidatePath("/precos");
}

/** Exclui um "tipo de gasto" — nada mais referencia precos_config por
 * FK, então a exclusão é sempre segura no banco. Único bloqueio:
 * `alimentacao_dia`, lida por chave literal em src/lib/precos.ts
 * (usada em /eventos e /financeiro pro cálculo de custo) — excluir
 * essa linha específica silenciosamente voltaria a alimentação pro
 * valor padrão do modo demonstração, sem nenhum aviso. */
export async function excluirPreco(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const chave = String(formData.get("chave") ?? "").trim();
  if (!chave) redirect("/precos?erro=1");
  if (chave === CHAVE_PRECO_ALIMENTACAO) redirect("/precos?erro=protegido");

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("precos_config").delete().eq("chave", chave);
  if (error) redirect("/precos?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: await usuarioIdDaSessao(),
    tabela: "precos_config",
    registroId: null,
    acao: "excluir",
    valorAntes: { chave },
  });

  revalidatePath("/precos");
}
