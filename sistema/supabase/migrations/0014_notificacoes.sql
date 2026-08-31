-- Fase 4 do roadmap (Comunicação): "notificação por e-mail e in-app" +
-- "job diário de verificação de vencimento". Esta tabela é o canal
-- in-app — o bombeiro vê aqui os alertas de documento vencendo/vencido
-- que o job diário gera.
create table notificacoes (
  id             uuid primary key default gen_random_uuid(),
  bombeiro_id    uuid not null references bombeiros(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('aso', 'credenciamento')),
  nivel          text not null check (nivel in ('warn', 'crit')),
  mensagem       text not null,
  lida           boolean not null default false,
  criado_em      timestamptz not null default now()
);

comment on table notificacoes is 'Alertas de documento vencendo/vencido gerados pelo job diário — canal in-app (ver também envio por e-mail em src/lib/email).';

-- No máximo 1 alerta NÃO LIDO por bombeiro+documento+nível — o job
-- roda todo dia mas não deve empilhar notificação repetida enquanto o
-- bombeiro não marcar como lida (ou o nível mudar de warn pra crit,
-- que é uma combinação diferente, gerando um alerta novo de verdade).
create unique index notificacoes_nao_lida_unica
  on notificacoes(bombeiro_id, tipo_documento, nivel) where lida = false;

create index idx_notificacoes_bombeiro on notificacoes(bombeiro_id);

alter table notificacoes enable row level security;

-- Bombeiro só lê as próprias notificações. "Marcar como lida" roda
-- via Server Action com service-role, escopada ao bombeiro_id da
-- sessão — mesmo padrão de solicitacoes_documento (migração 0013),
-- não uma policy de UPDATE direta pro bombeiro.
create policy notificacoes_bombeiro_self_select on notificacoes
  for select using (bombeiro_id = bombeiro_id_da_sessao());
