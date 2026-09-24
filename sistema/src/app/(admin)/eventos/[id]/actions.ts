"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionUsuario, requireStaff } from "@/lib/auth/session";
import { bombeiroAptidao } from "@/lib/domain";
import type { Bombeiro } from "@/lib/types";
import { validarDadosEvento } from "../validacao";
import { registrarAuditoria } from "@/lib/auditoria";
import { revalidarTelasFinanceiras } from "@/lib/revalidar-financeiro";
import { validarLinhaProgramacao } from "@/lib/documentos-cliente/dados";

export type EscalaFormState = { error: string | null };
export type EditarEventoState = { error: string | null };

/**
 * Montagem manual de escala. Bloqueio automático de bombeiro com
 * documentação vencida (item de Compliance do roadmap) é aplicado
 * aqui — é o único lugar em que "escalar alguém" de fato acontece —
 * usando bombeiroAptidao(), já existente desde a Fase B e pensada
 * exatamente para este uso (ver comentário em src/lib/domain.ts).
 */
export async function adicionarEscala(
  _prevState: EscalaFormState,
  formData: FormData
): Promise<EscalaFormState> {
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error };

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  const bombeiroId = String(formData.get("bombeiro_id") ?? "").trim();
  const data = String(formData.get("data") ?? "").trim();
  const turno = String(formData.get("turno") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "titular").trim();

  if (!eventoId || !bombeiroId || !data || !turno) {
    return { error: "Preencha bombeiro, data e turno." };
  }
  if (tipo !== "titular" && tipo !== "reserva") {
    return { error: "Tipo de escala inválido." };
  }

  const supabase = createServerSupabaseClient();

  const { data: evento, error: eventoError } = await supabase
    .from("eventos")
    .select("data_inicio, data_fim")
    .eq("id", eventoId)
    .maybeSingle();
  if (eventoError || !evento) return { error: "Evento não encontrado." };
  if (data < evento.data_inicio || data > evento.data_fim) {
    return { error: "A data precisa estar dentro do período do evento." };
  }

  // Re-checagem no servidor, não só no <select> do formulário — o
  // mesmo motivo pelo qual solicitacao_id/auth_id nunca vêm confiados
  // de um campo de formulário no restante do sistema (ver
  // decisoes-tecnicas.md sobre o CRITICAL corrigido em recusarSolicitacao).
  const { data: bombeiro, error: bombeiroError } = await supabase
    .from("bombeiros")
    .select("*")
    .eq("id", bombeiroId)
    .maybeSingle();
  if (bombeiroError || !bombeiro) return { error: "Bombeiro não encontrado." };
  if (bombeiroAptidao(bombeiro as Bombeiro).level === "crit") {
    return { error: "Este bombeiro está com documentação vencida e não pode ser escalado." };
  }

  // Re-checagem no servidor contra a tabela configurável
  // (turnos_config, migração 0028) — mesma disciplina de `funcao`:
  // não confia só no <select> do formulário. Essa consulta já valida
  // E precifica numa tacada só (preço mora em turnos_config.valor,
  // não mais numa chave separada em precos_config).
  const { data: turnoConfig } = await supabase
    .from("turnos_config")
    .select("valor")
    .eq("nome", turno)
    .eq("ativo", true)
    .maybeSingle();
  if (!turnoConfig) return { error: "Turno inválido." };
  const valorTurno = Number(turnoConfig.valor);

  const { error } = await supabase.from("escalas").insert({
    evento_id: eventoId,
    bombeiro_id: bombeiroId,
    data,
    turno,
    tipo,
    valor: valorTurno,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Esse bombeiro já está escalado (titular ou reserva) nesse turno." };
    }
    return { error: `Erro ao escalar: ${error.message}` };
  }

  // Também revalida /eventos (a lista mostra "X/Y escalados" e o custo
  // estimado, ambos derivados de escalas) e as telas financeiras — sem
  // isso, adicionar/remover um titular deixava Painel/Financeiro/DRE
  // presos no custo de antes (achado real testando: mesma causa do
  // "Concluído não atualizou o Painel").
  revalidatePath(`/eventos/${eventoId}`);
  revalidatePath("/eventos");
  revalidarTelasFinanceiras();
  return { error: null };
}

