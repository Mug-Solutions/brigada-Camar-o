-- Achado real testando: delay perceptível ao trocar de menu. Causa:
-- src/proxy.ts (roda em toda navegação pra rota protegida) faz DUAS
-- chamadas de rede em sequência — supabase.auth.getUser() (validação
-- de sessão, obrigatória) e depois uma consulta em `usuarios` só pra
-- saber papel/ativo. A segunda é sempre a mesma pergunta ("esse
-- usuário é staff ativo? bombeiro ativo?"), repetida a cada clique.
--
-- Custom Access Token Hook (recurso nativo do Supabase Auth): uma
-- function que roda quando o token é emitido/renovado e embute
-- papel/ativo direto no JWT, em app_metadata. Com isso,
-- supabase.auth.getUser() já devolve essa informação junto — o
-- proxy.ts para de precisar da segunda chamada pra decidir acesso.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  usuario_papel text;
  usuario_ativo boolean;
begin
  select papel, ativo into usuario_papel, usuario_ativo
  from public.usuarios
  where auth_id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- Sem linha em `usuarios` (conta ainda não aprovada, ou convite
  -- ainda não completado) — grava papel nulo e ativo=false, nunca
  -- omite o campo: proxy.ts precisa distinguir "não tem acesso" de
  -- "token antigo sem essa claim ainda". IMPORTANTE: jsonb_set é uma
  -- function estrita — se o novo valor fosse SQL NULL (o que
  -- to_jsonb(usuario_papel) produz quando usuario_papel é NULL, não
  -- JSON null), a chamada inteira devolveria NULL e apagaria as
  -- outras claims do token (email, sub, etc.) pra qualquer conta sem
  -- linha em usuarios — achado real corrigido antes de aplicar, com
  -- coalesce garantindo sempre um jsonb de verdade, nunca SQL NULL.
  claims := jsonb_set(claims, '{app_metadata,papel}', coalesce(to_jsonb(usuario_papel), 'null'::jsonb));
  claims := jsonb_set(claims, '{app_metadata,ativo}', to_jsonb(coalesce(usuario_ativo, false)));

  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

comment on function public.custom_access_token_hook is 'Custom Access Token Hook do Supabase Auth — embute usuarios.papel/ativo no JWT pra evitar uma consulta a mais em toda navegação (ver src/proxy.ts). Precisa ser ativado manualmente em Authentication > Hooks no painel do Supabase, apontando pra esta function.';

-- O serviço de Auth do Supabase (GoTrue) chama esta function como o
-- role supabase_auth_admin, não como authenticated/anon — sem esses
-- grants explícitos, o hook falha silenciosamente e o login para de
-- funcionar. Mesma disciplina de sempre restringir EXECUTE ao mínimo
-- necessário (ver contagem_titulares_evento, migração 0016): ninguém
-- além do serviço de Auth deveria conseguir chamar isso.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- supabase_auth_admin também precisa conseguir LER usuarios de dentro
-- da function (RLS se aplica a qualquer role, mesmo dentro de uma
-- function SECURITY INVOKER como esta) — sem policy, o SELECT acima
-- devolveria sempre "não encontrado" e todo mundo perderia acesso.
grant select on public.usuarios to supabase_auth_admin;
create policy usuarios_auth_admin_select on public.usuarios
  for select
  to supabase_auth_admin
  using (true);
