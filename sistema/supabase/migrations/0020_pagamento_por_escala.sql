-- Folha de pagamento (/financeiro/[id]) ganha um check por turno pra
-- marcar quem já foi pago — granularidade da própria tela, que já
-- lista uma linha por escala (titular), não por bombeiro agregado.
-- Quando todo titular do evento estiver marcado, o status geral
-- (eventos_financeiro.pago_bombeiros_status) passa a 'Pago' sozinho —
-- ver marcarEscalaPaga em financeiro/[id]/actions.ts.
alter table escalas add column pago boolean not null default false;

comment on column escalas.pago is 'Marcado na folha de pagamento (/financeiro/[id]) — quando todo titular do evento está marcado, eventos_financeiro.pago_bombeiros_status vira "Pago" automaticamente.';

-- Achado real de revisão de segurança (MEDIUM): recalcular o status
-- ("todos pagos? então vira Pago") em JS, em três idas separadas ao
-- banco (ler escalas, ler status atual, decidir, escrever), tinha
-- TOCTOU real — uma mudança manual concorrente de status em /financeiro
-- (atualizarStatusPagamentoBombeiros) podia ser sobrescrita silenciosamente
-- se as duas ações lessem o status "antes" quase ao mesmo tempo. Mesmo
-- padrão de correção já usado em excluir_evento_se_permitido (migração
-- 0017): tudo dentro de uma function só, com `for update` travando a
-- linha de eventos_financeiro — qualquer outro escritor concorrente
-- daquela mesma linha (inclusive um upsert comum, que também trava a
-- linha via ON CONFLICT) espera essa function terminar antes de agir,
-- em vez de correr por cima.
create or replace function recalcular_status_pagamento_evento(p_evento_id uuid) returns text
language plpgsql as $$
declare
  todos_pagos boolean;
  status_atual text;
  novo_status text;
begin
  select bool_and(pago) into todos_pagos
  from escalas
  where evento_id = p_evento_id and tipo = 'titular';

  -- bool_and de um conjunto vazio (evento sem titular nenhum) retorna
  -- null, não true — trata como "não pago", nunca como "todo pago".
  todos_pagos := coalesce(todos_pagos, false);

  -- eventos_financeiro não ganha linha automática quando o evento é
  -- criado (mesmo comportamento já documentado em financeiro/actions.ts)
  -- — garante que a linha exista antes do `for update` travar ela.
  insert into eventos_financeiro (evento_id)
  values (p_evento_id)
  on conflict (evento_id) do nothing;

  select pago_bombeiros_status into status_atual
  from eventos_financeiro
  where evento_id = p_evento_id
  for update;

  if todos_pagos and status_atual is distinct from 'Pago' then
    novo_status := 'Pago';
  elsif not todos_pagos and status_atual = 'Pago' then
    novo_status := 'Pendente';
  else
    novo_status := null; -- nada muda (ex.: já é 'Pendente' e continua faltando gente, ou é 'Atrasado' e ninguém terminou de marcar)
  end if;

  if novo_status is not null then
    update eventos_financeiro
    set pago_bombeiros_status = novo_status,
        pago_bombeiros_data = case when novo_status = 'Pago' then current_date else null end
    where evento_id = p_evento_id;
  end if;

  return novo_status;
end;
$$;

comment on function recalcular_status_pagamento_evento is 'Recalcula eventos_financeiro.pago_bombeiros_status a partir de escalas.pago, atomicamente. Chamada só por marcarEscalaPaga (financeiro/[id]/actions.ts), depois de requireStaff() — nunca autoriza sozinha, por isso o revoke/grant abaixo.';

-- Mesmo raciocínio já aplicado em excluir_evento_se_permitido e
-- contagem_titulares_evento: essa function não checa "é staff?" (isso
-- é feito só na Server Action que a chama), então sem restringir
-- EXECUTE, qualquer requisição com a anon key pública do navegador
-- conseguiria mexer no status de pagamento via `.rpc()` direto.
revoke all on function recalcular_status_pagamento_evento(uuid) from public;
grant execute on function recalcular_status_pagamento_evento(uuid) to service_role;