export async function removerEscala(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const escalaId = String(formData.get("escala_id") ?? "");
  const eventoId = String(formData.get("evento_id") ?? "");
  if (!escalaId || !eventoId) redirect(`/eventos/${eventoId}?erro=1`);

  const supabase = createServerSupabaseClient();
  // Escopado também a evento_id (não só o id da escala) — mesma
  // disciplina de "nunca confiar num id de formulário sozinho" já
  // usada em aprovarSolicitacao/recusarSolicitacao: um evento_id
  // que não bate com o dono real da escala falha fechado, em vez de
  // mexer silenciosamente na linha errada.
  const { data, error } = await supabase
    .from("escalas")
    .delete()
    .eq("id", escalaId)
    .eq("evento_id", eventoId)
    .select("id, bombeiro_id")
    .maybeSingle();
  if (error || !data) redirect(`/eventos/${eventoId}?erro=1`);

  // Achado real testando: cancelar a escala não desfazia a candidatura
  // que trouxe o bombeiro até ali. Sem isso, o evento nunca reaparecia
  // como "vaga aberta" pra esse bombeiro no Portal (candidaturas tem
  // índice único por evento+bombeiro — a linha antiga, mesmo com status
  // sobrando, bloqueava tanto uma nova candidatura quanto o botão
  // "Candidatar-se", que some pra quem já tem qualquer candidatura
  // registrada, seja qual for o status). Removendo a candidatura junto,
  // o bombeiro volta ao estado de "nunca se candidatou" e pode tentar
  // de novo. Não falha a ação inteira se isso der erro — a escala já
  // foi removida, que é o efeito principal pedido.
  const { error: candidaturaError } = await supabase
    .from("candidaturas")
    .delete()
    .eq("evento_id", eventoId)
    .eq("bombeiro_id", data.bombeiro_id);
  if (candidaturaError) {
    console.error("[removerEscala] falha ao limpar candidatura associada", {
      eventoId,
      bombeiroId: data.bombeiro_id,
      erro: candidaturaError,
    });
  }

  revalidatePath(`/eventos/${eventoId}`);
  revalidatePath("/eventos");
  revalidatePath("/portal/escala");
  revalidarTelasFinanceiras();
}

/**
 * Fase 7 do roadmap: staff decide sobre uma candidatura de bombeiro a
 * evento em aberto (src/app/portal/escala/actions.ts). "Aceitar" só
 * sinaliza a candidatura como aceita — não cria a escala sozinho,
 * porque candidatura não carrega data/turno/tipo específicos (o
 * bombeiro se candidata ao evento como um todo). Quem já foi aceito
 * mas ainda não tem escala aparece na seção "Pré-escalados" desta
 * mesma página (eventos/[id]/page.tsx), ordenado por prioridade de
 * aceitação (revisado_em) — dali o staff escolhe e usa o formulário
 * "Escalar bombeiro" pra data/turno de fato.
 */
export async function aceitarCandidatura(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const candidaturaId = String(formData.get("candidatura_id") ?? "");
  const eventoId = String(formData.get("evento_id") ?? "");
  if (!candidaturaId || !eventoId) redirect(`/eventos/${eventoId}?erro=1`);

  const supabase = createServerSupabaseClient();
  const sessao = await getSessionUsuario();
  const revisorId = sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;

  // Escopado a evento_id e ao status atual ('pendente') — mesma
  // disciplina de "nunca confiar num id de formulário sozinho" usada
  // em removerEscala/registrarPonto: evita reprocessar uma
  // candidatura já decidida por uma segunda submissão concorrente.
  const { data, error } = await supabase
    .from("candidaturas")
    .update({ status: "aceita", revisado_em: new Date().toISOString(), revisado_por: revisorId })
    .eq("id", candidaturaId)
    .eq("evento_id", eventoId)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(`/eventos/${eventoId}?erro=1`);

  await registrarAuditoria({
    supabase,
    usuarioId: revisorId,
    tabela: "candidaturas",
    registroId: candidaturaId,
    acao: "aprovar",
  });

  revalidatePath(`/eventos/${eventoId}`);
}

export async function recusarCandidatura(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const candidaturaId = String(formData.get("candidatura_id") ?? "");
  const eventoId = String(formData.get("evento_id") ?? "");
  if (!candidaturaId || !eventoId) redirect(`/eventos/${eventoId}?erro=1`);

  const supabase = createServerSupabaseClient();
  const sessao = await getSessionUsuario();
  const revisorId = sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined;

  const { data, error } = await supabase
    .from("candidaturas")
    .update({ status: "recusada", revisado_em: new Date().toISOString(), revisado_por: revisorId })
    .eq("id", candidaturaId)
    .eq("evento_id", eventoId)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(`/eventos/${eventoId}?erro=1`);

  await registrarAuditoria({
    supabase,
    usuarioId: revisorId,
    tabela: "candidaturas",
    registroId: candidaturaId,
    acao: "recusar",
  });

  revalidatePath(`/eventos/${eventoId}`);
}

