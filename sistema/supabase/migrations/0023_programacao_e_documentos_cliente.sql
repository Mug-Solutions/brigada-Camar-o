-- Orçamento e contrato gerados pelo sistema (PDF pronto pra mandar ao
-- cliente). Os dois documentos têm a mesma tabela DATA / HORÁRIO /
-- CARGA HORÁRIA / QUANTIDADE, e até aqui o sistema não tinha de onde
-- tirar isso: o evento só guarda período (data_inicio/data_fim) e
-- quantitativo total, e os horários só existem nas escalas — que são
-- por bombeiro já escolhido e presas aos 3 turnos fixos. O orçamento
-- sai ANTES de existir qualquer escala, então nenhuma das duas fontes
-- serve.
--
-- 1) Programação do evento: o que foi combinado com o cliente, linha a
-- linha (um dia pode ter mais de uma linha, com horários diferentes).
-- Independente das escalas de propósito — é o contratado, não quem foi
-- escalado.
create table evento_programacao (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  data        date not null,
  hora_inicio time not null,
  -- hora_fim menor que hora_inicio = atravessa a meia-noite (ex.:
  -- 18:00 às 00:00, igual ao turno Noturno). Igual não faz sentido.
  hora_fim    time not null check (hora_fim <> hora_inicio),
  quantidade  integer not null check (quantidade > 0),
  created_at  timestamptz not null default now()
);

comment on table evento_programacao is 'Dias/horários/quantidade de brigadistas combinados com o cliente — fonte da tabela do orçamento e do contrato gerados em PDF. Não depende das escalas (o orçamento sai antes de alguém ser escalado).';

create index idx_evento_programacao_evento on evento_programacao(evento_id, data, hora_inicio);

alter table evento_programacao enable row level security;

-- Tela administrativa só: mesmo padrão das tabelas de staff (0001).
-- Escrita real é por Server Action com service-role, depois de
-- requireStaff().
create policy evento_programacao_staff_all on evento_programacao
  for all using (is_staff_ativo()) with check (is_staff_ativo());

-- 2) Auditoria da geração. Os documentos saem com a assinatura do
-- representante da Brigada aplicada automaticamente — qualquer staff
-- gera um contrato "assinado". Registrar quem gerou, de qual evento e
-- com qual valor é o mínimo pra isso ter rastro.
alter table auditoria_logs drop constraint if exists auditoria_logs_acao_check;
alter table auditoria_logs add constraint auditoria_logs_acao_check
  check (acao in ('criar', 'editar', 'excluir', 'aprovar', 'recusar', 'gerar'));
