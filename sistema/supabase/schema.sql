-- ============================================================
-- Brigada Camarão — Schema inicial
-- Cobre os 4 módulos validados no protótipo: bombeiros/compliance,
-- clientes, eventos & escalas, financeiro.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase (https://app.supabase.com/project/_/sql) e execute.
-- ============================================================

create extension if not exists "pgcrypto";

-- ── BOMBEIROS ────────────────────────────────────────────────
create table if not exists bombeiros (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  cpf                text not null unique,
  telefone           text,
  funcao             text not null default 'Bombeiro Civil'
                       check (funcao in ('Bombeiro Civil','Bombeiro Civil Líder','Supervisora de Brigada')),
  aso_data           date,
  esocial_matricula  text,
  esocial_status     text not null default 'Ativo'
                       check (esocial_status in ('Ativo','Inativo')),
  credenciamento_data date,
  created_at         timestamptz not null default now()
);

comment on table bombeiros is 'Quadro de bombeiros civis e status de documentação obrigatória (ASO, E-Social, Credenciamento).';

-- ── CLIENTES ─────────────────────────────────────────────────
create table if not exists clientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  cnpj       text,
  contato    text,
  email      text,
  created_at timestamptz not null default now()
);

comment on table clientes is 'Empresas que contratam bombeiros civis para eventos.';

-- ── EVENTOS ──────────────────────────────────────────────────
create table if not exists eventos (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null,
  cliente_id             uuid references clientes(id) on delete set null,
  local                  text,
  data_inicio            date not null,
  data_fim               date not null,
  quantitativo_bombeiros integer not null default 0,
  materiais              text,
  valor_fechamento       numeric(12,2) not null default 0,
  status                 text not null default 'Planejamento'
                           check (status in ('Planejamento','Confirmado','Concluído')),
  created_at             timestamptz not null default now()
);

comment on table eventos is 'Contratos recebidos de empresas organizadoras de eventos.';

-- ── ESCALAS ──────────────────────────────────────────────────
create table if not exists escalas (
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null references eventos(id) on delete cascade,
  bombeiro_id        uuid not null references bombeiros(id) on delete restrict,
  data               date not null,
  turno              text not null check (turno in ('Diurno','Noturno','Especial')),
  horario_cumprido   text,
  valor              numeric(10,2) not null default 0,
  created_at         timestamptz not null default now()
);

comment on table escalas is 'Alocação de um bombeiro em um turno de um evento, com valor da diária.';

-- ── FINANCEIRO (recebimento do cliente / pagamento aos bombeiros) ──
create table if not exists eventos_financeiro (
  evento_id                 uuid primary key references eventos(id) on delete cascade,
  pago_bombeiros_data       date,
  pago_bombeiros_status     text not null default 'Pendente'
                              check (pago_bombeiros_status in ('Pendente','Pago','Atrasado')),
  recebido_cliente_data     date,
  recebido_cliente_status   text not null default 'Pendente'
                              check (recebido_cliente_status in ('Pendente','Recebido','Atrasado'))
);

comment on table eventos_financeiro is 'Controle de contas a pagar (bombeiros) e a receber (cliente) por evento.';

-- ── ÍNDICES ──────────────────────────────────────────────────
create index if not exists idx_escalas_evento on escalas(evento_id);
create index if not exists idx_escalas_bombeiro on escalas(bombeiro_id);
create index if not exists idx_eventos_cliente on eventos(cliente_id);
create index if not exists idx_eventos_data_inicio on eventos(data_inicio);

-- ============================================================
-- TODO (próxima fase — não incluído neste início de projeto):
--   - Autenticação de usuários e Row Level Security por papel
--     (operação / financeiro / direção), conforme mapeado na
--     Seção 9 do levantamento de requisitos.
--   - Até lá, RLS fica DESLIGADO propositalmente: o acesso é
--     controlado pela chave de serviço no backend (Server
--     Actions), nunca exposta ao navegador.
-- ============================================================
