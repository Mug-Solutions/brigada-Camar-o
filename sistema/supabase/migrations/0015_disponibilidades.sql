-- Fase 7 do roadmap (itens desejáveis), primeiro item: "registro de
-- disponibilidade do bombeiro (dias/horários/regiões)". Reaproveita o
-- conceito de Turno já usado em escalas (Diurno/Noturno/Especial) em
-- vez de horário livre — mantém consistência com o resto do sistema
-- e evita o bombeiro digitar um horário que não bate com nenhum turno
-- real. Região é texto livre por enquanto — não existe uma estrutura
-- de bairro/zona no sistema ainda.
create table disponibilidades (
  id          uuid primary key default gen_random_uuid(),
  bombeiro_id uuid not null references bombeiros(id) on delete cascade,
  dia_semana  text not null
    check (dia_semana in ('Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado')),
  turno       text not null check (turno in ('Diurno','Noturno','Especial')),
  regiao      text,
  created_at  timestamptz not null default now()
);

comment on table disponibilidades is 'Dias/turnos/regiões em que o bombeiro está disponível — item desejável (Fase 7). Ainda não conectado a sugestão automática de escala nem a candidatura a evento (próximos itens da mesma fase).';

create index idx_disponibilidades_bombeiro on disponibilidades(bombeiro_id);

-- Achado de revisão de segurança: sem isso, nada impedia o mesmo
-- bombeiro cadastrar a mesma combinação repetidamente (nem duplicata
-- nem volume têm limite) — diferente do padrão já usado em
-- solicitacoes_documento (0013) e notificacoes (0014), que têm índice
-- único equivalente. coalesce(regiao,'') porque NULL não é igual a
-- NULL em índice único (duas linhas com região em branco não
-- colidiriam sem isso).
create unique index disponibilidades_unica
  on disponibilidades (bombeiro_id, dia_semana, turno, (coalesce(regiao, '')));

alter table disponibilidades enable row level security;

-- Mesmo padrão de solicitacoes_documento/notificacoes: bombeiro só lê
-- as próprias linhas via RLS; escrita (adicionar/remover) roda por
-- Server Action com service-role, escopada ao bombeiro_id da sessão.
create policy disponibilidades_bombeiro_self_select on disponibilidades
  for select using (bombeiro_id = bombeiro_id_da_sessao());
