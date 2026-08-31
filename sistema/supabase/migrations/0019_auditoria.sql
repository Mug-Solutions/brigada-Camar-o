-- Fecha um gap essencial real do PRD (resposta da cliente, seção
-- "Usuários & Permissões"): "[Essencial] Log de auditoria (quem alterou
-- o quê)". Nunca implementado até agora — mesmo campo já previsto desde
-- o planejamento inicial (docs/arquitetura-sistema.html), mas a tabela
-- nunca chegou a ser criada.
create table auditoria_logs (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid references usuarios(id),
  tabela       text not null,
  registro_id  uuid,
  acao         text not null check (acao in ('criar', 'editar', 'excluir', 'aprovar', 'recusar')),
  valor_antes  jsonb,
  valor_depois jsonb,
  criado_em    timestamptz not null default now()
);

comment on table auditoria_logs is 'Registro de quem alterou o quê — item essencial do PRD, cobre os caminhos de escrita mais críticos (bombeiros, eventos, aprovações, financeiro), não literalmente toda escrita do sistema. Ver decisoes-tecnicas.md sobre o escopo dessa primeira rodada.';

create index idx_auditoria_logs_tabela on auditoria_logs(tabela, criado_em desc);
create index idx_auditoria_logs_registro on auditoria_logs(registro_id);

alter table auditoria_logs enable row level security;

-- Só staff lê (é uma tela administrativa de auditoria, não algo que um
-- bombeiro tem motivo pra acessar) — mesmo padrão de is_staff_ativo()
-- já usado desde a migração 0001. Escrita é sempre por Server Action
-- com service-role (chamada depois de cada operação já autorizada por
-- requireStaff()), sem policy de insert/update/delete de propósito —
-- e sem update/delete nenhum: log de auditoria é append-only por
-- natureza, nem staff deveria conseguir apagar uma entrada.
create policy auditoria_logs_staff_select on auditoria_logs
  for select using (is_staff_ativo());
