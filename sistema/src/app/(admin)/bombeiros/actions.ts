"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff, getSessionUsuario } from "@/lib/auth/session";
import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";
import { registrarAuditoria } from "@/lib/auditoria";
import { ehTipoDocumentoAnexoValido, enviarDocumentoBombeiro, enviarDocumentoCadastro } from "@/lib/documentos";
import { enviarFotoRosto } from "@/lib/foto-rosto";

export type EnviarDocumentoStaffState = { error: string | null };

export type CriarBombeiroState = { error: string | null };

export async function criarBombeiro(
  _prevState: CriarBombeiroState,
  formData: FormData
): Promise<CriarBombeiroState> {
  // Defesa em profundidade: esta action usa a service-role key (ignora
  // RLS), então não pode depender só do src/proxy.ts para barrar acesso
  // — ver o comentário em requireStaff() sobre por que isso importa.
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error };

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

  if (!nome || !cpf || !asoData || !esocialMatricula || !credenciamentoData) {
    return { error: "Preencha nome, CPF, ASO, matrícula E-Social e credenciamento." };
  }
  if (!(fotoRosto instanceof File) || fotoRosto.size === 0) {
    return { error: "Envie uma foto do rosto do bombeiro." };
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
  if (chavePix && comecaComCaractereFormula(chavePix)) {
    return { error: "Chave PIX não pode começar com =, +, - ou @." };
  }

  const supabase = createServerSupabaseClient();

  // Re-checagem no servidor contra a lista configurável (funcoes_bombeiro,
  // migração 0021) — não confia só no <select> do formulário. A FK em
  // bombeiros.funcao já barraria um valor inexistente de qualquer forma,
  // mas essa checagem antecipada dá uma mensagem amigável em vez do erro
  // bruto do Postgres.
  const { data: funcaoValida } = await supabase
    .from("funcoes_bombeiro")
    .select("nome")
    .eq("nome", funcao)
    .eq("ativo", true)
    .maybeSingle();
  if (!funcaoValida) {
    return { error: "Função inválida." };
  }

  // Sobe os 3 arquivos ANTES de criar o bombeiro — se algum falhar
  // (formato/tamanho inválido), não sobra um bombeiro incompleto pra
  // corrigir depois. Bombeiro ainda não existe nesse momento (é criado
  // logo abaixo), então a chave do path é um UUID novo — a mesma pros
  // 3, pra ficarem agrupados na mesma "pasta" no Storage.
  const chaveArquivos = crypto.randomUUID();

  const fotoResultado = await enviarFotoRosto({ supabase, chave: chaveArquivos, arquivo: fotoRosto });
  if (fotoResultado.error !== null) {
    return { error: fotoResultado.error };
  }

  const asoResultado = await enviarDocumentoCadastro({
    supabase,
    chave: chaveArquivos,
    tipoDocumento: "aso",
    arquivo: asoDocumento,
  });
  if (asoResultado.error !== null) {
    return { error: asoResultado.error };
  }

  const credenciamentoResultado = await enviarDocumentoCadastro({
    supabase,
    chave: chaveArquivos,
    tipoDocumento: "credenciamento",
    arquivo: credenciamentoDocumento,
  });
  if (credenciamentoResultado.error !== null) {
    return { error: credenciamentoResultado.error };
  }

  const { data: bombeiro, error } = await supabase
    .from("bombeiros")
    .insert({
      nome,
      cpf,
      telefone: telefone || null,
      funcao,
      aso_data: asoData,
      esocial_matricula: esocialMatricula,
      esocial_status: "Ativo",
      credenciamento_data: credenciamentoData,
      chave_pix: chavePix || null,
      foto_rosto_path: fotoResultado.path,
      aso_documento_path: asoResultado.path,
      credenciamento_documento_path: credenciamentoResultado.path,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um bombeiro cadastrado com esse CPF." };
    }
    return { error: `Erro ao salvar: ${error.message}` };
  }

  const sessao = await getSessionUsuario();
  await registrarAuditoria({
    supabase,
    usuarioId: sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined,
    tabela: "bombeiros",
    registroId: bombeiro.id,
    acao: "criar",
    valorDepois: { nome, cpf, funcao },
  });

  revalidatePath("/bombeiros");
  redirect("/bombeiros");
}

/**
 * Staff anexa um documento em nome de um bombeiro (ex.: recebeu o PDF
 * por WhatsApp e precisa arquivar). Mesmo helper de upload usado no
 * Portal (src/lib/documentos.ts) — só muda quem está autorizado a
 * chamar (`requireStaff()` em vez de sessão de bombeiro) e de onde vem
 * o bombeiro_id (campo de formulário, não a sessão — aqui é o staff
 * escolhendo de quem é o documento).
 */
export async function enviarDocumentoBombeiroStaff(
  _prevState: EnviarDocumentoStaffState,
  formData: FormData
): Promise<EnviarDocumentoStaffState> {
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error };

  const bombeiroId = String(formData.get("bombeiro_id") ?? "").trim();
  const tipo = String(formData.get("tipo_documento") ?? "");
  if (!bombeiroId) return { error: "Bombeiro não informado." };
  if (!ehTipoDocumentoAnexoValido(tipo)) return { error: "Tipo de documento inválido." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) return { error: "Selecione um arquivo." };

  const supabase = createServerSupabaseClient();

  // Re-checagem no servidor: bombeiro_id vem de um <select> do
  // formulário, mesmo motivo pelo qual isso nunca é confiado sozinho
  // no resto do sistema (ver adicionarEscala).
  const { data: bombeiro } = await supabase.from("bombeiros").select("id").eq("id", bombeiroId).maybeSingle();
  if (!bombeiro) return { error: "Bombeiro não encontrado." };

  const sessao = await getSessionUsuario();
  const resultado = await enviarDocumentoBombeiro({
    supabase,
    bombeiroId,
    tipoDocumento: tipo,
    arquivo,
    enviadoPor: sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined,
  });

  if (resultado.error !== null) return { error: resultado.error };

  await registrarAuditoria({
    supabase,
    usuarioId: sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined,
    tabela: "bombeiro_documentos",
    registroId: resultado.documentoId,
    acao: "criar",
    valorDepois: { bombeiro_id: bombeiroId, tipo_documento: tipo },
  });

  revalidatePath("/bombeiros");
  return { error: null };
}
