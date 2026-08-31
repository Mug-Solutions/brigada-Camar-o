-- Fecha 2 itens essenciais do PRD ainda em aberto, nenhum dependendo
-- de decisão do cliente.

-- 1) "Múltiplas hierarquias/funções" — a lista de funções era fixa no
-- código (FUNCOES em src/lib/constants.ts) e travada por um CHECK no
-- banco (bombeiros_funcao_check, schema.sql). Vira uma tabela que o
-- staff administra — mesma régua já usada pra preços (precos_config).
create table funcoes_bombeiro (
  nome       text primary key,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

comment on table funcoes_bombeiro is 'Funções/hierarquias de bombeiro configuráveis pelo staff (ex.: Bombeiro Civil, Líder, Supervisora) — substitui o CHECK fixo que existia em bombeiros.funcao.';

insert into funcoes_bombeiro (nome) values
  ('Bombeiro Civil'),
  ('Bombeiro Civil Líder'),
  ('Supervisora de Brigada');

alter table bombeiros drop constraint if exists bombeiros_funcao_check;
alter table bombeiros add constraint bombeiros_funcao_fkey foreign key (funcao) references funcoes_bombeiro(nome);

alter table funcoes_bombeiro enable row level security;

create policy funcoes_bombeiro_staff_all on funcoes_bombeiro
  for all using (is_staff_ativo()) with check (is_staff_ativo());

-- 2) "Confirmação de escala pelo bombeiro via WhatsApp/app" — a parte
-- "app" (Portal, sem depender do provedor de WhatsApp ainda não
-- escolhido pelo cliente) dá pra fazer agora. Coluna já estava prevista
-- desde o planejamento inicial (ver TODO em supabase/migrations/0001_auth.sql:
-- "Fase E: policy de leitura em escalas... + coluna status_confirmacao"),
-- só nunca tinha sido criada.
alter table escalas add column status_confirmacao text not null default 'pendente'
  check (status_confirmacao in ('pendente', 'confirmado'));

comment on column escalas.status_confirmacao is 'Bombeiro confirma presença pelo Portal (/portal/escala) — visível pro staff na ficha do evento.';
