import { redirect } from "next/navigation";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import { getSessionUsuario } from "@/lib/auth/session";
import { fmtDateBR, fmtMoney } from "@/lib/domain";
import { candidatarEvento, confirmarEscala } from "./actions";

export const dynamic = "force-dynamic";

type EscalaComEvento = {
  id: string;
  data: string;
  turno: string;
  tipo: "titular" | "reserva";
  valor: number;
  horario_cumprido: string | null;
  status_confirmacao: "pendente" | "confirmado";
  evento_id: string;
  eventos: { nome: string; local: string | null; status: string } | null;
};

type EventoAberto = {
  id: string;
  nome: string;
  local: string | null;
  data_inicio: string;
  data_fim: string;
  quantitativo_bombeiros: number;
};

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível concluir a ação. Tente novamente.",
  inapto: "Sua documentação está vencida — regularize em Documentos antes de se candidatar.",
  "sem-vaga": "Esse evento acabou de preencher a última vaga.",
  duplicada: "Você já se candidatou a esse evento.",
};

export default async function PortalEscalaPage({ searchParams }: PageProps<"/portal/escala">) {
  const params = await searchParams;
  const erroParam = typeof params?.erro === "string" ? params.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

  const sessao = await getSessionUsuario();
  if (!sessao.configured) {
    return (
      <div className="panel-block p-5">
        <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
          Escala exige um projeto Supabase configurado — não disponível no modo de demonstração.
        </p>
      </div>
    );
  }
  if (!sessao.loggedIn) redirect("/login");

  const supabase = await getSessionSupabaseClient();
  if (!supabase) redirect("/login");

  const [{ data, error }, { data: eventosAbertosData }, { data: candidaturasData }] = await Promise.all([
    supabase
      .from("escalas")
      .select(
        "id, data, turno, tipo, valor, horario_cumprido, status_confirmacao, evento_id, eventos(nome, local, status)"
      )
      .order("data", { ascending: true }),
    supabase
      .from("eventos")
      .select("id, nome, local, data_inicio, data_fim, quantitativo_bombeiros")
      .eq("status", "Confirmado"),
    supabase.from("candidaturas").select("evento_id, status"),
  ]);

  // A RLS de `eventos` (migração 0012) já só libera status
  // Confirmado/Concluído pro bombeiro — `eventos: null` aqui significa
  // que o evento existe mas está em Planejamento (RLS bloqueou o
  // embed), não que a linha não existe. Filtra isso, não o status.
  const escalas = ((data ?? []) as unknown as EscalaComEvento[]).filter((e) => e.eventos !== null);

  const hoje = new Date().toISOString().slice(0, 10);
  const proximas = escalas.filter((e) => e.data >= hoje);
  const historico = escalas.filter((e) => e.data < hoje).reverse();

  // A migração 0016 adiciona uma policy de RLS que libera, além dos
  // eventos em que o bombeiro já tem escala (0012), qualquer evento
  // Confirmado com vaga de titular aberta. Um evento vindo dessa
  // consulta que NÃO está no conjunto de "eventos com escala própria"
  // só pode estar aqui por ter vaga aberta — a contagem exata (via
  // security definer, ver 0016) já foi validada no banco.
  const eventoIdsComEscala = new Set(escalas.map((e) => e.evento_id));
  const eventosAbertos = ((eventosAbertosData ?? []) as EventoAberto[]).filter(
    (ev) => !eventoIdsComEscala.has(ev.id)
  );
  const candidaturaPorEvento = new Map(
    ((candidaturasData ?? []) as { evento_id: string; status: string }[]).map((c) => [c.evento_id, c.status])
  );

  return (
    <div>
      <h1 className="mb-1 text-[22px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Escala
      </h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--text-soft)" }}>
        Seus eventos confirmados, futuros e o histórico.
      </p>

      {mensagemErro && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {mensagemErro}
        </div>
      )}
      {error && (
        <div className="panel-block mb-4 p-4 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar escala: {error.message}
        </div>
      )}

      <div className="mb-5">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
          Eventos com vagas abertas
        </h2>
        {eventosAbertos.length === 0 ? (
          <div className="panel-block p-5">
            <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
              Nenhum evento com vaga aberta no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {eventosAbertos.map((ev) => {
              const statusCandidatura = candidaturaPorEvento.get(ev.id);
              return (
                <div key={ev.id} className="panel-block p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{ev.nome}</div>
                      <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {ev.local ?? "—"}
                      </div>
                    </div>
                    {statusCandidatura ? (
                      <span className="pill">
                        {statusCandidatura === "pendente"
                          ? "Candidatura pendente"
                          : statusCandidatura === "aceita"
                            ? "Candidatura aceita"
                            : "Candidatura recusada"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>
                      {fmtDateBR(ev.data_inicio)}
                      {ev.data_fim !== ev.data_inicio ? ` – ${fmtDateBR(ev.data_fim)}` : ""} · até{" "}
                      {ev.quantitativo_bombeiros} bombeiro(s)
                    </span>
                    {!statusCandidatura && (
                      <form action={candidatarEvento}>
                        <input type="hidden" name="evento_id" value={ev.id} />
                        <button type="submit" className="btn btn--primary">
                          Candidatar-se
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EscalaLista titulo="Próximas" linhas={proximas} vazio="Nenhum evento confirmado ainda." permitirConfirmar />
      <div className="mt-5">
        <EscalaLista titulo="Histórico" linhas={historico} vazio="Nenhum evento concluído ainda." />
      </div>
    </div>
  );
}

function EscalaLista({
  titulo,
  linhas,
  vazio,
  permitirConfirmar = false,
}: {
  titulo: string;
  linhas: EscalaComEvento[];
  vazio: string;
  permitirConfirmar?: boolean;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {titulo}
      </h2>
      {linhas.length === 0 ? (
        <div className="panel-block p-5">
          <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
            {vazio}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {linhas.map((e) => (
            <div key={e.id} className="panel-block p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{e.eventos?.nome ?? "—"}</div>
                  <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>
                    {e.eventos?.local ?? "—"}
                  </div>
                </div>
                <span className="pill">{e.tipo === "titular" ? "Titular" : "Reserva"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>
                  {fmtDateBR(e.data)} · {e.turno} · {fmtMoney(Number(e.valor))}
                  {e.horario_cumprido ? ` · Ponto: ${e.horario_cumprido}` : ""}
                </span>
                {permitirConfirmar &&
                  (e.status_confirmacao === "confirmado" ? (
                    <span className="text-[12px]" style={{ color: "var(--ok)" }}>
                      ✓ Confirmado
                    </span>
                  ) : (
                    <form action={confirmarEscala}>
                      <input type="hidden" name="escala_id" value={e.id} />
                      <button type="submit" className="btn btn--primary">
                        Confirmar presença
                      </button>
                    </form>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
