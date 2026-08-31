-- Fase 7 do roadmap (itens desejáveis), segundo item: "bombeiro
-- visualiza e se candidata a eventos em aberto". Candidatura é só uma
-- manifestação de interesse — quem de fato vira escala (data/turno
-- específicos) é decidido pelo staff depois, pela tela já existente
-- de "Escalar bombeiro" em /eventos/[id].
create table candidaturas (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  bombeiro_id uuid not null references bombeiros(id) on delete cascade,
  status      text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada')),
  criado_em   timestamptz not null default now(),
  revisado_em timestamptz,
  revisado_por uuid references usuarios(id)
);

comment on table candidaturas is 'Bombeiro manifesta interesse num evento com vagas em aberto — staff aceita (sinaliza pra escalar) ou recusa.';

-- 1 candidatura por bombeiro+evento — evita reenvio duplicado.
create unique index candidaturas_unica on candidaturas(evento_id, bombeiro_id);

create index idx_candidaturas_evento on candidaturas(evento_id);
create index idx_candidaturas_bombeiro on candidaturas(bombeiro_id);

alter table candidaturas enable row level security;

-- Bombeiro só lê as próprias candidaturas — escrita (candidatar-se)
-- roda via Server Action com service-role, escopada à sessão, mesmo
-- padrão de disponibilidades/solicitacoes_documento/notificacoes.
create policy candidaturas_bombeiro_self_select on candidaturas
  for select using (bombeiro_id = bombeiro_id_da_sessao());

-- Contagem de titulares via SECURITY DEFINER: a policy abaixo roda com
-- o role do bombeiro autenticado, e uma subquery comum em `escalas`
-- dentro do `using` de outra tabela AINDA sofre a RLS de `escalas`
-- (escalas_bombeiro_self_select, migração 0012, restringe a
-- bombeiro_id = bombeiro_id_da_sessao()) — sem isso a contagem só
-- enxergaria a própria linha do bombeiro (0 ou 1), nunca o total real
-- de titulares do evento. A function expõe só o número agregado,
-- nunca as linhas de escalas de outros bombeiros. `set search_path`
-- fixo evita hijack de schema (boa prática padrão pra security definer).
create or replace function contagem_titulares_evento(p_evento_id uuid) returns bigint
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*) from escalas
  where escalas.evento_id = p_evento_id and escalas.tipo = 'titular';
$$;

comment on function contagem_titulares_evento is 'Conta titulares de um evento ignorando a RLS de escalas — usada só por eventos_bombeiro_vagas_abertas_select, expõe apenas a contagem, nunca as linhas.';

-- Sem isso, o Postgres concede EXECUTE a PUBLIC por padrão em toda
-- function nova — e o PostgREST expõe qualquer function do schema
-- public como endpoint RPC pra qualquer role com EXECUTE, inclusive
-- `anon` (não autenticado). Sem o revoke/grant abaixo, um chamador
-- sem sessão nenhuma poderia chamar contagem_titulares_evento(uuid)
-- via RPC direto pra qualquer evento_id que já soubesse/adivinhasse
-- (não só os Confirmados com vaga aberta) e ler a contagem de
-- titulares mesmo de um evento em Planejamento, contornando a RLS que
-- essa mesma function foi desenhada pra respeitar do lado de fora.
-- Mesmo padrão já usado em bombeiro_disponivel_para_cadastro (migração
-- 0002). Só `authenticated`, não `anon` — essa function só existe pra
-- apoiar a policy usada por bombeiro logado.
revoke all on function contagem_titulares_evento(uuid) from public;
grant execute on function contagem_titulares_evento(uuid) to authenticated;

-- Bombeiro só enxerga eventos Confirmado com vaga de titular aberta
-- (quantitativo_bombeiros ainda não preenchido) — política adicional
-- à já existente eventos_bombeiro_self_select (migração 0012), que só
-- libera evento em que o bombeiro já tem escala. Policies de RLS se
-- combinam com OR, então isso só amplia acesso, nunca restringe: o
-- limite de status='Confirmado' (não Planejamento) já vinha da
-- correção do achado HIGH da migração 0012 e continua valendo aqui.
create policy eventos_bombeiro_vagas_abertas_select on eventos
  for select using (
    status = 'Confirmado'
    and contagem_titulares_evento(id) < quantitativo_bombeiros
  );
