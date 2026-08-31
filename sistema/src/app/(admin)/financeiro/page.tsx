import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { DemoBanner } from "@/components/DemoBanner";
import { buscarPrecoAlimentacao } from "@/lib/precos";
import { FinanceiroTabela, type LinhaFinanceiro } from "./FinanceiroTabela";
import { calcularLinhasFinanceiro, type EventoFinanceiroRow } from "./calculo";

export const dynamic = "force-dynamic";

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível atualizar o status. Tente novamente.",
};

export default async function FinanceiroPage({ searchParams }: PageProps<"/financeiro">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const params = await searchParams;
  const erroParam = typeof params?.erro === "string" ? params.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

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

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Financeiro
          </h1>
          <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            Resultado por evento — o que é cobrado do cliente, o que é pago aos bombeiros e a margem líquida.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export/financeiro" className="btn">
            Exportar CSV
          </a>
          <Link href="/financeiro/dre" className="btn">
            Ver DRE
          </Link>
        </div>
      </div>

      {demo && <DemoBanner />}
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
          Erro ao carregar financeiro: {error.message}
        </div>
      )}

      <FinanceiroTabela linhas={linhas} />

      <div
        className="mt-4 rounded-md border px-4 py-3 text-[13px]"
        style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--text-soft)" }}
      >
        Clique no nome de um evento para ver a folha de pagamento (chave PIX e valor de cada titular escalado).
      </div>
    </div>
  );
}
