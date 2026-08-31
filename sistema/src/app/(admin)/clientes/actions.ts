"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { cnpjTemFormatoValido } from "@/lib/validation/documento";
import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";

export type CriarClienteState = { error: string | null };

export async function criarCliente(
  _prevState: CriarClienteState,
  formData: FormData
): Promise<CriarClienteState> {
  // Mesma defesa em profundidade das demais Server Actions
  // administrativas — ver requireStaff() em src/lib/auth/session.ts.
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error };

  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const contato = String(formData.get("contato") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nome) {
    return { error: "Preencha o nome do cliente." };
  }
  if (comecaComCaractereFormula(nome)) {
    return { error: "Nome do cliente não pode começar com =, +, - ou @." };
  }
  if (cnpj && !cnpjTemFormatoValido(cnpj)) {
    return { error: "CNPJ inválido." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("clientes").insert({
    nome,
    cnpj: cnpj || null,
    contato: contato || null,
    email: email || null,
    endereco: endereco || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um cliente cadastrado com esse nome." };
    }
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
