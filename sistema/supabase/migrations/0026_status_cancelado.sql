-- ============================================================
-- Brigada Camarão — Migração 0026: Status "Cancelado" pra eventos
--
-- Até agora um evento em Confirmado só tinha dois destinos:
-- Concluído (aconteceu) ou Excluído (apagado do banco, bloqueado se
-- já tem pagamento fechado ou ponto registrado). Faltava um meio-termo
-- pra "não vai mais acontecer, mas não apaga o registro" — decisão do
-- cliente: evento em Planejamento continua sendo excluído; evento já
-- Confirmado agora pode ser excluído OU cancelado.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001 a 0025.
-- ============================================================

alter table eventos drop constraint if exists eventos_status_check;
alter table eventos add constraint eventos_status_check
  check (status in ('Planejamento','Confirmado','Concluído','Cancelado'));

comment on column eventos.status is 'Planejamento → Confirmado (aprovação de orçamento) → Concluído (aconteceu) ou Cancelado (não vai mais acontecer, só a partir de Confirmado — em Planejamento o evento é excluído, não cancelado). Cancelado é estado terminal, assim como Concluído.';

-- Ao cancelar um evento (Server Action cancelarEvento), turnos que já
-- têm horario_cumprido preenchido (prova real de trabalho) NÃO são
-- apagados — só os que ainda não aconteceram. Sem incluir 'Cancelado'
-- aqui, o bombeiro que já trabalhou um turno desses perderia a
-- visibilidade do nome/local do evento no próprio histórico
-- (/portal/escala) assim que o evento fosse cancelado, mesmo tendo
-- prova de trabalho registrada.
drop policy if exists eventos_bombeiro_self_select on eventos;
create policy eventos_bombeiro_self_select on eventos
  for select using (
    status in ('Confirmado', 'Concluído', 'Cancelado')
    and exists (
      select 1 from escalas
      where escalas.evento_id = eventos.id
        and escalas.bombeiro_id = bombeiro_id_da_sessao()
    )
  );
