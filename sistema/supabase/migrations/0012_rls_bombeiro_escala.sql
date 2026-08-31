-- Fase 2 do roadmap (Portal do Bombeiro): "visualização de escala
-- confirmada e histórico" — já previsto no TODO da migração 0001,
-- nunca implementado. Bombeiro lê só as próprias escalas, e só os
-- eventos em que ele de fato está escalado (não a lista inteira).

create policy escalas_bombeiro_self_select on escalas
  for select using (bombeiro_id = bombeiro_id_da_sessao());

-- status in ('Confirmado','Concluído'), não só 'Confirmado': a regra
-- em si já barra o bombeiro de ver evento em Planejamento (onde
-- valor_fechamento/cliente_id ainda são só uma proposta interna, não
-- fato consumado) — sem isso, o filtro "só mostra Confirmado" ficaria
-- só na tela (JS), e um POST direto no PostgREST com o próprio token
-- do bombeiro veria a linha inteira do evento, de qualquer status.
-- Inclui 'Concluído' de propósito: sem isso, o "histórico" (que
-- justamente lista eventos já concluídos) desapareceria pro bombeiro
-- no exato momento em que o staff fecha o evento.
create policy eventos_bombeiro_self_select on eventos
  for select using (
    status in ('Confirmado', 'Concluído')
    and exists (
      select 1 from escalas
      where escalas.evento_id = eventos.id
        and escalas.bombeiro_id = bombeiro_id_da_sessao()
    )
  );
