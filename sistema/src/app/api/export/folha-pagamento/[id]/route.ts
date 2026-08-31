import Papa from "papaparse";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { escaparParaCsv } from "@/lib/validation/csv-seguro";

/**
 * Fase 5 do roadmap (Integrações): "adaptador de exportação para
 * folha de pagamento". Mesma decisão do adaptador de ERP (ver
 * src/app/api/export/financeiro/route.ts) — provedor concreto de
 * folha de pagamento ainda não informado pelo cliente, então esta
 * rota exporta CSV genérico com o que qualquer sistema de pagamento
 * em lote (inclusive PIX em lote direto no internet banking) precisa:
 * nome, CPF, chave PIX e valor.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await requireStaff();
  if (!acesso.ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Exportação exige um projeto Supabase configurado." }, { status: 503 });
  }

  const [{ data: evento }, { data: escalasData, error }] = await Promise.all([
    supabase.from("eventos").select("nome").eq("id", id).maybeSingle(),
    supabase
      .from("escalas")
      .select("data, turno, valor, bombeiros(nome, cpf, chave_pix)")
      .eq("evento_id", id)
      .eq("tipo", "titular")
      .order("data", { ascending: true }),
  ]);

  if (!evento) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type LinhaFolha = {
    data: string;
    turno: string;
    valor: number;
    bombeiros: { nome: string; cpf: string; chave_pix: string | null } | null;
  };
  const linhas = (escalasData ?? []) as unknown as LinhaFolha[];

  const csv = Papa.unparse(
    linhas.map((l) => ({
      // escaparParaCsv() é defesa em profundidade pra dado gravado
      // antes da validação de entrada existir (ver criarBombeiro/
      // enviarDadosCadastro) — CPF não precisa (formato só dígitos e
      // pontuação, nunca começa com =+-@).
      Bombeiro: escaparParaCsv(l.bombeiros?.nome ?? ""),
      CPF: l.bombeiros?.cpf ?? "",
      "Chave PIX": escaparParaCsv(l.bombeiros?.chave_pix ?? ""),
      Data: l.data,
      Turno: l.turno,
      Valor: Number(l.valor).toFixed(2),
    }))
  );

  const nomeArquivo = `folha-pagamento-${(evento as { nome: string }).nome.replace(/[^a-zA-Z0-9]+/g, "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store, private",
    },
  });
}
