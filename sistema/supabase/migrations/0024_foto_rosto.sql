-- ============================================================
-- Brigada Camarão — Migração 0024: Foto de rosto no autocadastro
-- Fecha um pedido real do cliente: identificação visual do bombeiro,
-- coletada no mesmo momento em que ele já preenche os próprios dados
-- em /completar-cadastro (etapa 3 do fluxo de convite por e-mail,
-- ver 0004_convite_por_email.sql).
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001 a 0023.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('fotos-bombeiros', 'fotos-bombeiros', false)
on conflict (id) do nothing;

alter table solicitacoes_cadastro
  add column foto_rosto_path text;

alter table bombeiros
  add column foto_rosto_path text;

comment on column solicitacoes_cadastro.foto_rosto_path is 'Caminho no bucket fotos-bombeiros (privado) da foto de rosto enviada em /completar-cadastro — path fixo "{auth_id}/rosto.{ext}", sobrescrito se o bombeiro reenviar. Copiado pra bombeiros.foto_rosto_path na aprovação.';
comment on column bombeiros.foto_rosto_path is 'Foto de rosto enviada no autocadastro, pra identificação visual do bombeiro pela coordenação.';

-- Mesmo padrão de segurança do bucket documentos-bombeiros (0018): bucket
-- privado (public=false), zero policy de storage.objects pra
-- anon/authenticated — só a service-role key (usada em toda Server
-- Action/rota deste fluxo) lê/escreve. Sem policy nenhuma é menos
-- superfície de ataque do que uma policy mal escrita pra dado sensível.
