-- ============================================================
-- Brigada Camarão — Migração 0003: Solicitação de Cadastro + Convite
-- Substitui o desenho da Fase B em 0002_cadastro.sql.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001_auth.sql e 0002_cadastro.sql.
--
-- MUDANÇA DE DESENHO (decisão registrada em docs/decisoes-tecnicas.md):
-- o cliente não quer que a coordenação precise pré-cadastrar cada
-- bombeiro antes dele conseguir se autocadastrar. Novo fluxo: o
-- bombeiro manda os próprios dados numa solicitação; a coordenação
-- revisa; só na aprovação o sistema cria o cadastro de verdade em
-- `bombeiros` e manda um convite por e-mail (o bombeiro define a
-- própria senha ao clicar — nunca trafega senha em texto puro).
-- ============================================================

-- ── REMOVE o que ficou obsoleto de 0002_cadastro.sql ────────────
-- (o gate por CPF+telefone contra um registro pré-existente não
-- existe mais — a revisão humana da solicitação é o novo gate).
drop trigger if exists on_auth_user_created_bombeiro on auth.users;
drop function if exists handle_new_bombeiro_signup();
drop function if exists bombeiro_disponivel_para_cadastro(text, text);
drop table if exists cadastro_tentativas;

-- Ninguém mais se autoinsere em `usuarios` — toda linha de bombeiro
-- nasce pela Server Action de aprovação, com service-role.
drop policy if exists usuarios_self_insert on usuarios;

-- ── SOLICITAÇÕES DE CADASTRO ────────────────────────────────────
create table solicitacoes_cadastro (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  cpf          text not null,
  telefone     text not null,
  funcao       text not null default 'Bombeiro Civil'
                 check (funcao in ('Bombeiro Civil','Bombeiro Civil Líder','Supervisora de Brigada')),
  email        text not null,
  status       text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  criado_em    timestamptz not null default now(),
  revisado_em  timestamptz,
  revisado_por uuid references usuarios(id)
);

comment on table solicitacoes_cadastro is 'Autocadastro do bombeiro antes de virar registro real — nada entra em bombeiros/usuarios até a coordenação aprovar.';

-- No máximo 1 solicitação pendente por CPF, pra fila não empilhar
-- reenvios do mesmo bombeiro enquanto espera revisão.
create unique index solicitacoes_cadastro_cpf_pendente
  on solicitacoes_cadastro(cpf) where status = 'pendente';

create index idx_solicitacoes_cadastro_status on solicitacoes_cadastro(status);

alter table solicitacoes_cadastro enable row level security;
-- Sem policy nenhuma pra anon/authenticated de propósito: a única
-- gravação nesta tabela é a Server Action pública (src/app/cadastro/actions.ts),
-- que roda inteira no servidor com a service-role key — diferente da
-- Fase B antiga, não existe mais nenhum cliente do navegador tocando
-- o banco direto nessa etapa, então não precisa abrir RLS pra ninguém
-- aqui. Superfície de ataque menor que a RPC security-definer anterior.

-- ============================================================
-- TODO (próxima migração — Fase D): RLS de bombeiro_documentos.
-- ============================================================
