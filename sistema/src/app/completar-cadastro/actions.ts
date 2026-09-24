"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cpfTemFormatoValido, telefoneTemFormatoValido } from "@/lib/validation/documento";
import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";
import { enviarFotoRosto } from "@/lib/foto-rosto";
import { enviarDocumentoCadastro } from "@/lib/documentos";

export type CompletarCadastroState = { error: string | null };

export async function enviarDadosCadastro(
  _prevState: CompletarCadastroState,
  formData: FormData
): Promise<CompletarCadastroState> {
  const sessionClient = await getSessionSupabaseClient();
  if (!sessionClient) {
    return { error: "Sessão não encontrada. Acesse pelo link do e-mail de convite." };
  }

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Acesse pelo link do e-mail de convite novamente." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const funcao = String(formData.get("funcao") ?? "").trim();
  const asoData = String(formData.get("aso_data") ?? "").trim();
  const esocialMatricula = String(formData.get("esocial_matricula") ?? "").trim();
  const credenciamentoData = String(formData.get("credenciamento_data") ?? "").trim();
  const chavePix = String(formData.get("chave_pix") ?? "").trim();
  const fotoRosto = formData.get("foto_rosto");
  const asoDocumento = formData.get("aso_documento");
  const credenciamentoDocumento = formData.get("credenciamento_documento");

  if (!nome || !cpf || !telefone || !asoData || !esocialMatricula || !credenciamentoData || !chavePix) {
    return { error: "Preencha todos os campos." };
  }
  if (!(fotoRosto instanceof File) || fotoRosto.size === 0) {
    return { error: "Envie uma foto do rosto." };
  }
  if (!(asoDocumento instanceof File) || asoDocumento.size === 0) {
    return { error: "Envie o arquivo do ASO." };
  }
  if (!(credenciamentoDocumento instanceof File) || credenciamentoDocumento.size === 0) {
    return { error: "Envie o arquivo do Credenciamento." };
  }
  if (comecaComCaractereFormula(nome)) {
    return { error: "Nome não pode começar com =, +, - ou @." };
  }
  if (chavePix.length > 140) {
    return { error: "Chave PIX inválida." };
  }
  if (comecaComCaractereFormula(chavePix)) {
    return { error: "Chave PIX não pode começar com =, +, - ou @." };
  }
  if (!cpfTemFormatoValido(cpf)) {
    return { error: "CPF inválido." };
  }
  if (!telefoneTemFormatoValido(telefone)) {
    return { error: "Telefone inválido." };
  }

  // Dados sensíveis (CPF, ligação com o convite) só se gravam pelo
  // service-role, escopados ao auth_id da PRÓPRIA sessão — nunca por
  // um id que o formulário poderia mandar.
  const supabase = createServerSupabaseClient();

  // Re-checagem contra a lista configurável (funcoes_bombeiro, migração
  // 0021) — falha aqui com mensagem amigável em vez de só na hora da
  // aprovação, quando a FK em bombeiros.funcao bloquearia de qualquer
  // jeito.
  const { data: funcaoValida } = await supabase
    .from("funcoes_bombeiro")
    .select("nome")
    .eq("nome", funcao)
    .eq("ativo", true)
    .maybeSingle();
  if (!funcaoValida) {
    return { error: "Função inválida." };
  }

  const { data: bombeiroExistente } = await supabase.from("bombeiros").select("id").eq("cpf", cpf).maybeSingle();
  if (bombeiroExistente) {
    return { error: "Esse CPF já está cadastrado. Fale com a coordenação." };
  }

  const fotoResultado = await enviarFotoRosto({ supabase, chave: user.id, arquivo: fotoRosto });
  if (fotoResultado.error !== null) {
    return { error: fotoResultado.error };
  }

  const asoResultado = await enviarDocumentoCadastro({
    supabase,
    chave: user.id,
    tipoDocumento: "aso",
    arquivo: asoDocumento,
  });
  if (asoResultado.error !== null) {
    return { error: asoResultado.error };
  }

  const credenciamentoResultado = await enviarDocumentoCadastro({
    supabase,
    chave: user.id,
    tipoDocumento: "credenciamento",
    arquivo: credenciamentoDocumento,
  });
  if (credenciamentoResultado.error !== null) {
    return { error: credenciamentoResultado.error };
  }

  const { data: atualizado, error: updateError } = await supabase
    .from("solicitacoes_cadastro")
    .update({
      nome,
      cpf,
      telefone,
      funcao,
      aso_data: asoData,
      esocial_matricula: esocialMatricula,
      credenciamento_data: credenciamentoData,
      chave_pix: chavePix,
      foto_rosto_path: fotoResultado.path,
      aso_documento_path: asoResultado.path,
      credenciamento_documento_path: credenciamentoResultado.path,
      status: "pendente",
      dados_enviados_em: new Date().toISOString(),
    })
    .eq("auth_id", user.id)
    .eq("status", "convidado")
    .select("id")
    .maybeSingle();

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "Esse CPF já está em análise em outro cadastro." };
    }
    return { error: `Erro ao enviar: ${updateError.message}` };
  }
  if (!atualizado) {
    return { error: "Não encontramos seu convite pendente. Fale com a coordenação." };
  }

  // Sem isso, a fila de aprovação (que já é dynamic, mas ainda assim
  // cacheada no lado do cliente pelo Router Cache do Next.js) só
  // mostrava essa solicitação depois de um hard refresh — achado real:
  // convidarBombeiro/aprovarSolicitacao/recusarSolicitacao já
  // revalidam essa rota, só esta ação (a única que roda na sessão do
  // BOMBEIRO, não da coordenação) não revalidava.
  revalidatePath("/bombeiros/aprovacoes");

  redirect("/completar-cadastro");
}
