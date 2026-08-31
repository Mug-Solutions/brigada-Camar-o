import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { fmtMoney } from "@/lib/domain";
import { DemoBanner } from "@/components/DemoBanner";
import { buscarPrecoAlimentacao } from "@/lib/precos";
import { calcularLinhasFinanceiro, type EventoFinanceiroRow } from "../calculo";
import type { LinhaFinanceiro } from "../FinanceiroTabela";

export const dynamic = "force-dynamic";

interface GrupoDRE {
  chave: string;
  label: string;
  eventos: number;
  receita: number;
  custo: number;
}

/** `chave` precisa ser ordenável como string (ISO-like: "2026-08",
 * "2026-Q3", "2026") — `label` é só o texto exibido. Bug real
 * corrigido aqui: agrupar direto por "Ago/2026" e ordenar como string
 * dava ordem alfabética ("Abr" antes de "Ago" antes de "Dez"...), não
 * cronológica. */
function agrupar(
  linhas: LinhaFinanceiro[],
  chaveDe: (l: LinhaFinanceiro) => { chave: string; label: string }
): GrupoDRE[] {
  const grupos = new Map<string, GrupoDRE>();
  for (const l of linhas) {
    const { chave, label } = chaveDe(l);
    const atual = grupos.get(chave) ?? { chave, label, eventos: 0, receita: 0, custo: 0 };
    atual.eventos += 1;
    atual.receita += l.receita;
    atual.custo += l.custo;
    grupos.set(chave, atual);
  }
  return Array.from(grupos.values()).sort((a, b) => (a.chave < b.chave ? 1 : a.chave > b.chave ? -1 : 0));
}

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function chaveMes(dataIso: string): { chave: string; label: string } {
  const [anoStr, mesStr] = dataIso.split("-");
  return { chave: `${anoStr}-${mesStr}`, label: `${NOMES_MES[Number(mesStr) - 1]}/${anoStr}` };
}

function chaveTrimestre(dataIso: string): { chave: string; label: string } {
  const [anoStr, mesStr] = dataIso.split("-");
  const trimestre = Math.ceil(Number(mesStr) / 3);
  return { chave: `${anoStr}-Q${trimestre}`, label: `T${trimestre}/${anoStr}` };
}

function chaveAno(dataIso: string): { chave: string; label: string } {
  const anoStr = dataIso.split("-")[0];
  return { chave: anoStr, label: anoStr };
}

export default async function DrePage() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let linhas: LinhaFinanceiro[] = [];
  let error: { message: string } | null = null;

  if (supabase) {
    const [resultEventos, resultEscalas, precoAlimentacao] = await Promise.all([
      supabase
        .from("eventos")
        .select("id, nome, data_inicio, valor_fechamento, custo_estimado, clientes(nome), eventos_financeiro(pago_bombeiros_status, recebido_cliente_status)")
        .order("data_inicio", { ascending: false }),
      supabase.from("escalas").select("evento_id, valor").eq("tipo", "titular"),
      buscarPrecoAlimentacao(supabase),
    ]);

    error = resultEventos.error ?? resultEscalas.error;

    linhas = calcularLinhasFinanceiro(
      (resultEventos.data ?? []) as unknown as EventoFinanceiroRow[],
      resultEscalas.data ?? [],
      precoAlimentacao
    );
  }

  const porCliente = agrupar(linhas, (l) => ({ chave: l.cliente, label: l.cliente })).sort(
    (a, b) => b.receita - a.receita
  );
  const porMes = agrupar(linhas, (l) => chaveMes(l.dataInicio));
  const porTrimestre = agrupar(linhas, (l) => chaveTrimestre(l.dataInicio));
  const porAno = agrupar(linhas, (l) => chaveAno(l.dataInicio));

  return (
    <div>
      <div className="mb-6">
        <Link href="/financeiro" className="mb-2 inline-block text-[12.5px]" style={{ color: "var(--text-soft)" }}>
          ← Financeiro
        </Link>
        <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          DRE
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Receita, custo e lucro somados por cliente e por período — mesmo cálculo da tela Financeiro.
        </p>
      </div>

      {demo && <DemoBanner />}
      {error && (
        <div className="panel-block mb-4 p-4 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar DRE: {error.message}
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
          Por cliente
        </h2>
        <GrupoTabela grupos={porCliente} vazio="Nenhum evento cadastrado ainda." />
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
          Por mês
        </h2>
        <GrupoTabela grupos={porMes} vazio="Nenhum evento cadastrado ainda." />
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
          Por trimestre
        </h2>
        <GrupoTabela grupos={porTrimestre} vazio="Nenhum evento cadastrado ainda." />
      </div>

      <div>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
          Por ano
        </h2>
        <GrupoTabela grupos={porAno} vazio="Nenhum evento cadastrado ainda." />
      </div>
    </div>
  );
}

function GrupoTabela({ grupos, vazio }: { grupos: GrupoDRE[]; vazio: string }) {
  return (
    <div className="panel-block">
      <div className="overflow-x-auto">
        <table className="min-w-[560px]">
          <thead>
            <tr>
              <th></th>
              <th>Eventos</th>
              <th>Receita</th>
              <th>Custo</th>
              <th>Lucro</th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center" style={{ color: "var(--text-faint)" }}>
                  {vazio}
                </td>
              </tr>
            ) : (
              grupos.map((g) => {
                const lucro = g.receita - g.custo;
                return (
                  <tr key={g.chave}>
                    <td className="font-semibold">{g.label}</td>
                    <td className="num">{g.eventos}</td>
                    <td className="num">{fmtMoney(g.receita)}</td>
                    <td className="num">{fmtMoney(g.custo)}</td>
                    <td className="num" style={{ color: lucro < 0 ? "var(--crit)" : undefined }}>
                      {fmtMoney(lucro)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
