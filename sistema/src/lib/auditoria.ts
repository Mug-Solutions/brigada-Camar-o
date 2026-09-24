import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AcaoAuditoria = "criar" | "editar" | "excluir" | "aprovar" | "recusar" | "gerar" | "cancelar";

interface RegistrarAuditoriaParams {
  supabase: SupabaseClient;
  usuarioId: string | undefined;
  tabela: string;
  registroId: string | null;
  acao: AcaoAuditoria;
  valorAntes?: unknown;
  valorDepois?: unknown;
}

/**
 * Helper de log de auditoria (item essencial do PRD: "Log de auditoria
 * — quem alterou o quê"). Chamado no fim de uma Server Action, depois
 * que a escrita principal já foi confirmada com sucesso — nunca antes,
 * pra não registrar uma ação que na verdade falhou.
 *
 * Nunca lança: uma falha ao gravar auditoria não pode derrubar a
 * operação principal que já aconteceu de verdade (ex.: bombeiro já foi
 * criado, só o log é que não gravou) — só loga alto pro time perceber.
 * Mesmo padrão de "não desfazer um fato consumado" já usado em
 * aprovarSolicitacao/aprovarAtualizacaoDocumento.
 */
export async function registrarAuditoria({
  supabase,
  usuarioId,
  tabela,
  registroId,
  acao,
  valorAntes,
  valorDepois,
}: RegistrarAuditoriaParams): Promise<void> {
  const { error } = await supabase.from("auditoria_logs").insert({
    usuario_id: usuarioId ?? null,
    tabela,
    registro_id: registroId,
    acao,
    valor_antes: valorAntes ?? null,
    valor_depois: valorDepois ?? null,
  });

  if (error) {
    console.error("[registrarAuditoria] falha ao gravar log de auditoria", {
      tabela,
      registroId,
      acao,
      erro: error,
    });
  }
}
