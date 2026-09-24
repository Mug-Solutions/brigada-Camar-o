-- ============================================================
-- Brigada Camarão — Migração 0027: corrige constraint de auditoria
-- pra aceitar 'cancelar'
--
-- Achado real: a migração 0026 (status Cancelado) adicionou 'cancelar'
-- em AcaoAuditoria (src/lib/auditoria.ts) e cancelarEvento passou a
-- chamar registrarAuditoria({acao: "cancelar", ...}) — mas a
-- constraint em auditoria_logs.acao (0019, ampliada em 0023 só pra
-- 'gerar') nunca foi atualizada. registrarAuditoria nunca lança erro
-- de propósito (não pode derrubar uma ação que já aconteceu de
-- verdade — ver comentário em src/lib/auditoria.ts), então isso falhava
-- em silêncio: todo cancelamento de evento funcionava normalmente,
-- só o log de auditoria correspondente nunca era gravado.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001 a 0026.
-- ============================================================

alter table auditoria_logs drop constraint if exists auditoria_logs_acao_check;
alter table auditoria_logs add constraint auditoria_logs_acao_check
  check (acao in ('criar', 'editar', 'excluir', 'aprovar', 'recusar', 'gerar', 'cancelar'));
