-- Fase 2 do roadmap (Portal do Bombeiro): "atualização de documentos
-- vencidos pelo próprio bombeiro". Decisão do cliente (por ora,
-- confirmar na call): atualização não vale na hora — precisa de
-- aprovação da coordenação, mesma lógica já usada no autocadastro
-- inicial (solicitacoes_cadastro). Cobre ASO e Credenciamento — os
-- dois documentos com data de validade rastreada.
create table solicitacoes_documento (
  id             uuid primary key default gen_random_uuid(),
  bombeiro_id    uuid not null references bombeiros(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('aso', 'credenciamento')),
  data_nova      date not null,
  status         text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  criado_em      timestamptz not null default now(),
  revisado_em    timestamptz,
  revisado_por   uuid references usuarios(id)
);

comment on table solicitacoes_documento is 'Pedido do bombeiro pra atualizar ASO ou Credenciamento — só passa a valer em bombeiros.* quando a coordenação aprova.';

-- No máximo 1 pedido pendente por bombeiro+tipo de documento, mesmo
-- padrão já usado em solicitacoes_cadastro (migração 0003) — evita
-- reenvios empilhando fila.
create unique index solicitacoes_documento_pendente_unico
  on solicitacoes_documento(bombeiro_id, tipo_documento) where status = 'pendente';

create index idx_solicitacoes_documento_status on solicitacoes_documento(status);

alter table solicitacoes_documento enable row level security;

-- Bombeiro só lê os próprios pedidos (pra saber se está pendente) —
-- o INSERT roda via Server Action com service-role, escopado ao
-- bombeiro_id resolvido pela sessão (nunca por um campo de
-- formulário), mesmo padrão de enviarDadosCadastro. Staff usa
-- service-role nas telas admin, não precisa de policy própria aqui
-- (mesmo raciocínio documentado em solicitacoes_cadastro).
create policy solicitacoes_documento_bombeiro_self_select on solicitacoes_documento
  for select using (bombeiro_id = bombeiro_id_da_sessao());
