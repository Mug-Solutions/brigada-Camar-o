-- ============================================================
-- Brigada Camarão — Migração 0005: Cadastro completo no autocadastro
-- O bombeiro passou a preencher, na etapa /completar-cadastro, os
-- mesmos campos que o formulário admin "Novo Bombeiro" já pedia
-- (src/app/(admin)/bombeiros/novo/NovoBombeiroForm.tsx) — não só
-- nome/CPF/telefone/função, também os dados de compliance.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001 a 0004.
-- ============================================================

alter table solicitacoes_cadastro
  add column aso_data date,
  add column esocial_matricula text,
  add column credenciamento_data date;

comment on column solicitacoes_cadastro.aso_data is 'Preenchido pelo próprio bombeiro em /completar-cadastro, junto com esocial_matricula e credenciamento_data — mesmos campos do cadastro manual pelo staff.';
