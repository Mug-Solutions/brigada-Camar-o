import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { bombeiroAptidao, fmtDateBR, fmtMoney } from "@/lib/domain";
import { TURNOS } from "@/lib/constants";
import type { Bombeiro, Candidatura, Escala, Evento } from "@/lib/types";
import { AdicionarEscalaForm } from "./AdicionarEscalaForm";
import { EscalaTabela } from "./EscalaTabela";
import { ExcluirEventoButton } from "./ExcluirEventoButton";
import { aceitarCandidatura, recusarCandidatura } from "./actions";
import { carregarDadosDocumento } from "@/lib/documentos-cliente/carregar";
import { pendenciasDocumento } from "@/lib/documentos-cliente/dados";
import { ProgramacaoEvento } from "./ProgramacaoEvento";
import { DocumentosCliente } from "./DocumentosCliente";

export const dynamic = "force-dynamic";

export type EscalaComBombeiro = Escala & { bombeiros: { nome: string } | null };
type CandidaturaComBombeiro = Candidatura & { bombeiros: { nome: string } | null };

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível concluir a ação. Tente novamente.",
  "financeiro-fechado":
    "Não é possível excluir: já existe pagamento/recebimento fechado ou ponto registrado em algum turno deste evento.",
  "documento-orcamento": "Não foi possível gerar o orçamento — veja o que falta em \"Documentos para o cliente\".",
  "documento-contrato": "Não foi possível gerar o contrato — veja o que falta em \"Documentos para o cliente\".",
};

