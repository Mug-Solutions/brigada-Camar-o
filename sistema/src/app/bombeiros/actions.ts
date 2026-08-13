"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FUNCOES, type Funcao } from "@/lib/constants";

export type CriarBombeiroState = { error: string | null };

export async function criarBombeiro(
  _prevState: CriarBombeiroState,
  formData: FormData
): Promise<CriarBombeiroState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const funcao = String(formData.get("funcao") ?? "") as Funcao;
  const asoData = String(formData.get("aso_data") ?? "").trim();
  const esocialMatricula = String(formData.get("esocial_matricula") ?? "").trim();
  const credenciamentoData = String(formData.get("credenciamento_data") ?? "").trim();

  if (!nome || !cpf || !asoData || !esocialMatricula || !credenciamentoData) {
    return { error: "Preencha nome, CPF, ASO, matrícula E-Social e credenciamento." };
  }
  if (!FUNCOES.includes(funcao)) {
    return { error: "Função inválida." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("bombeiros").insert({
    nome,
    cpf,
    telefone: telefone || null,
    funcao,
    aso_data: asoData,
    esocial_matricula: esocialMatricula,
    esocial_status: "Ativo",
    credenciamento_data: credenciamentoData,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um bombeiro cadastrado com esse CPF." };
    }
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/bombeiros");
  redirect("/bombeiros");
}
