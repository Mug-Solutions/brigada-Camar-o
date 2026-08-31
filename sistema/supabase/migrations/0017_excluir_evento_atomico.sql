-- CRUD de evento (editar/excluir): achado real de revisão de
-- segurança (HIGH + MEDIUM) na primeira versão de excluirEvento
-- (src/app/(admin)/eventos/[id]/actions.ts) — checar
-- eventos_financeiro e só depois apagar em duas idas ao banco
-- separadas abre uma janela de corrida (TOCTOU), e o guard em si era
-- burlável sem corrida nenhuma: bastava reverter o status de
-- pago/recebido pra 'Pendente' em /financeiro (ação já permitida a
-- qualquer staff, sem trilha nenhuma) e excluir logo em seguida —
-- nenhuma das duas ações sozinha é um bug, mas a combinação derrota o
-- bloqueio por completo.
--
-- Resolvido com uma function que faz checagem + DELETE no mesmo
-- statement (atômico por natureza) e usa uma segunda camada de
-- evidência bem mais difícil de reverter com um clique: se qualquer
-- turno desse evento já teve `horario_cumprido` preenchido, existe
-- prova de trabalho de verdade e a exclusão é bloqueada mesmo que o
-- status financeiro tenha sido revertido depois. Isso não é uma
-- trilha de auditoria completa (fica como risco residual documentado
-- em decisoes-tecnicas.md) — é a camada de proteção que dá pra
-- entregar agora sem construir um sistema de auditoria novo.
create or replace function excluir_evento_se_permitido(p_evento_id uuid) returns boolean
language plpgsql as $$
declare
  linha_apagada uuid;
begin
  delete from eventos
  where id = p_evento_id
    and not exists (
      select 1 from eventos_financeiro
      where evento_id = p_evento_id
        and (pago_bombeiros_status = 'Pago' or recebido_cliente_status = 'Recebido')
    )
    and not exists (
      select 1 from escalas
      where evento_id = p_evento_id and horario_cumprido is not null
    )
  returning id into linha_apagada;

  return linha_apagada is not null;
end;
$$;

comment on function excluir_evento_se_permitido is 'DELETE atômico de evento — bloqueia se há pagamento/recebimento fechado (eventos_financeiro) ou ponto já registrado em algum turno (escalas.horario_cumprido). Só chamada por excluirEvento (Server Action com service-role, já protegida por requireStaff()) — nunca pelo navegador do bombeiro/staff diretamente.';

-- Sem isso, EXECUTE fica liberado pra PUBLIC por padrão (mesmo achado
-- já corrigido em contagem_titulares_evento, migração 0016) — e aqui
-- seria bem mais grave: essa function nem checa se quem chamou é
-- staff (isso é feito só na Server Action que a invoca), então sem o
-- revoke/grant abaixo, qualquer requisição com a anon key pública já
-- embutida no bundle do navegador conseguiria apagar um evento via
-- `.rpc()` direto, pulando requireStaff() por completo.
revoke all on function excluir_evento_se_permitido(uuid) from public;
grant execute on function excluir_evento_se_permitido(uuid) to service_role;
