-- Custo do evento: soma do que é pago aos bombeiros escalados +
-- variação de materiais, que o staff ajusta manualmente (materiais
-- não tem um valor numérico rastreado no sistema ainda). NULL = staff
-- ainda não ajustou; a tela pré-preenche o campo com a soma calculada
-- das escalas, mas só grava aqui quando o staff salva de propósito.
alter table eventos
  add column if not exists custo_estimado numeric(12,2) check (custo_estimado is null or custo_estimado >= 0);
