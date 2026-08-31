-- Fase 1 do roadmap (núcleo operacional), item Escala: "montagem
-- manual, lista de reserva". `escalas` não distinguia titular de
-- reserva — adiciona essa distinção.
alter table escalas
  add column if not exists tipo text not null default 'titular'
    check (tipo in ('titular','reserva'));

-- Um bombeiro não pode estar escalado como titular duas vezes no
-- mesmo turno/dia — conflito real de agenda (não dá pra estar em dois
-- eventos ao mesmo tempo). Reservas podem se sobrepor livremente
-- (é backup, não ocupa o turno de fato) — por isso o índice único é
-- parcial, só sobre tipo='titular', mesmo padrão de índice único
-- condicional já usado em solicitacoes_cadastro (migração 0004).
create unique index if not exists escalas_titular_sem_conflito
  on escalas (bombeiro_id, data, turno)
  where tipo = 'titular';
