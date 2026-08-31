-- Achado real testando: um bombeiro escalado como titular apareceu
-- também na lista de reserva do mesmo evento/data/turno — o índice
-- da migração 0007 só impedia titular+titular, não titular+reserva
-- pro mesmo bombeiro. Não faz sentido: quem já está escalado pra
-- trabalhar o turno não pode também ser o "plano B" daquele mesmo
-- turno.
--
-- Correção: substitui o índice parcial (só tipo='titular') por um
-- índice único cobrindo a tabela inteira — um bombeiro só pode ter
-- UMA linha de escala por (data, turno), seja titular ou reserva,
-- independente do evento.
drop index if exists escalas_titular_sem_conflito;

create unique index if not exists escalas_bombeiro_sem_conflito
  on escalas (bombeiro_id, data, turno);
