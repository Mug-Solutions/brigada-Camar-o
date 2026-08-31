import Papa from "papaparse";
import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { buscarPrecoAlimentacao } from "@/lib/precos";
import { escaparParaCsv } from "@/lib/validation/csv-seguro";
import { calcularLinhasFinanceiro, type EventoFinanceiroRow } from "@/app/(admin)/financeiro/calculo";

/**
 * Fase 5 do roadmap (Integrações): "adaptador de exportação para
 * ERP/contábil". Provedor concreto (qual ERP a Brigada Camarão usa)
 * ainda não foi informado pelo cliente — decisão já registrada em
 * docs/decisoes-tecnicas.md de construir atrás de uma camada estável
 * até essa resposta chegar. Esta rota é essa camada: CSV genérico,
 * importável em qualquer sistema, ou repassável manualmente pro
 * contador enquanto isso.
 */
export async function GET() {
  const acesso = await requireStaff();
  if (!acesso.ok) {
    return NextResponse.redirect(new URL("/login", process.env.SITE_URL ?? "http://localhost:3000"));
  }

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Exportação exige um projeto Supabase configurado." }, { status: 503 });
  }

  const [resultEventos, resultEscalas, precoAlimentacao] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, nome, data_inicio, valor_fechamento, custo_estimado, clientes(nome), eventos_financeiro(pago_bombeiros_status, recebido_cliente_status)")
      .order("data_inicio", { ascending: false }),
    supabase.from("escalas").select("evento_id, valor").eq("tipo", "titular"),
    buscarPrecoAlimentacao(supabase),
  ]);

  if (resultEventos.error) {
    return NextResponse.json({ error: resultEventos.error.message }, { status: 500 });
  }

  const linhas = calcularLinhasFinanceiro(
    (resultEventos.data ?? []) as unknown as EventoFinanceiroRow[],
    resultEscalas.data ?? [],
    precoAlimentacao
  );

  const csv = Papa.unparse(
    linhas.map((l) => ({
      // escaparParaCsv() é defesa em profundidade pra dado gravado
      // antes da validação de entrada existir (ver criarEvento/
      // criarCliente) — a validação em si já rejeita nome novo
      // começando com caractere de fórmula.
      Evento: escaparParaCsv(l.nome),
      Cliente: escaparParaCsv(l.cliente),
      Data: l.dataInicio,
      Receita: l.receita.toFixed(2),
      Custo: l.custo.toFixed(2),
      Lucro: (l.receita - l.custo).toFixed(2),
      "Status Pagamento Bombeiros": l.statusPagamento,
      "Status Recebimento Cliente": l.statusRecebimento,
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-brigada-camarao.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