/** Registro de ponto: horário efetivamente cumprido, preenchido pela
 * coordenação após o turno (o registro pelo próprio bombeiro, em
 * tempo real, é a tela de Portal ainda não construída — ver roadmap
 * Fase 2). */
export async function registrarPonto(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const escalaId = String(formData.get("escala_id") ?? "");
  const eventoId = String(formData.get("evento_id") ?? "");
  const horarioCumprido = String(formData.get("horario_cumprido") ?? "").trim();
  if (!escalaId || !eventoId) redirect(`/eventos/${eventoId}?erro=1`);

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("escalas")
    .update({ horario_cumprido: horarioCumprido || null })
    .eq("id", escalaId)
    .eq("evento_id", eventoId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(`/eventos/${eventoId}?erro=1`);

  revalidatePath(`/eventos/${eventoId}`);
}

/** CRUD do evento, item pedido depois de testar o fluxo de ponta a
 * ponta: staff precisa conseguir corrigir um evento cadastrado errado
 * (ou criado só de teste) sem recorrer a SQL direto. Mesma validação
 * de criarEvento (eventos/actions.ts), via validarDadosEvento. */
export async function editarEvento(
  _prevState: EditarEventoState,
  formData: FormData
): Promise<EditarEventoState> {
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error };

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  if (!eventoId) return { error: "Evento não encontrado." };

  const validado = validarDadosEvento(formData);
  if (validado.error !== null) return { error: validado.error };
  const { dados } = validado;

  const supabase = createServerSupabaseClient();

  // Mesmo limite de excluirEvento: não deixa mexer no evento (ex.:
  // valor_fechamento) depois que já existe pagamento/recebimento
  // fechado — evita alterar silenciosamente um contrato cujo dinheiro
  // já andou de mão.
  const { data: financeiroFechado } = await supabase
    .from("eventos_financeiro")
    .select("pago_bombeiros_status, recebido_cliente_status")
    .eq("evento_id", eventoId)
    .maybeSingle();
  if (
    financeiroFechado &&
    (financeiroFechado.pago_bombeiros_status === "Pago" || financeiroFechado.recebido_cliente_status === "Recebido")
  ) {
    return { error: "Não é possível editar: já existe pagamento ou recebimento registrado para este evento." };
  }

  // Se o novo período for mais estreito que o atual, uma escala já
  // montada pode ficar com uma data fora do intervalo do evento —
  // bloqueia em vez de deixar esse estado inconsistente. Ajustar as
  // escalas (ou removê-las) continua sendo pela tela de escala.
  //
  // Nota: essa checagem e o UPDATE logo abaixo são dois round-trips
  // separados (não atômico) — uma escala concorrente inserida bem
  // entre os dois passaria despercebida. Risco aceito por enquanto:
  // janela de corrida estreita, equipe pequena, e consequência é só
  // inconsistência de dado (não perda financeira, que é o caso já
  // resolvido de forma atômica em excluir_evento_se_permitido, migração
  // 0017). Documentado em decisoes-tecnicas.md.
  const { data: escalasForaDoPeriodo } = await supabase
    .from("escalas")
    .select("id")
    .eq("evento_id", eventoId)
    .or(`data.lt.${dados.dataInicio},data.gt.${dados.dataFim}`)
    .limit(1);
  if (escalasForaDoPeriodo && escalasForaDoPeriodo.length > 0) {
    return {
      error: "Já existem bombeiros escalados fora desse novo período — ajuste ou remova essas escalas antes.",
    };
  }

  const { data, error } = await supabase
    .from("eventos")
    .update({
      nome: dados.nome,
      cliente_id: dados.clienteId,
      local: dados.local,
      data_inicio: dados.dataInicio,
      data_fim: dados.dataFim,
      quantitativo_bombeiros: dados.quantitativoBombeiros,
      materiais: dados.materiais,
      valor_fechamento: dados.valorFechamento,
    })
    .eq("id", eventoId)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Erro ao salvar: ${error.message}` };
  if (!data) return { error: "Evento não encontrado." };

  const sessaoEdicao = await getSessionUsuario();
  await registrarAuditoria({
    supabase,
    usuarioId: sessaoEdicao.configured && sessaoEdicao.loggedIn ? sessaoEdicao.usuario?.id : undefined,
    tabela: "eventos",
    registroId: eventoId,
    acao: "editar",
    valorDepois: { nome: dados.nome, valor_fechamento: dados.valorFechamento },
  });

  revalidatePath("/eventos");
  revalidatePath(`/eventos/${eventoId}`);
  revalidarTelasFinanceiras();
  redirect(`/eventos/${eventoId}`);
}

/**
 * Excluir evento cascateia pra escalas, candidaturas e
 * eventos_financeiro (FKs "on delete cascade", ver supabase/schema.sql
 * e migração 0016) — por isso a exclusão de fato roda dentro de
 * excluir_evento_se_permitido (migração 0017), uma function que checa
 * e apaga no mesmo statement SQL. Dois motivos pra não fazer essa
 * checagem aqui em JS, em dois round-trips separados como a primeira
 * versão fazia: (1) TOCTOU real — outra ação concorrente podia mudar o
 * financeiro entre o select e o delete; (2) o guard sozinho, só pelo
 * status atual de eventos_financeiro, era burlável sem corrida
 * nenhuma — bastava reverter o status pra 'Pendente' em /financeiro
 * (ação já permitida) e excluir em seguida. A function soma uma
 * segunda camada (escalas.horario_cumprido preenchido = trabalho já
 * registrado) bem mais difícil de reverter com um clique. Achado real
 * de revisão de segurança (HIGH + MEDIUM) — ver decisoes-tecnicas.md.
 */
export async function excluirEvento(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  if (!eventoId) redirect("/eventos?erro=1");

  const supabase = createServerSupabaseClient();

  const { data: excluido, error } = await supabase.rpc("excluir_evento_se_permitido", {
    p_evento_id: eventoId,
  });
  if (error) redirect(`/eventos/${eventoId}?erro=1`);
  if (!excluido) redirect(`/eventos/${eventoId}?erro=financeiro-fechado`);

  const sessaoExclusao = await getSessionUsuario();
  await registrarAuditoria({
    supabase,
    usuarioId: sessaoExclusao.configured && sessaoExclusao.loggedIn ? sessaoExclusao.usuario?.id : undefined,
    tabela: "eventos",
    registroId: eventoId,
    acao: "excluir",
  });

  revalidatePath("/eventos");
  revalidarTelasFinanceiras();
  redirect("/eventos");
}

export type ProgramacaoFormState = { error: string | null };

/**
 * Programação combinada com o cliente (migração 0023) — fonte da
 * tabela DATA / HORÁRIO / CARGA HORÁRIA / QUANTIDADE do orçamento e do
 * contrato em PDF. Independente das escalas: é o que foi contratado,
 * não quem foi escalado.
 */
export async function adicionarProgramacao(
  _prevState: ProgramacaoFormState,
  formData: FormData
): Promise<ProgramacaoFormState> {
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error };

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  if (!eventoId) return { error: "Evento não informado." };

  const supabase = createServerSupabaseClient();
  const { data: evento, error: eventoError } = await supabase
    .from("eventos")
    .select("data_inicio, data_fim")
    .eq("id", eventoId)
    .maybeSingle();
  if (eventoError || !evento) return { error: "Evento não encontrado." };

  const validacao = validarLinhaProgramacao(
    {
      data: String(formData.get("data") ?? ""),
      horaInicio: String(formData.get("hora_inicio") ?? ""),
      horaFim: String(formData.get("hora_fim") ?? ""),
      quantidade: String(formData.get("quantidade") ?? ""),
    },
    { dataInicio: evento.data_inicio, dataFim: evento.data_fim }
  );
  if (validacao.error !== null) return { error: validacao.error };
  const { linha } = validacao;

  const { error } = await supabase.from("evento_programacao").insert({
    evento_id: eventoId,
    data: linha.data,
    hora_inicio: linha.horaInicio,
    hora_fim: linha.horaFim,
    quantidade: linha.quantidade,
  });
  if (error) return { error: `Erro ao salvar: ${error.message}` };

  revalidatePath(`/eventos/${eventoId}`);
  return { error: null };
}

export async function removerProgramacao(formData: FormData): Promise<void> {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const programacaoId = String(formData.get("programacao_id") ?? "");
  const eventoId = String(formData.get("evento_id") ?? "");
  if (!programacaoId || !eventoId) redirect(`/eventos/${eventoId}?erro=1`);

  const supabase = createServerSupabaseClient();
  // Escopado a evento_id também, mesma disciplina de removerEscala.
  const { data, error } = await supabase
    .from("evento_programacao")
    .delete()
    .eq("id", programacaoId)
    .eq("evento_id", eventoId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(`/eventos/${eventoId}?erro=1`);

  revalidatePath(`/eventos/${eventoId}`);
}
