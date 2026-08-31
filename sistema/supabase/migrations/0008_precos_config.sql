-- Fase 1 do roadmap (núcleo operacional), último item: "régua de
-- preços configurável". Os valores de diária por turno e o valor de
-- alimentação estavam fixos em src/lib/constants.ts — esta tabela
-- vira a fonte de verdade, editável pela coordenação em /precos.
create table if not exists precos_config (
  chave      text primary key,
  valor      numeric(10,2) not null check (valor >= 0),
  descricao  text not null,
  updated_at timestamptz not null default now()
);

comment on table precos_config is 'Régua de preços configurável (diárias por turno, alimentação) — antes fixa no código.';

insert into precos_config (chave, valor, descricao) values
  ('turno_diurno',   150, 'Diária — Turno Diurno (08:00–18:00)'),
  ('turno_noturno',  135, 'Diária — Turno Noturno (18:00–00:00)'),
  ('turno_especial', 280, 'Diária — Turno Especial (08:00–20:00)'),
  ('alimentacao_dia', 20, 'Alimentação por dia')
on conflict (chave) do nothing;

alter table precos_config enable row level security;

create policy precos_config_staff_all on precos_config
  for all using (is_staff_ativo()) with check (is_staff_ativo());
