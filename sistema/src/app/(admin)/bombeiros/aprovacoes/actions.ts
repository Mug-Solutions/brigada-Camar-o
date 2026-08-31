"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff, getSessionUsuario } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria";

async function guardStaffOuRedireciona() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");
}

/**
 * Etapa 1 do fluxo: o admin autoriza um e-mail a se cadastrar, antes
 * de qualquer dado pessoal existir. Só quem recebe esse convite
 * consegue chegar no formulário de dados (src/app/completar-cadastro) —
 * um link vazado não serve pra mais ninguém.
 */
export async function convidarBombeiro(formData: FormData): Promise<void> {
  await guardStaffOuRedireciona();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/bombeiros/aprovacoes?erro=1");

  const supabase = createServerSupabaseClient();

  // Checagem prévia amigável — a proteção de verdade é o índice único
  // `solicitacoes_cadastro_auth_id_ativo` (migração 0004); isso só evita
  // gastar um envio de convite quando já dá pra saber de antemão que
  // vai falhar (achado do security-reviewer: convidar o mesmo e-mail
  // duas vezes enquanto a primeira solicitação ainda está em aberto
  // travava o convite legítimo até alguém arrumar direto no banco).
  const { data: jaConvidado } = await supabase
    .from("solicitacoes_cadastro")
    .select("id")
    .eq("email", email)
    .in("status", ["convidado", "pendente"])
    .maybeSingle();
  if (jaConvidado) {
    redirect("/bombeiros/aprovacoes?erro=ja_convidado");
  }

  const { data: convite, error: conviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.SITE_URL ?? "http://localhost:3000"}/convite`,
  });
  if (conviteError || !convite.user) {
    console.error("[convidarBombeiro] falha ao enviar convite", { email, erro: conviteError });
    redirect("/bombeiros/aprovacoes?erro=convite");
  }

  const { error: insertError } = await supabase.from("solicitacoes_cadastro").insert({
    auth_id: convite.user.id,
    email,
    status: "convidado",
  });

  if (insertError) {
    // Convite já saiu mas não conseguimos registrar — desfaz a conta
    // pra não deixar um convite "invisível" pro admin, sem jeito de
    // acompanhar nem reenviar. Cobre inclusive a corrida rara de dois
    // convites pro mesmo e-mail passando pela checagem prévia quase ao
    // mesmo tempo — o índice único pega isso e cai aqui.
    const { error: rollbackError } = await supabase.auth.admin.deleteUser(convite.user.id);
    if (rollbackError) {
      console.error("[convidarBombeiro] ROLLBACK FALHOU — convite ficou órfão, precisa de intervenção manual", {
        email,
        authId: convite.user.id,
        erroOriginal: insertError,
        erroRollback: rollbackError,
      });
    }
    if (insertError.code === "23505") {
      redirect("/bombeiros/aprovacoes?erro=ja_convidado");
    }
    redirect("/bombeiros/aprovacoes?erro=1");
  }

  revalidatePath("/bombeiros/aprovacoes");
}

/**
 * Etapa 4: cria o cadastro real e libera o acesso. O convite (etapa 1)
 * já é um fato consumado nesse ponto — não chama mais inviteUserByEmail
 * aqui, só promove os dados que o bombeiro já enviou.
 */
export async function aprovarSolicitacao(formData: FormData): Promise<void> {
  await guardStaffOuRedireciona();

  const solicitacaoId = String(formData.get("solicitacao_id") ?? "");
  if (!solicitacaoId) redirect("/bombeiros/aprovacoes?erro=1");

  const supabase = createServerSupabaseClient();

  const { data: solicitacao, error: buscaError } = await supabase
    .from("solicitacoes_cadastro")
    .select("*")
    .eq("id", solicitacaoId)
    .eq("status", "pendente")
    .maybeSingle();

  if (buscaError || !solicitacao || !solicitacao.auth_id) redirect("/bombeiros/aprovacoes?erro=1");

  const { data: bombeiro, error: bombeiroError } = await supabase
    .from("bombeiros")
    .insert({
      nome: solicitacao.nome,
      cpf: solicitacao.cpf,
      telefone: solicitacao.telefone,
      funcao: solicitacao.funcao,
      aso_data: solicitacao.aso_data,
      esocial_matricula: solicitacao.esocial_matricula,
      credenciamento_data: solicitacao.credenciamento_data,
      chave_pix: solicitacao.chave_pix,
    })
    .select("id")
    .single();

  if (bombeiroError || !bombeiro) {
    console.error("[aprovarSolicitacao] falha ao criar bombeiro", { solicitacaoId, erro: bombeiroError });
    redirect("/bombeiros/aprovacoes?erro=1");
  }

  const sessao = await getSessionUsuario();
  const revisorId = sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;

  const { error: usuarioError } = await supabase.from("usuarios").insert({
    auth_id: solicitacao.auth_id,
    nome: solicitacao.nome,
    papel: "bombeiro",
    bombeiro_id: bombeiro.id,
    ativo: true,
  });

  if (usuarioError) {
    const { error: rollbackError } = await supabase.from("bombeiros").delete().eq("id", bombeiro.id);
    if (rollbackError) {
      console.error(
        "[aprovarSolicitacao] ROLLBACK FALHOU — bombeiro criado sem usuario vinculado, precisa de intervenção manual",
        { solicitacaoId, bombeiroId: bombeiro.id, erroOriginal: usuarioError, erroRollback: rollbackError }
      );
    } else {
      console.error("[aprovarSolicitacao] falha ao vincular usuario, bombeiro desfeito", {
        solicitacaoId,
        erro: usuarioError,
      });
    }
    redirect("/bombeiros/aprovacoes?erro=1");
  }

  // Escopado a status='pendente' de novo (não só o id): se alguém
  // recusou essa mesma solicitação entre a busca lá em cima e agora
  // (dois staff clicando quase junto), essa checagem impede reescrever
  // 'recusado' de volta pra 'aprovado' por cima — achado do
  // security-reviewer.
  const { data: statusAtualizado, error: statusError } = await supabase
    .from("solicitacoes_cadastro")
    .update({ status: "aprovado", revisado_em: new Date().toISOString(), revisado_por: revisorId })
    .eq("id", solicitacaoId)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();

  if (statusError || !statusAtualizado) {
    // Bombeiro/usuario já existem e funcionam — só a etiqueta não
    // acompanhou. Não desfaz nada (apagaria acesso de alguém já
    // aprovado de verdade), só loga alto pra corrigir manualmente.
    console.error("[aprovarSolicitacao] bombeiro/usuario criados mas status da solicitação não fechou em 'aprovado'", {
      solicitacaoId,
      erro: statusError,
      conflito: !statusAtualizado && !statusError,
    });
  }

  await registrarAuditoria({
    supabase,
    usuarioId: revisorId,
    tabela: "solicitacoes_cadastro",
    registroId: solicitacaoId,
    acao: "aprovar",
    valorDepois: { bombeiro_id: bombeiro.id },
  });

  revalidatePath("/bombeiros/aprovacoes");
  revalidatePath("/bombeiros");
}

/**
 * Recusa em qualquer estágio (convidado, antes do bombeiro preencher
 * dados; ou pendente, depois). Sempre apaga a conta — o `auth_id` vem
 * da própria linha buscada no servidor, nunca de um campo de
 * formulário (é a correção do CRITICAL encontrado numa rodada
 * anterior — ver docs/decisoes-tecnicas.md).
 */
export async function recusarSolicitacao(formData: FormData): Promise<void> {
  await guardStaffOuRedireciona();

  const solicitacaoId = String(formData.get("solicitacao_id") ?? "");
  if (!solicitacaoId) redirect("/bombeiros/aprovacoes?erro=1");

  const supabase = createServerSupabaseClient();

  const { data: solicitacao, error: buscaError } = await supabase
    .from("solicitacoes_cadastro")
    .select("id, auth_id, status")
    .eq("id", solicitacaoId)
    .in("status", ["convidado", "pendente"])
    .maybeSingle();

  if (buscaError || !solicitacao) redirect("/bombeiros/aprovacoes?erro=1");

  if (solicitacao.auth_id) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(solicitacao.auth_id);
    if (deleteError) {
      console.error("[recusarSolicitacao] falha ao apagar a conta do convite", {
        solicitacaoId,
        authId: solicitacao.auth_id,
        erro: deleteError,
      });
      redirect("/bombeiros/aprovacoes?erro=1");
    }
  }

  const sessao = await getSessionUsuario();
  const revisorId = sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;

  const { error } = await supabase
    .from("solicitacoes_cadastro")
    .update({ status: "recusado", revisado_em: new Date().toISOString(), revisado_por: revisorId })
    .eq("id", solicitacaoId);

  if (error) redirect("/bombeiros/aprovacoes?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: revisorId,
    tabela: "solicitacoes_cadastro",
    registroId: solicitacaoId,
    acao: "recusar",
  });

  revalidatePath("/bombeiros/aprovacoes");
}

const COLUNA_POR_TIPO_DOCUMENTO: Record<string, "aso_data" | "credenciamento_data"> = {
  aso: "aso_data",
  credenciamento: "credenciamento_data",
};

/**
 * Decisão do cliente (por ora): atualização de documento pelo bombeiro
 * só passa a valer com aprovação da coordenação — mesma lógica do
 * autocadastro inicial. `bombeiro_id`/`tipo_documento`/`data_nova`
 * vêm da própria solicitação buscada no servidor, nunca de um campo
 * de formulário.
 */
export async function aprovarAtualizacaoDocumento(formData: FormData): Promise<void> {
  await guardStaffOuRedireciona();

  const solicitacaoId = String(formData.get("solicitacao_id") ?? "");
  if (!solicitacaoId) redirect("/bombeiros/aprovacoes?erro=1");

  const supabase = createServerSupabaseClient();

  const { data: solicitacao, error: buscaError } = await supabase
    .from("solicitacoes_documento")
    .select("*")
    .eq("id", solicitacaoId)
    .eq("status", "pendente")
    .maybeSingle();

  if (buscaError || !solicitacao) redirect("/bombeiros/aprovacoes?erro=1");

  const coluna = COLUNA_POR_TIPO_DOCUMENTO[solicitacao.tipo_documento];
  if (!coluna) redirect("/bombeiros/aprovacoes?erro=1");

  const { error: bombeiroError } = await supabase
    .from("bombeiros")
    .update({ [coluna]: solicitacao.data_nova })
    .eq("id", solicitacao.bombeiro_id);

  if (bombeiroError) {
    console.error("[aprovarAtualizacaoDocumento] falha ao atualizar documento do bombeiro", {
      solicitacaoId,
      erro: bombeiroError,
    });
    redirect("/bombeiros/aprovacoes?erro=1");
  }

  const sessao = await getSessionUsuario();
  const revisorId = sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;

  const { data: statusAtualizado, error: statusError } = await supabase
    .from("solicitacoes_documento")
    .update({ status: "aprovado", revisado_em: new Date().toISOString(), revisado_por: revisorId })
    .eq("id", solicitacaoId)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();

  if (statusError || !statusAtualizado) {
    // Documento já foi atualizado e funciona — só a etiqueta da
    // solicitação não acompanhou. Mesmo raciocínio de aprovarSolicitacao:
    // não desfaz o que já é fato consumado, só loga alto.
    console.error(
      "[aprovarAtualizacaoDocumento] documento atualizado mas status da solicitação não fechou em 'aprovado'",
      { solicitacaoId, erro: statusError }
    );
  }

  await registrarAuditoria({
    supabase,
    usuarioId: revisorId,
    tabela: "solicitacoes_documento",
    registroId: solicitacaoId,
    acao: "aprovar",
    valorDepois: { tipo_documento: solicitacao.tipo_documento, data_nova: solicitacao.data_nova },
  });

  revalidatePath("/bombeiros/aprovacoes");
  revalidatePath("/bombeiros");
}

export async function recusarAtualizacaoDocumento(formData: FormData): Promise<void> {
  await guardStaffOuRedireciona();

  const solicitacaoId = String(formData.get("solicitacao_id") ?? "");
  if (!solicitacaoId) redirect("/bombeiros/aprovacoes?erro=1");

  const supabase = createServerSupabaseClient();
  const sessao = await getSessionUsuario();
  const revisorId = sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;

  const { data, error } = await supabase
    .from("solicitacoes_documento")
    .update({ status: "recusado", revisado_em: new Date().toISOString(), revisado_por: revisorId })
    .eq("id", solicitacaoId)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();

  if (error || !data) redirect("/bombeiros/aprovacoes?erro=1");

  await registrarAuditoria({
    supabase,
    usuarioId: revisorId,
    tabela: "solicitacoes_documento",
    registroId: solicitacaoId,
    acao: "recusar",
  });

  revalidatePath("/bombeiros/aprovacoes");
}
