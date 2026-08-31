-- ============================================================
-- Brigada Camarão — Migração 0001: Autenticação & RLS
-- Fase A do plano de construção do Portal do Bombeiro.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase (https://app.supabase.com/project/_/sql) e execute,
-- DEPOIS de já ter aplicado supabase/schema.sql.
--
-- O que muda:
--   1. Nova tabela `usuarios` — vincula um login (Supabase Auth)
--      a um papel ('bombeiro' ou 'staff') e, se for bombeiro, ao
--      registro correspondente em `bombeiros`.
--   2. RLS LIGADO em bombeiros/clientes/eventos/escalas/eventos_financeiro
--      (estava desligado de propósito — ver comentário no final de
--      schema.sql). As Server Actions administrativas usam a
--      service-role key (src/lib/supabase/server.ts), que ignora RLS
--      por design — nada quebra nas telas admin existentes. RLS só
--      passa a valer para acesso via sessão de usuário comum.
-- ============================================================

-- ── USUÁRIOS ─────────────────────────────────────────────────
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid not null unique references auth.users(id) on delete cascade,
  nome        text not null,
  papel       text not null check (papel in ('bombeiro','staff')),
  bombeiro_id uuid references bombeiros(id) on delete set null,
  ativo       boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table usuarios is 'Vincula um login do Supabase Auth a um papel do sistema e, se bombeiro, ao registro em bombeiros. ativo=false = pendente de aprovação da coordenação.';

create index if not exists idx_usuarios_auth_id on usuarios(auth_id);
create index if not exists idx_usuarios_bombeiro on usuarios(bombeiro_id);

-- ── FUNÇÕES AUXILIARES DE RLS ────────────────────────────────
-- security invoker (padrão): cada uma só enxerga a própria linha em
-- usuarios porque o filtro já restringe a auth.uid() antes de qualquer
-- política de usuarios ser avaliada — não há recursão nem necessidade
-- de security definer aqui.

create or replace function is_staff_ativo() returns boolean
language sql stable as $$
  select exists (
    select 1 from usuarios u
    where u.auth_id = auth.uid() and u.papel = 'staff' and u.ativo
  );
$$;

create or replace function bombeiro_id_da_sessao() returns uuid
language sql stable as $$
  select u.bombeiro_id from usuarios u
  where u.auth_id = auth.uid() and u.papel = 'bombeiro' and u.ativo
  limit 1;
$$;

-- ── RLS: usuarios ────────────────────────────────────────────
alter table usuarios enable row level security;

create policy usuarios_self_select on usuarios
  for select using (auth_id = auth.uid());

-- IMPORTANTE: o check restringe a linha inserida a papel='bombeiro' e
-- ativo=false — sem isso, qualquer usuário autenticado (ex.: via signup
-- público do Supabase Auth, fora do app) poderia se auto-inserir como
-- usuarios.papel='staff', ativo=true e ganhar acesso total via
-- is_staff_ativo(). Elevar para staff/aprovar continua sendo só pela
-- Server Action de aprovação (Fase B), que usa a service-role key.
create policy usuarios_self_insert on usuarios
  for insert with check (auth_id = auth.uid() and papel = 'bombeiro' and ativo = false);

-- Sem policy de update/delete aqui de propósito: aprovar/reprovar
-- cadastro (Fase B) é feito por uma Server Action que usa a
-- service-role key (staff autenticado, verificado na própria action),
-- não pela sessão do bombeiro.

-- ── RLS: tabelas operacionais ────────────────────────────────
alter table bombeiros          enable row level security;
alter table clientes           enable row level security;
alter table eventos            enable row level security;
alter table escalas            enable row level security;
alter table eventos_financeiro enable row level security;

-- Staff (papel='staff', ativo=true) tem acesso total — cobre as telas
-- admin caso algum dia deixem de usar a service-role key.
create policy bombeiros_staff_all on bombeiros
  for all using (is_staff_ativo()) with check (is_staff_ativo());
create policy clientes_staff_all on clientes
  for all using (is_staff_ativo()) with check (is_staff_ativo());
create policy eventos_staff_all on eventos
  for all using (is_staff_ativo()) with check (is_staff_ativo());
create policy escalas_staff_all on escalas
  for all using (is_staff_ativo()) with check (is_staff_ativo());
create policy eventos_financeiro_staff_all on eventos_financeiro
  for all using (is_staff_ativo()) with check (is_staff_ativo());

-- Bombeiro logado só lê o próprio registro em `bombeiros` (usado a
-- partir da Fase D, no Portal). Leitura de escalas/eventos por
-- bombeiro entra na migração da Fase E, quando essas telas existirem.
create policy bombeiros_self_select on bombeiros
  for select using (id = bombeiro_id_da_sessao());

-- ============================================================
-- TODO (próximas migrações):
--   - Fase D: RLS de bombeiro_documentos (bombeiro só vê/insere onde
--     bombeiro_id = bombeiro_id_da_sessao()).
--   - Fase E: policy de leitura em `escalas` para o bombeiro dono da
--     linha, + coluna status_confirmacao.
--   - Fase F: policy de update em `bombeiros` restrita aos campos não
--     sensíveis (telefone/endereço/chave PIX), pelo próprio bombeiro.
-- ============================================================
