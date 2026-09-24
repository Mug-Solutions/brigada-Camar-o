-- ============================================================
-- Brigada Camarão — Migração 0028: Turnos configuráveis pelo staff
--
-- Até agora "turno" (Diurno/Noturno/Especial) era uma lista fixa em
-- src/lib/constants.ts, com CHECK fixo em escalas.turno/
-- disponibilidades.turno. Pedido do cliente: poder criar, editar
-- (horário/valor) e excluir turnos pela tela de Preços, e também
-- poder tabelar novos "tipos de gasto" além dos fixos de hoje.
--
-- Mesmo padrão já usado em funcoes_bombeiro (migração 0021): tabela
-- com `nome` como chave, CHECK fixo vira FK. Nome não é renomeável
-- (é a chave estrangeira referenciada por escalas/disponibilidades —
-- renomear reescreveria o rótulo de registros históricos).
--
-- O preço passa a morar direto em turnos_config.valor — elimina a
-- indireção turno→chave→precos_config que existia antes
-- (CHAVE_PRECO_POR_TURNO). As 3 linhas de turno em precos_config
-- ficam obsoletas e são removidas.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001 a 0027.
-- ============================================================

create table turnos_config (
  nome         text primary key,
  hora_inicio  time not null,
  hora_fim     time not null check (hora_fim <> hora_inicio),
  valor        numeric(10,2) not null check (valor >= 0),
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table turnos_config is 'Turnos configuráveis pelo staff (nome, horário padrão, valor da diária) — substitui o CHECK fixo que existia em escalas.turno/disponibilidades.turno. Preço mora aqui agora, não mais em precos_config.';

insert into turnos_config (nome, hora_inicio, hora_fim, valor) values
  ('Diurno', '08:00', '18:00', 150),
  ('Noturno', '18:00', '00:00', 135),
  ('Especial', '08:00', '20:00', 280);

alter table escalas drop constraint if exists escalas_turno_check;
alter table escalas add constraint escalas_turno_fkey foreign key (turno) references turnos_config(nome);

alter table disponibilidades drop constraint if exists disponibilidades_turno_check;
alter table disponibilidades add constraint disponibilidades_turno_fkey foreign key (turno) references turnos_config(nome);

-- Preço de turno agora vem de turnos_config.valor — essas 3 linhas
-- ficariam órfãs/desatualizadas em precos_config.
delete from precos_config where chave in ('turno_diurno', 'turno_noturno', 'turno_especial');

alter table turnos_config enable row level security;

create policy turnos_config_staff_all on turnos_config
  for all using (is_staff_ativo()) with check (is_staff_ativo());

-- Disponibilidade (Portal, sessão do próprio bombeiro) precisa listar
-- turnos ativos pra montar o <select> — dado não sensível (nome,
-- horário e valor de turno já aparecem pro bombeiro na própria
-- escala/folha de pagamento).
create policy turnos_config_select_authenticated on turnos_config
  for select using (auth.role() = 'authenticated');
