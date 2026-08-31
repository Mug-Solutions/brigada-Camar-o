-- Fecha um gap essencial real do PRD (resposta da cliente, seção
-- "Bombeiros — Cadastro & Compliance"): "[Essencial] Anexo/upload de
-- documentos (ASO, credenciamento, cursos)". Até agora o sistema só
-- rastreava a DATA de validade (bombeiros.aso_data/credenciamento_data,
-- usada no alerta e no bloqueio automático de escalação) — nunca o
-- arquivo em si. Esta migração adiciona o arquivo sem mexer em nada do
-- que já existe: validade continua vindo só de bombeiros.*_data.
insert into storage.buckets (id, name, public)
values ('documentos-bombeiros', 'documentos-bombeiros', false)
on conflict (id) do nothing;

create table bombeiro_documentos (
  id             uuid primary key default gen_random_uuid(),
  bombeiro_id    uuid not null references bombeiros(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('aso', 'credenciamento', 'curso')),
  storage_path   text not null,
  nome_arquivo   text not null,
  tamanho_bytes  integer not null,
  enviado_em     timestamptz not null default now(),
  enviado_por    uuid references usuarios(id)
);

comment on table bombeiro_documentos is 'Arquivo anexado (ASO/credenciamento/curso) — o arquivo em si, no Storage; a validade continua em bombeiros.aso_data/credenciamento_data (não mexido aqui). "curso" não tem data de validade associada, é só arquivo.';

create index idx_bombeiro_documentos_bombeiro on bombeiro_documentos(bombeiro_id);

alter table bombeiro_documentos enable row level security;

-- Mesmo padrão de disponibilidades/solicitacoes_documento/candidaturas:
-- bombeiro só lê as próprias linhas via RLS; toda escrita (upload) roda
-- por Server Action com service-role, escopada à sessão — sem policy
-- de insert/update/delete de propósito.
create policy bombeiro_documentos_self_select on bombeiro_documentos
  for select using (bombeiro_id = bombeiro_id_da_sessao());

-- Bucket 'documentos-bombeiros' é privado (public=false) e, como
-- storage.objects já vem com RLS ligado por padrão no Supabase, não
-- criar NENHUMA policy pra ele significa acesso zero pra anon/authenticated
-- — só a service-role key (usada em toda Server Action deste fluxo,
-- tanto upload quanto geração de signed URL) consegue ler/escrever.
-- Documento de compliance é dado sensível; melhor não ter superfície de
-- acesso direto do navegador nenhuma do que ter uma policy mal escrita.
