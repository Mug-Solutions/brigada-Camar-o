import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { bombeiroAptidao, docStatus, fmtDateBR, fmtMoney } from "@/lib/domain";
import { buscarPrecoAlimentacao } from "@/lib/precos";
import { MOCK_BOMBEIROS, MOCK_EVENTOS } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import { calcularLinhasFinanceiro, type EventoFinanceiroRow } from "../financeiro/calculo";
import type { Bombeiro, Evento } from "@/lib/types";

type AlertaPendente = { texto: string; href: string };

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

function variacaoTexto(atual: number, anterior: number): string {
  if (anterior === 0) return atual > 0 ? "sem base de comparação" : "igual ao mês passado";
  const variacao = ((atual - anterior) / anterior) * 100;
  const sinal = variacao >= 0 ? "+" : "";
  return `${sinal}${variacao.toFixed(0)}% vs. mês passado`;
}

export default async function PainelPage() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let bombeiros: Bombeiro[] = MOCK_BOMBEIROS;
  let eventos: Evento[] = MOCK_EVENTOS;
  let lucroMesAtual = 0;
  let lucroMesAnterior = 0;
  let faturamentoMesAtual = 0;
  let faturamentoMesAnterior = 0;
  let proximosEventos: { id: string; nome: string; data_inicio: string; cliente: string }[] = [];
  let alertas: AlertaPendente[] = [];

  if (supabase) {
    const [{ data: bombeirosData }, resultEventos, resultEscalas, precoAlimentacao, { data: financeiroData }] =
      await Promise.all([
        supabase.from("bombeiros").select("id, nome, esocial_status, aso_data, credenciamento_data"),
        supabase
          .from("eventos")
          .select("id, nome, data_inicio, status, valor_fechamento, custo_estimado, quantitativo_bombeiros, clientes(nome)")
          .order("data_inicio", { ascending: true }),
        supabase.from("escalas").select("evento_id, valor").eq("tipo", "titular"),
        buscarPrecoAlimentacao(supabase),
        supabase
          .from("eventos_financeiro")
          .select("evento_id, pago_bombeiros_status, recebido_cliente_status, eventos(nome)")
          .or("pago_bombeiros_status.eq.Atrasado,recebido_cliente_status.eq.Atrasado"),
      ]);
    bombeiros = (bombeirosData ?? []) as Bombeiro[];
    eventos = (resultEventos.data ?? []) as unknown as Evento[];

    const linhas = calcularLinhasFinanceiro(
      (resultEventos.data ?? []) as unknown as EventoFinanceiroRow[],
      resultEscalas.data ?? [],
      precoAlimentacao
    );

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const mesAnteriorData = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesAnterior = `${mesAnteriorData.getFullYear()}-${String(mesAnteriorData.getMonth() + 1).padStart(2, "0")}`;

    for (const l of linhas) {
      const mesDoEvento = l.dataInicio.slice(0, 7);
      if (mesDoEvento === mesAtual) {
        faturamentoMesAtual += l.receita;
        lucroMesAtual += l.receita - l.custo;
      } else if (mesDoEvento === mesAnterior) {
        faturamentoMesAnterior += l.receita;
        lucroMesAnterior += l.receita - l.custo;
      }
    }

    const hojeIso = hoje.toISOString().slice(0, 10);
    proximosEventos = (eventos as unknown as (Evento & { clientes: { nome: string } | null })[])
      .filter((e) => e.status === "Confirmado" && e.data_inicio >= hojeIso)
      .slice(0, 5)
      .map((e) => ({ id: e.id, nome: e.nome, data_inicio: e.data_inicio, cliente: e.clientes?.nome ?? "—" }));

    // "Alertas pendentes" no painel, com link direto pra resolver —
    // fecha dois itens essenciais do PRD que nunca tiveram alerta
    // nenhum antes ("escala incompleta", "pagamento atrasado"; o
    // terceiro, documento vencendo/vencido, já existia como e-mail/
    // WhatsApp — aqui ganha uma versão visual e navegável).
    const titularesPorEvento = new Map<string, number>();
    for (const escala of resultEscalas.data ?? []) {
      titularesPorEvento.set(escala.evento_id, (titularesPorEvento.get(escala.evento_id) ?? 0) + 1);
    }

    const alertasDocumento: AlertaPendente[] = bombeiros
      .filter((b) => bombeiroAptidao(b).level !== "ok")
      .map((b) => {
        const aso = docStatus(b.aso_data);
        const cred = docStatus(b.credenciamento_data);
        const pior = aso.level === "crit" || cred.level === "crit" ? "vencido" : "vencendo";
        return { texto: `${b.nome} — documento ${pior}`, href: "/bombeiros" };
      });

    const alertasEscala: AlertaPendente[] = (eventos as unknown as (Evento & { clientes: { nome: string } | null })[])
      .filter((e) => e.status === "Confirmado" && (titularesPorEvento.get(e.id) ?? 0) < e.quantitativo_bombeiros)
      .map((e) => ({
        texto: `${e.nome} — ${titularesPorEvento.get(e.id) ?? 0}/${e.quantitativo_bombeiros} escalados`,
        href: `/eventos/${e.id}`,
      }));

    const alertasFinanceiro: AlertaPendente[] = (
      (financeiroData ?? []) as unknown as {
        evento_id: string;
        pago_bombeiros_status: string;
        recebido_cliente_status: string;
        eventos: { nome: string } | null;
      }[]
    ).map((f) => {
      const motivo =
        f.pago_bombeiros_status === "Atrasado" && f.recebido_cliente_status === "Atrasado"
          ? "pagamento e recebimento atrasados"
          : f.pago_bombeiros_status === "Atrasado"
            ? "pagamento a bombeiros atrasado"
            : "recebimento do cliente atrasado";
      return { texto: `${f.eventos?.nome ?? "Evento"} — ${motivo}`, href: `/financeiro/${f.evento_id}` };
    });

    alertas = [...alertasFinanceiro, ...alertasEscala, ...alertasDocumento];
  }

  const ativos = bombeiros.filter((b) => b.esocial_status === "Ativo").length;
  const pendencias = bombeiros.filter((b) => bombeiroAptidao(b).level !== "ok").length;
  const confirmados = eventos.filter((e) => e.status === "Confirmado").length;
  const planejamento = eventos.filter((e) => e.status === "Planejamento").length;

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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Bombeiros Ativos" value={`${ativos} / ${bombeiros.length}`} sub="cadastrados no quadro" />
        <Kpi label="Pendências de Documento" value={String(pendencias)} sub={pendencias ? "requer atenção" : "tudo em dia"} />
        <Kpi label="Eventos Confirmados" value={String(confirmados)} sub="no período" />
        <Kpi label="Em Planejamento" value={String(planejamento)} sub="aguardando confirmação" />
        <Kpi
          label="Faturamento do Mês"
          value={fmtMoney(faturamentoMesAtual)}
          sub={variacaoTexto(faturamentoMesAtual, faturamentoMesAnterior)}
        />
        <Kpi
          label="Lucro do Mês"
          value={fmtMoney(lucroMesAtual)}
          sub={variacaoTexto(lucroMesAtual, lucroMesAnterior)}
        />
      </div>

      <p className="mb-7 text-[12px]" style={{ color: "var(--text-faint)" }}>
        Comparativos por trimestre/ano e por cliente:{" "}
        <Link href="/financeiro/dre" className="underline">
          ver DRE
        </Link>
        .
      </p>

      {!demo && bombeiros.length === 0 && eventos.length === 0 && (
        <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Banco de dados vazio — cadastre o primeiro bombeiro para começar a ver os números aqui.
        </div>
      )}

      {alertas.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
            Alertas pendentes ({alertas.length})
          </h2>
          <div className="panel-block">
            <ul>
              {alertas.map((alerta, i) => (
                <li key={i} className="border-b last:border-b-0" style={{ borderColor: "var(--line)" }}>
                  <Link
                    href={alerta.href}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] hover:underline"
                  >
                    <span>{alerta.texto}</span>
                    <span style={{ color: "var(--text-faint)" }}>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {proximosEventos.length > 0 && (
        <div>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
            Próximos eventos confirmados
          </h2>
          <div className="panel-block">
            <div className="overflow-x-auto">
              <table className="min-w-[480px]">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {proximosEventos.map((e) => (
                    <tr key={e.id}>
                      <td className="font-semibold">
                        <Link href="/eventos" className="hover:underline">
                          {e.nome}
                        </Link>
                      </td>
                      <td>{e.cliente}</td>
                      <td className="num">{fmtDateBR(e.data_inicio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
