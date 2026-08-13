import { getServerSupabaseClient } from "@/lib/supabase/server";
import { bombeiroAptidao, fmtMoney } from "@/lib/domain";
import { MOCK_BOMBEIROS, MOCK_EVENTOS } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import type { Bombeiro, Evento } from "@/lib/types";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel-block p-4">
      <div
        className="text-[10.5px] font-bold uppercase tracking-wide"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </div>
      <div
        className="num mt-1.5 text-[26px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[12px]" style={{ color: "var(--text-soft)" }}>
        {sub}
      </div>
    </div>
  );
}

export default async function PainelPage() {
  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let bombeiros: Bombeiro[] = MOCK_BOMBEIROS;
  let eventos: Evento[] = MOCK_EVENTOS;

  if (supabase) {
    const [{ data: bombeirosData }, { data: eventosData }] = await Promise.all([
      supabase.from("bombeiros").select("*"),
      supabase.from("eventos").select("*"),
    ]);
    bombeiros = (bombeirosData ?? []) as Bombeiro[];
    eventos = (eventosData ?? []) as Evento[];
  }

  const ativos = bombeiros.filter((b) => b.esocial_status === "Ativo").length;
  const pendencias = bombeiros.filter((b) => bombeiroAptidao(b).level !== "ok").length;
  const confirmados = eventos.filter((e) => e.status === "Confirmado").length;
  const planejamento = eventos.filter((e) => e.status === "Planejamento").length;
  const faturamentoTotal = eventos.reduce((sum, e) => sum + Number(e.valor_fechamento), 0);

  return (
    <div>
      <div className="mb-6">
        <h1
          className="mb-1 text-[26px] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Painel
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Visão geral da operação — bombeiros, escalas e resultado financeiro em um só lugar.
        </p>
      </div>

      {demo && <DemoBanner />}

      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Bombeiros Ativos" value={`${ativos} / ${bombeiros.length}`} sub="cadastrados no quadro" />
        <Kpi label="Pendências de Documento" value={String(pendencias)} sub={pendencias ? "requer atenção" : "tudo em dia"} />
        <Kpi label="Eventos Confirmados" value={String(confirmados)} sub="no período" />
        <Kpi label="Em Planejamento" value={String(planejamento)} sub="aguardando confirmação" />
        <Kpi label="Faturamento Total" value={fmtMoney(faturamentoTotal)} sub="soma dos fechamentos" />
      </div>

      {!demo && bombeiros.length === 0 && eventos.length === 0 && (
        <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Banco de dados vazio — cadastre o primeiro bombeiro para começar a ver os números aqui.
        </div>
      )}
    </div>
  );
}
