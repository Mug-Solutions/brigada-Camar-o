"use server";

import { revalidatePath } from "next/cache";
import { getSessionUsuario } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { ehTipoDocumentoAnexoValido, enviarDocumentoBombeiro } from "@/lib/documentos";

export type SolicitarDocumentoState = { error: string | null; sucesso: boolean };
export type EnviarDocumentoState = { error: string | null; sucesso: boolean };

const TIPOS_DOCUMENTO = ["aso", "credenciamento"] as const;
type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

function ehTipoValido(tipo: string): tipo is TipoDocumento {
  return TIPOS_DOCUMENTO.includes(tipo as TipoDocumento);
}

/**
 * Bombeiro pede atualização de ASO/Credenciamento — nunca escreve
 * direto em `bombeiros` (decisão do cliente: precisa de aprovação da
 * coordenação, mesma lógica do autocadastro inicial). `bombeiro_id`
 * vem da sessão, nunca de um campo de formulário — mesma disciplina
 * de enviarDadosCadastro (src/app/completar-cadastro/actions.ts).
 */
export async function solicitarAtualizacaoDocumento(
  _prevState: SolicitarDocumentoState,
  formData: FormData
): Promise<SolicitarDocumentoState> {
  const sessao = await getSessionUsuario();
  if (!sessao.configured || !sessao.loggedIn) {
    return { error: "Sessão expirada. Faça login novamente.", sucesso: false };
  }
  const bombeiroId = sessao.usuario?.bombeiro_id;
  if (!bombeiroId) {
    return { error: "Conta não vinculada a um cadastro de bombeiro.", sucesso: false };
  }

  const tipo = String(formData.get("tipo_documento") ?? "");
  const dataNova = String(formData.get("data_nova") ?? "").trim();

  if (!ehTipoValido(tipo)) {
    return { error: "Tipo de documento inválido.", sucesso: false };
  }
  if (!dataNova) {
    return { error: "Informe a nova data de validade.", sucesso: false };
  }
  // Formato estrito antes de comparar — "2026-1-5" (mês/dia sem zero à
  // esquerda) passaria numa comparação de string tipo dataNova <= hoje
  // como se fosse data futura (achado real de revisão de segurança).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNova)) {
    return { error: "Data inválida.", sucesso: false };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const novaData = new Date(dataNova + "T00:00:00");
  if (Number.isNaN(novaData.getTime()) || novaData <= hoje) {
    return { error: "A nova data de validade precisa ser no futuro.", sucesso: false };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("solicitacoes_documento").insert({
    bombeiro_id: bombeiroId,
    tipo_documento: tipo,
    data_nova: dataNova,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um pedido pendente para esse documento.", sucesso: false };
    }
    return { error: `Erro ao enviar: ${error.message}`, sucesso: false };
  }

  revalidatePath("/portal/documentos");
  return { error: null, sucesso: true };
}

/**
 * Bombeiro anexa o arquivo do ASO/Credenciamento/Curso — item
 * essencial do PRD (upload de documento) nunca implementado antes.
 * Diferente da atualização de DATA (função acima), anexar o arquivo
 * não muda nada em `bombeiros` nem precisa de aprovação — é só prova
 * documental somada ao histórico, não afeta o bloqueio automático de
 * escalação (que continua olhando só bombeiros.aso_data/credenciamento_data).
 * `bombeiro_id` sempre vem da sessão, nunca de um campo de formulário.
 */
export async function enviarDocumento(
  _prevState: EnviarDocumentoState,
  formData: FormData
): Promise<EnviarDocumentoState> {
  const sessao = await getSessionUsuario();
  if (!sessao.configured || !sessao.loggedIn) {
    return { error: "Sessão expirada. Faça login novamente.", sucesso: false };
  }
  const bombeiroId = sessao.usuario?.bombeiro_id;
  if (!bombeiroId) {
    return { error: "Conta não vinculada a um cadastro de bombeiro.", sucesso: false };
  }

  const tipo = String(formData.get("tipo_documento") ?? "");
  if (!ehTipoDocumentoAnexoValido(tipo)) {
    return { error: "Tipo de documento inválido.", sucesso: false };
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return { error: "Selecione um arquivo.", sucesso: false };
  }

  const supabase = createServerSupabaseClient();
  const resultado = await enviarDocumentoBombeiro({
    supabase,
    bombeiroId,
    tipoDocumento: tipo,
    arquivo,
    enviadoPor: sessao.usuario?.id,
  });

  if (resultado.error !== null) {
    return { error: resultado.error, sucesso: false };
  }

  await registrarAuditoria({
    supabase,
    usuarioId: sessao.usuario?.id,
    tabela: "bombeiro_documentos",
    registroId: resultado.documentoId,
    acao: "criar",
    valorDepois: { bombeiro_id: bombeiroId, tipo_documento: tipo },
  });

  revalidatePath("/portal/documentos");
  return { error: null, sucesso: true };
}
