-- ============================================================
-- Brigada Camarão — Migração 0002: Autocadastro do Bombeiro
-- Fase B do plano de construção do Portal do Bombeiro.
--
-- Como aplicar: cole este arquivo no SQL Editor do seu projeto
-- Supabase, DEPOIS de já ter aplicado 0001_auth.sql.
--
-- ⚠️ CONFIGURAÇÃO MANUAL OBRIGATÓRIA no painel do Supabase:
--    Authentication → Providers → Email → desligar "Confirm email".
--    O vínculo do autocadastro (trigger abaixo) roda no INSERT em
--    auth.users, então funciona independente disso — mas a Server
--    Action (src/app/cadastro/actions.ts) espera uma SESSÃO ativa
--    logo após o signUp() para conferir se o vínculo deu certo e
--    mostrar a mensagem certa ao bombeiro. Com "Confirm email" ligado,
--    o Supabase não abre sessão até o clique no e-mail, e o fluxo
--    trava numa mensagem genérica de "confirme seu e-mail" em vez de
--    dizer se o CPF/telefone bateu ou não. Decisão registrada em
--    docs/decisoes-tecnicas.md.
-- ============================================================

-- ── LIMITE DE TENTATIVAS (mitiga força bruta na pré-checagem) ──
-- bombeiro_disponivel_para_cadastro precisa ser chamável por `anon`
-- (roda antes de existir sessão) e é acessível direto pela API REST
-- pública do Supabase, não só pelo formulário do app. Sem limite,
-- alguém que já soubesse um CPF válido (vazamentos de CPF fora do
-- sistema são comuns) poderia tentar forçar o telefone por tentativa e
-- erro. 5 tentativas por CPF a cada 15 minutos é suficiente pra um
-- usuário real errar a máscara do telefone algumas vezes sem travar,
-- e pequeno demais pra sustentar força bruta.
create table if not exists cadastro_tentativas (
  chave        text primary key, -- CPF só com dígitos
  tentativas   int not null default 0,
  janela_inicio timestamptz not null default now()
);

comment on table cadastro_tentativas is 'Rate limit de bombeiro_disponivel_para_cadastro por CPF — 5 tentativas / 15min.';

-- ── PRÉ-CHECAGEM (chamável antes do signUp, sem sessão) ────────
-- Só devolve um de 3 estados — nunca dados do bombeiro — para não
-- expor a base. Combinar CPF + telefone corretos ao mesmo tempo (a
-- query abaixo usa AND, não checa cada campo separadamente) impede
-- descobrir qual dos dois campos está errado; ver decisão registrada
-- em docs/decisoes-tecnicas.md sobre esse trade-off.
create or replace function bombeiro_disponivel_para_cadastro(p_cpf text, p_telefone text)
returns text -- 'disponivel' | 'ja_vinculado' | 'nao_encontrado'
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf_norm text := regexp_replace(p_cpf, '\D', '', 'g');
  v_bombeiro_id uuid;
  v_tentativas int;
  v_janela timestamptz;
begin
  select tentativas, janela_inicio into v_tentativas, v_janela
  from cadastro_tentativas where chave = v_cpf_norm
  for update;

  if not found then
    insert into cadastro_tentativas (chave, tentativas, janela_inicio) values (v_cpf_norm, 1, now());
  elsif now() - v_janela > interval '15 minutes' then
    update cadastro_tentativas set tentativas = 1, janela_inicio = now() where chave = v_cpf_norm;
  elsif v_tentativas >= 5 then
    -- Não diferencia de "não encontrado" de propósito — não dá pra
    -- quem está tentando saber se bateu no limite ou só errou o dado.
    return 'nao_encontrado';
  else
    update cadastro_tentativas set tentativas = tentativas + 1 where chave = v_cpf_norm;
  end if;

  select id into v_bombeiro_id
  from bombeiros
  where regexp_replace(cpf, '\D', '', 'g') = v_cpf_norm
    and telefone is not null
    and regexp_replace(telefone, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g')
  limit 1;

  if v_bombeiro_id is null then
    return 'nao_encontrado';
  end if;

  if exists (select 1 from usuarios where bombeiro_id = v_bombeiro_id) then
    return 'ja_vinculado';
  end if;

  return 'disponivel';
end;
$$;

revoke all on function bombeiro_disponivel_para_cadastro(text, text) from public;
grant execute on function bombeiro_disponivel_para_cadastro(text, text) to anon, authenticated;

-- ── ÍNDICE ÚNICO: garante 1 login por bombeiro no nível do banco ──
-- Sem isso, dois signUp() concorrentes com o mesmo CPF+telefone podem
-- ambos passar pelo "not exists" da trigger abaixo antes de qualquer
-- um confirmar (Postgres READ COMMITTED não torna select+insert
-- atômico sozinho) e gerar duas contas vinculadas ao mesmo bombeiro.
-- Esse índice faz o Postgres recusar a segunda inserção não importa a
-- ordem de execução — é ele, não a trigger, quem realmente fecha a
-- corrida (achado do security-reviewer; comentário anterior estava
-- errado ao atribuir isso só à trigger).
create unique index if not exists usuarios_bombeiro_unico
  on usuarios(bombeiro_id) where papel = 'bombeiro';

-- ── VÍNCULO REAL (trigger, roda no INSERT de auth.users) ───────
-- Fonte da verdade do vínculo — a pré-checagem acima é só UX. Repete a
-- mesma busca e só vincula se, na hora, o CPF+telefone baterem. Se
-- perder a corrida contra outro signUp concorrente para o mesmo
-- bombeiro, o índice único acima rejeita o insert com unique_violation
-- — capturado abaixo para não abortar a criação da conta de login (só
-- o vínculo falha, igual ao caso de "não encontrado"). Sem
-- correspondência (ou corrida perdida): a conta de login é criada
-- mesmo assim, mas sem linha em `usuarios` — já tratado como "não
-- autorizado" em qualquer rota protegida (ver src/proxy.ts) e na
-- Server Action de login.
create or replace function handle_new_bombeiro_signup() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := new.raw_user_meta_data->>'cpf';
  v_telefone text := new.raw_user_meta_data->>'telefone';
  v_bombeiro_id uuid;
begin
  -- Sem cpf/telefone nos metadados: não é um autocadastro de bombeiro
  -- (ex.: conta staff criada direto no painel do Supabase). Não faz nada.
  if v_cpf is null or v_telefone is null then
    return new;
  end if;

  select id into v_bombeiro_id
  from bombeiros
  where regexp_replace(cpf, '\D', '', 'g') = regexp_replace(v_cpf, '\D', '', 'g')
    and telefone is not null
    and regexp_replace(telefone, '\D', '', 'g') = regexp_replace(v_telefone, '\D', '', 'g')
  limit 1;

  if v_bombeiro_id is not null then
    begin
      insert into usuarios (auth_id, nome, papel, bombeiro_id, ativo)
      select new.id, b.nome, 'bombeiro', b.id, false
      from bombeiros b
      where b.id = v_bombeiro_id;
    exception when unique_violation then
      -- Perdeu a corrida (ver comentário do índice usuarios_bombeiro_unico
      -- acima) — segue sem vínculo, não aborta a criação da conta.
      null;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_bombeiro on auth.users;
create trigger on_auth_user_created_bombeiro
  after insert on auth.users
  for each row execute function handle_new_bombeiro_signup();

-- ============================================================
-- TODO (próxima migração — Fase D): RLS de bombeiro_documentos.
-- ============================================================
