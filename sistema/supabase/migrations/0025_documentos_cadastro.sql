-- ============================================================
-- Brigada Camarão — Migração 0025: Anexo de ASO e Credenciamento
-- obrigatório no momento do cadastro
--
-- Até agora o cadastro (autocadastro em /completar-cadastro e manual
-- em /bombeiros/novo) só coletava a DATA de validade do ASO e do
-- Credenciamento — o arquivo em si só podia ser anexado depois, sem
-- prazo, pelo Portal ou pelo staff. Decisão do cliente: o arquivo
-- também precisa ser obrigatório já no cadastro.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001 a 0024.
-- ============================================================

alter table solicitacoes_cadastro
  add column aso_documento_path text,
  add column credenciamento_documento_path text;

alter table bombeiros
  add column aso_documento_path text,
  add column credenciamento_documento_path text;

comment on column solicitacoes_cadastro.aso_documento_path is 'Caminho no bucket documentos-bombeiros (privado) do arquivo de ASO enviado no cadastro — path "{auth_id}/aso.{ext}". Copiado pra bombeiros.aso_documento_path na aprovação.';
comment on column solicitacoes_cadastro.credenciamento_documento_path is 'Mesma lógica de aso_documento_path, pro Credenciamento.';
comment on column bombeiros.aso_documento_path is 'Arquivo de ASO coletado no momento do cadastro (autocadastro ou manual pelo staff) — distinto do histórico de reenvios em bombeiro_documentos, que continua existindo pra atualizações pós-aprovação.';
comment on column bombeiros.credenciamento_documento_path is 'Mesma lógica de aso_documento_path, pro Credenciamento.';

-- Reaproveita o bucket documentos-bombeiros (0018), já privado e sem
-- policy nenhuma de storage.objects pra anon/authenticated — mesma
-- postura de segurança, nenhuma mudança necessária nele.
