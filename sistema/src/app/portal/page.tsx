import Link from "next/link";
import { getSessionUsuario } from "@/lib/auth/session";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import { bombeiroAptidao, docStatus, fmtDateBR, type DocStatus } from "@/lib/domain";
import { Chip } from "@/components/Chip";
import type { Bombeiro, Notificacao } from "@/lib/types";
import { marcarNotificacaoLida } from "./actions";

export const dynamic = "force-dynamic";

type EscalaResumo = {
  id: string;
  data: string;
  turno: string;
  evento_id: string;
  eventos: { nome: string; local: string | null } | null;
};

type EventoResumo = {
  id: string;
  nome: string;
  local: string | null;
  data_inicio: string;
  created_at: string;
};

export default async function PortalInicioPage() {
  const sessao = await getSessionUsuario();
  const nome =
    sessao?.configured && sessao.loggedIn && sessao.usuario?.nome ? sessao.usuario.nome.split(" ")[0] : "Bombeiro";
  const bombeiroId = sessao.configured && sessao.loggedIn ? sessao.usuario?.bombeiro_id : undefined;

  let notificacoes: Notificacao[] = [];
  let proximasEscalas: EscalaResumo[] = [];
  let novosEventos: EventoResumo[] = [];
  let aso: DocStatus | null = null;
  let credenciamento: DocStatus | null = null;
  let aptidao: DocStatus | null = null;

  if (bombeiroId) {
    const supabase = await getSessionSupabaseClient();
    if (supabase) {
      const [{ data: notificacoesData }, { data: escalasData }, { data: eventosAbertosData }, { data: bombeiro }] =
        await Promise.all([
          supabase.from("notificacoes").select("*").eq("lida", false).order("criado_em", { ascending: false }),
          supabase
            .from("escalas")
            .select("id, data, turno, evento_id, eventos(nome, local)")
            .order("data", { ascending: true }),
          supabase
            .from("eventos")
            .select("id, nome, local, data_inicio, created_at")
            .eq("status", "Confirmado")
            .order("created_at", { ascending: false }),
          supabase
            .from("bombeiros")
            .select("aso_data, credenciamento_data, esocial_status")
            .eq("id", bombeiroId)
            .maybeSingle(),
        ]);

      notificacoes = (notificacoesData ?? []) as Notificacao[];

      // A RLS de `eventos` (migração 0012) só libera o embed pro
      // bombeiro quando o evento está Confirmado/Concluído — `eventos:
      // null` aqui é uma escala em evento ainda em Planejamento, não
      // uma linha inexistente. Mesmo filtro usado em /portal/escala.
      const hoje = new Date().toISOString().slice(0, 10);
      const escalas = ((escalasData ?? []) as unknown as EscalaResumo[]).filter((e) => e.eventos !== null);
      proximasEscalas = escalas.filter((e) => e.data >= hoje).slice(0, 3);

      const eventoIdsComEscala = new Set(escalas.map((e) => e.evento_id));
      novosEventos = ((eventosAbertosData ?? []) as EventoResumo[])
        .filter((ev) => !eventoIdsComEscala.has(ev.id))
        .slice(0, 3);

      if (bombeiro) {
        aso = docStatus(bombeiro.aso_data);
        credenciamento = docStatus(bombeiro.credenciamento_data);
        aptidao = bombeiroAptidao(bombeiro as Bombeiro);
      }
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Olá, {nome}
      </h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--text-soft)" }}>
        Bem-vindo ao Portal do Bombeiro.
      </p>

      {notificacoes.length > 0 && (
        <div className="mb-5 space-y-2">
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-[13px]"
              style={
                n.nivel === "crit"
                  ? { borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }
                  : { borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }
              }
            >
              <span>{n.mensagem}</span>
              <form action={marcarNotificacaoLida}>
                <input type="hidden" name="notificacao_id" value={n.id} />
                <button type="submit" className="btn">
                  Marcar como lida
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-5">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
              Escala
            </h2>
            <Link href="/portal/escala" className="text-[12px]" style={{ color: "var(--accent)" }}>
              Ver tudo
            </Link>
          </div>
          {proximasEscalas.length === 0 ? (
            <div className="panel-block p-4">
              <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
                Nenhum evento confirmado na sua escala.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {proximasEscalas.map((e) => (
                <div key={e.id} className="panel-block flex items-center justify-between gap-3 p-3.5">
                  <div>
                    <div className="font-semibold">{e.eventos?.nome ?? "—"}</div>
                    <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>
                      {e.eventos?.local ?? "—"}
                    </div>
                  </div>
                  <span className="text-[12.5px] shrink-0" style={{ color: "var(--text-soft)" }}>
                    {fmtDateBR(e.data)} · {e.turno}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
              Novos Eventos
            </h2>
            <Link href="/portal/escala" className="text-[12px]" style={{ color: "var(--accent)" }}>
              Ver tudo
            </Link>
          </div>
          {novosEventos.length === 0 ? (
            <div className="panel-block p-4">
              <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
                Nenhum evento novo com vaga aberta no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {novosEventos.map((ev) => (
                <Link
                  key={ev.id}
                  href="/portal/escala"
                  className="panel-block flex items-center justify-between gap-3 p-3.5"
                >
                  <div>
                    <div className="font-semibold">{ev.nome}</div>
                    <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>
                      {ev.local ?? "—"}
                    </div>
                  </div>
                  <span className="text-[12.5px] shrink-0" style={{ color: "var(--text-soft)" }}>
                    {fmtDateBR(ev.data_inicio)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
              Status Documento
            </h2>
            <Link href="/portal/documentos" className="text-[12px]" style={{ color: "var(--accent)" }}>
              Ver tudo
            </Link>
          </div>
          {!aso || !credenciamento ? (
            <div className="panel-block p-4">
              <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
                Documentos não disponíveis.
              </p>
            </div>
          ) : (
            <div className="panel-block p-4">
              {aptidao && aptidao.level !== "ok" && (
                <p
                  className="mb-3 text-[12.5px]"
                  style={{ color: aptidao.level === "crit" ? "var(--crit)" : "var(--warn)" }}
                >
                  {aptidao.level === "crit"
                    ? `${aptidao.label} — regularize sua situação para poder ser escalado.`
                    : "Documentação próxima do vencimento — regularize em breve."}
                </p>
              )}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px]">ASO</span>
                <Chip level={aso.level} label={aso.label} />
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px]">Credenciamento</span>
                <Chip level={credenciamento.level} label={credenciamento.label} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
