-- ============================================================
-- Brigada Camarão — Migração 0029: preserva a ordem original dos turnos
--
-- Achado real do cliente: depois da migração 0028, os turnos passaram
-- a ser listados em ordem alfabética (Diurno, Especial, Noturno) — os
-- 3 turnos originais continuam com nome/horário/valor intactos
-- (confirmado direto no banco), só a ORDEM de exibição mudou (antes
-- era Diurno, Noturno, Especial, a ordem em que sempre apareceram em
-- src/lib/constants.ts). Corrige adicionando uma coluna de ordem
-- explícita em vez de depender de `order by nome`.
--
-- Turnos novos (criados pelo staff depois desta migração) recebem o
-- valor default (999) e aparecem depois dos 3 originais, em ordem
-- alfabética entre si — sem precisar que o staff escolha uma posição
-- manualmente.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001 a 0028.
-- ============================================================

alter table turnos_config add column ordem integer not null default 999;

update turnos_config set ordem = 1 where nome = 'Diurno';
update turnos_config set ordem = 2 where nome = 'Noturno';
update turnos_config set ordem = 3 where nome = 'Especial';

comment on column turnos_config.ordem is 'Ordem de exibição — os 3 turnos originais (Diurno/Noturno/Especial) mantêm a sequência com que sempre apareceram no sistema; turnos novos entram com o default (999, depois dos originais) e desempatam por nome.';
