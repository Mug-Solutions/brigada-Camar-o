"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";

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