export default async function EventoDetalhePage({ params, searchParams }: PageProps<"/eventos/[id]">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const erroParam = typeof sp?.erro === "string" ? sp.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;
  // Clicar num nome na lista de "Pré-escalados" (abaixo) só troca essa
  // query string — não é um envio de formulário — pra pré-selecionar
  // aquele bombeiro no formulário "Escalar bombeiro" sem duplicar
  // nenhuma lógica de escrita.
  const escalarBombeiroId = typeof sp?.escalar === "string" ? sp.escalar : null;

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return (
      <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        Escala por evento exige um projeto Supabase configurado — não disponível no modo de demonstração.
      </div>
    );
  }

  const [
    { data: evento },
    { data: escalasData, error: escalasError },
    { data: bombeirosData },
    { data: candidaturasData },
    { data: disponibilidadesData },
    documento,
  ] = await Promise.all([
    supabase.from("eventos").select("*, clientes(nome)").eq("id", id).maybeSingle(),
    supabase
      .from("escalas")
      .select("*, bombeiros(nome)")
      .eq("evento_id", id)
      .order("data", { ascending: true }),
    supabase
      .from("bombeiros")
      .select("id, nome, esocial_status, aso_data, credenciamento_data")
      .order("nome", { ascending: true }),
    supabase
      .from("candidaturas")
      .select("*, bombeiros(nome)")
      .eq("evento_id", id)
      .in("status", ["pendente", "aceita"])
      .order("criado_em", { ascending: true }),
    // Fase 7 do roadmap: "sugestão automática de escala por
    // disponibilidade/proximidade" — tabela pequena (uso interno,
    // dezenas de bombeiros no máximo), traz tudo e filtra em JS no
    // formulário em vez de fazer um segundo round-trip dependente dos
    // bombeiros aptos.
    supabase.from("disponibilidades").select("bombeiro_id, dia_semana, turno, regiao"),
    carregarDadosDocumento(supabase, id),
  ]);

  if (!evento) notFound();

  const escalas = (escalasData ?? []) as unknown as EscalaComBombeiro[];
  const bombeiros = (bombeirosData ?? []) as Bombeiro[];
  const candidaturas = (candidaturasData ?? []) as unknown as CandidaturaComBombeiro[];
  const disponibilidades = (disponibilidadesData ?? []) as {
    bombeiro_id: string;
    dia_semana: string;
    turno: string;
    regiao: string | null;
  }[];
  const bombeirosAptos = bombeiros.filter((b) => bombeiroAptidao(b).level !== "crit");
  const bombeirosAptosPorId = new Map(bombeirosAptos.map((b) => [b.id, b]));
  const eventoTyped = evento as Evento & { clientes: { nome: string } | null };

  const titulares = escalas.filter((e) => e.tipo === "titular");
  const reservas = escalas.filter((e) => e.tipo === "reserva");

  const candidaturasPendentes = candidaturas.filter((c) => c.status === "pendente");

  // "Pré-escalados": candidatura aceita cujo bombeiro ainda não tem
  // nenhuma linha em escalas para este evento — some da lista assim
  // que for de fato escalado, pra não virar uma lista que só cresce.
  // Ordenado por revisado_em (quando o staff aceitou) ascendente: quem
  // foi aceito primeiro aparece primeiro — é a "prioridade de
  // aceitação" pedida, não uma prioridade arbitrária.
  const bombeiroIdsJaEscalados = new Set(escalas.map((e) => e.bombeiro_id));
  const preEscalados = candidaturas
    .filter((c) => c.status === "aceita" && !bombeiroIdsJaEscalados.has(c.bombeiro_id))
    .sort((a, b) => (a.revisado_em ?? "").localeCompare(b.revisado_em ?? ""));

  const bombeiroParaEscalar = escalarBombeiroId ? bombeirosAptosPorId.get(escalarBombeiroId) : undefined;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/eventos" className="mb-2 inline-block text-[12.5px]" style={{ color: "var(--text-soft)" }}>
            ← Eventos
          </Link>
          <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            {eventoTyped.nome}
          </h1>
          <p className="text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            {eventoTyped.clientes?.nome ?? "Sem cliente"} · {fmtDateBR(eventoTyped.data_inicio)}
            {eventoTyped.data_fim !== eventoTyped.data_inicio ? ` – ${fmtDateBR(eventoTyped.data_fim)}` : ""} ·{" "}
            {fmtMoney(Number(eventoTyped.valor_fechamento))} · <span className="pill">{eventoTyped.status}</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/eventos/${id}/editar`} className="btn">
            Editar
          </Link>
          <ExcluirEventoButton eventoId={id} nomeEvento={eventoTyped.nome} />
        </div>
      </div>

      {mensagemErro && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {mensagemErro}
        </div>
      )}
      {documento.ok === false && documento.motivo === "erro" && (
        <div className="panel-block mb-4 p-4 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar programação/documentos: {documento.mensagem}
        </div>
      )}
      {escalasError && (
        <div className="panel-block mb-4 p-4 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar escala: {escalasError.message}
        </div>
      )}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          {documento.ok && (
            <div className="mb-4">
              <ProgramacaoEvento
                eventoId={id}
                dataInicio={eventoTyped.data_inicio}
                dataFim={eventoTyped.data_fim}
                linhas={documento.programacao}
              />
            </div>
          )}
          <EscalaTabela
            titulo="Titulares"
            linhas={titulares}
            eventoId={id}
            vazio="Nenhum titular escalado ainda."
          />
          <div className="mt-4">
            <EscalaTabela
              titulo="Lista de reserva"
              linhas={reservas}
              eventoId={id}
              vazio="Nenhum reserva escalado ainda."
            />
          </div>

          {preEscalados.length > 0 && (
            <div className="panel-block mt-4 p-5">
              <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                Pré-escalados
              </h2>
              <p className="mb-3.5 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                Candidatura já aceita, aguardando data/turno — em ordem de quem aceitou primeiro.
              </p>
              <ul className="space-y-2">
                {preEscalados.map((c, i) => {
                  const apto = bombeirosAptosPorId.has(c.bombeiro_id);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                          style={{ background: "var(--ok-bg)", color: "var(--ok)" }}
                        >
                          {i + 1}
                        </span>
                        {c.bombeiros?.nome ?? "—"}
                        {apto && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{ background: "var(--warn-bg)", color: "var(--warn)" }}
                          >
                            Pendente — falta data/turno
                          </span>
                        )}
                        {!apto && (
                          <span className="text-[11.5px]" style={{ color: "var(--crit)" }}>
                            · documentação vencida
                          </span>
                        )}
                      </span>
                      {apto && (
                        <Link href={`/eventos/${id}?escalar=${c.bombeiro_id}`} className="btn">
                          Escalar
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div>
          {documento.ok && (
            <DocumentosCliente
              eventoId={id}
              pendencias={{
                orcamento: pendenciasDocumento("orcamento", documento.dados),
                contrato: pendenciasDocumento("contrato", documento.dados),
              }}
            />
          )}
          {candidaturasPendentes.length > 0 && (
            <div className="panel-block mb-4 p-5">
              <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                Candidaturas
              </h2>
              <ul className="space-y-2.5">
                {candidaturasPendentes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span>{c.bombeiros?.nome ?? "—"}</span>
                    <div className="flex gap-1.5">
                      <form action={aceitarCandidatura}>
                        <input type="hidden" name="candidatura_id" value={c.id} />
                        <input type="hidden" name="evento_id" value={id} />
                        <button type="submit" className="btn btn--primary">
                          Aceitar
                        </button>
                      </form>
                      <form action={recusarCandidatura}>
                        <input type="hidden" name="candidatura_id" value={c.id} />
                        <input type="hidden" name="evento_id" value={id} />
                        <button type="submit" className="btn">
                          Recusar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        <div className="panel-block p-5">
          <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            Escalar bombeiro
          </h2>
          {bombeirosAptos.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
              Nenhum bombeiro apto disponível — todos estão com documentação vencida ou inativos.
            </p>
          ) : (
            <AdicionarEscalaForm
              key={bombeiroParaEscalar?.id ?? "padrao"}
              eventoId={id}
              eventoLocal={eventoTyped.local}
              dataInicio={eventoTyped.data_inicio}
              dataFim={eventoTyped.data_fim}
              bombeiros={bombeirosAptos.map((b) => ({ id: b.id, nome: b.nome }))}
              turnos={Object.entries(TURNOS).map(([nome, t]) => ({ nome, ...t }))}
              disponibilidades={disponibilidades}
              bombeiroSelecionadoId={bombeiroParaEscalar?.id}
            />
          )}
          {bombeiros.length > bombeirosAptos.length && (
            <p className="mt-3 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
              {bombeiros.length - bombeirosAptos.length} bombeiro(s) fora da lista por documentação vencida.
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
