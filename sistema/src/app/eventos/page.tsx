import { getServerSupabaseClient } from "@/lib/supabase/server";
import { fmtDateBR, fmtMoney } from "@/lib/domain";
import { MOCK_EVENTOS } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import type { Evento } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let eventos: Evento[] = MOCK_EVENTOS;
  let error: { message: string } | null = null;

  if (supabase) {
    const result = await supabase
      .from("eventos")
      .select("*")
      .order("data_inicio", { ascending: true });
    eventos = (result.data ?? []) as Evento[];
    error = result.error;
  }

  return (
    <div>
      <div className="mb-6">
        <h1
          className="mb-1 text-[26px] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Eventos &amp; Escalas
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Contratos recebidos de empresas organizadoras e a escala de bombeiros alocada em cada um.
        </p>
      </div>

      {demo && <DemoBanner />}

      <div className="panel-block mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-[560px]">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Data</th>
                <th>Quantitativo</th>
                <th>Valor Fechamento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center" style={{ color: "var(--crit)" }}>
                    Erro ao carregar eventos: {error.message}
                  </td>
                </tr>
              ) : eventos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhum evento cadastrado ainda.
                  </td>
                </tr>
              ) : (
                eventos.map((e) => (
                  <tr key={e.id}>
                    <td className="font-semibold">
                      {e.nome}
                      <span className="mt-0.5 block text-[11.5px] font-normal" style={{ color: "var(--text-faint)" }}>
                        {e.local}
                      </span>
                    </td>
                    <td className="num">
                      {fmtDateBR(e.data_inicio)}
                      {e.data_fim !== e.data_inicio ? ` – ${fmtDateBR(e.data_fim)}` : ""}
                    </td>
                    <td className="num">{e.quantitativo_bombeiros}</td>
                    <td className="num">{fmtMoney(Number(e.valor_fechamento))}</td>
                    <td>
                      <span className="pill">{e.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="rounded-md border px-4 py-3 text-[13px]"
        style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--text-soft)" }}
      >
        Próximo passo deste módulo: formulário de criação de evento e a tela de escala por turno
        (com o bloqueio automático de bombeiros com documentação vencida, já validado no protótipo).
      </div>
    </div>
  );
}
