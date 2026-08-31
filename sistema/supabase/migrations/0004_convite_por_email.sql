-- ============================================================
-- Brigada Camarão — Migração 0004: Convite iniciado pelo admin
-- Ajusta `solicitacoes_cadastro` (criada em 0003) pro fluxo correto:
-- admin cadastra só o e-mail → sistema convida → bombeiro define
-- senha e preenche os dados → admin aprova.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001, 0002 e 0003.
--
-- MUDANÇA DE DESENHO (decisão registrada em docs/decisoes-tecnicas.md):
-- a versão anterior deixava o bombeiro preencher um formulário público
-- ANTES de qualquer aprovação — o cliente corrigiu: o convite tem que
-- começar pelo admin (só o e-mail), e só quem foi convidado consegue
-- sequer chegar no formulário de dados. Fecha a brecha de link vazado
-- de forma mais direta que as duas tentativas anteriores.
-- ============================================================

alter table solicitacoes_cadastro
  add column auth_id uuid references auth.users(id) on delete set null,
  add column dados_enviados_em timestamptz,
  alter column nome drop not null,
  alter column cpf drop not null,
  alter column telefone drop not null,
  alter column funcao drop not null;

alter table solicitacoes_cadastro drop constraint solicitacoes_cadastro_status_check;
alter table solicitacoes_cadastro add constraint solicitacoes_cadastro_status_check
  check (status in ('convidado','pendente','aprovado','recusado'));

alter table solicitacoes_cadastro alter column status set default 'convidado';

-- CPF só existe depois que o bombeiro preenche o formulário — o índice
-- antigo (trancava na hora do convite) não faz mais sentido, mas a
-- proteção em si (não deixar duas solicitações com o mesmo CPF
-- pendentes ao mesmo tempo) continua valendo — recriada mais abaixo no
-- momento certo do ciclo (status='pendente', quando o CPF já existe).
drop index if exists solicitacoes_cadastro_cpf_pendente;
create unique index solicitacoes_cadastro_cpf_pendente
  on solicitacoes_cadastro(cpf) where status = 'pendente';

-- Achado do security-reviewer: sem isso, convidar o mesmo e-mail duas
-- vezes (duplo clique, ou reenvio manual) enquanto a primeira ainda
-- está 'convidado'/'pendente' cria duas linhas pro mesmo auth_id — a
-- consulta de completar-cadastro.page.tsx (.maybeSingle()) quebra com
-- múltiplas linhas, travando um convite legítimo até alguém arrumar
-- direto no banco.
create unique index solicitacoes_cadastro_auth_id_ativo
  on solicitacoes_cadastro(auth_id) where status in ('convidado','pendente');

comment on table solicitacoes_cadastro is 'Ciclo: convidado (admin convidou, sem dados) -> pendente (bombeiro preencheu, aguardando revisão) -> aprovado | recusado.';
comment on column solicitacoes_cadastro.auth_id is 'Conta criada no convite (inviteUserByEmail) — existe desde o status=convidado, antes de qualquer dado pessoal.';

-- ============================================================
-- TODO (próxima migração — Fase D): RLS de bombeiro_documentos.
-- ============================================================
