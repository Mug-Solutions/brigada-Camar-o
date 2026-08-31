import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { fmtDateBR, fmtMoney } from "@/lib/domain";
import { MarcarPagoCheckbox } from "./MarcarPagoCheckbox";

export const dynamic = "force-dynamic";

type LinhaFolha = {
  id: string;
  data: string;
  turno: string;
  valor: number;
  pago: boolean;
  bombeiros: { nome: string; chave_pix: string | null } | null;
};

export default async function FolhaPagamentoPage({ params, searchParams }: PageProps<"/financeiro/[id]">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const mensagemErro = sp?.erro === "1" ? "Não foi possível concluir a ação. Tente novamente." : null;

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return (
      <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        Folha de pagamento exige um projeto Supabase configurado — não disponível no modo de demonstração.
      </div>
    );
  }

  const [{ data: evento }, { data: escalasData, error }, { data: financeiro }] = await Promise.all([
    supabase.from("eventos").select("nome, clientes(nome)").eq("id", id).maybeSingle(),
    supabase
      .from("escalas")
      .select("id, data, turno, valor, pago, bombeiros(nome, chave_pix)")
      .eq("evento_id", id)
      .eq("tipo", "titular")
      .order("data", { ascending: true }),
    supabase.from("eventos_financeiro").select("pago_bombeiros_status").eq("evento_id", id).maybeSingle(),
  ]);

  if (!evento) notFound();

  const eventoTyped = evento as unknown as { nome: string; clientes: { nome: string } | null };
  const linhas = (escalasData ?? []) as unknown as LinhaFolha[];
  const total = linhas.reduce((soma, l) => soma + Number(l.valor), 0);
  const semPix = linhas.filter((l) => !l.bombeiros?.chave_pix);
  const pagos = linhas.filter((l) => l.pago).length;
  const statusPagamento = financeiro?.pago_bombeiros_status ?? "Pendente";

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/financeiro" className="mb-2 inline-block text-[12.5px]" style={{ color: "var(--text-soft)" }}>
            ← Financeiro
          </Link>
          <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Folha de Pagamento
          </h1>
          <p className="text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            {eventoTyped.nome} · {eventoTyped.clientes?.nome ?? "Sem cliente"}
            {linhas.length > 0 && (
              <>
                {" "}
                · {pagos}/{linhas.length} pagos · <span className="pill">{statusPagamento}</span>
              </>
            )}
          </p>
        </div>
        <a href={`/api/export/folha-pagamento/${id}`} className="btn">
          Exportar CSV
        </a>
      </div>

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
          Erro ao carregar folha: {error.message}
        </div>
      )}
      {semPix.length > 0 && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }}
        >
          {semPix.length} bombeiro(s) sem chave PIX cadastrada — não dá pra pagar até isso ser preenchido.
        </div>
      )}

      <div className="panel-block">
        <div className="overflow-x-auto">
          <table className="min-w-[640px]">
            <thead>
              <tr>
                <th>Pago</th>
                <th>Bombeiro</th>
                <th>Chave PIX</th>
                <th>Data</th>
                <th>Turno</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhum titular escalado neste evento ainda.
                  </td>
                </tr>
              ) : (
                linhas.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <MarcarPagoCheckbox escalaId={l.id} eventoId={id} pago={l.pago} />
                    </td>
                    <td className="font-semibold">{l.bombeiros?.nome ?? "—"}</td>
                    <td style={{ color: l.bombeiros?.chave_pix ? undefined : "var(--warn)" }}>
                      {l.bombeiros?.chave_pix ?? "Sem chave cadastrada"}
                    </td>
                    <td className="num">{fmtDateBR(l.data)}</td>
                    <td>{l.turno}</td>
                    <td className="num">{fmtMoney(Number(l.valor))}</td>
                  </tr>
                ))
              )}
            </tbody>
            {linhas.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-semibold">
                    Total
                  </td>
                  <td className="num font-semibold">{fmtMoney(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
