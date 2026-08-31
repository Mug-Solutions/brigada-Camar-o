"use client";

import Link from "next/link";
import { fmtMoney } from "@/lib/domain";
import { atualizarStatusPagamentoBombeiros, atualizarStatusRecebimentoCliente } from "./actions";

export interface LinhaFinanceiro {
  eventoId: string;
  nome: string;
  cliente: string;
  dataInicio: string;
  receita: number;
  custo: number;
  custoEstimado: boolean;
  statusPagamento: "Pendente" | "Pago" | "Atrasado";
  statusRecebimento: "Pendente" | "Recebido" | "Atrasado";
}

const STATUS_PAGAMENTO = ["Pendente", "Pago", "Atrasado"] as const;
const STATUS_RECEBIMENTO = ["Pendente", "Recebido", "Atrasado"] as const;

function corStatus(status: string): { color: string; background: string } {
  if (status === "Pago" || status === "Recebido") return { color: "var(--ok)", background: "var(--ok-bg)" };
  if (status === "Atrasado") return { color: "var(--crit)", background: "var(--crit-bg)" };
  return { color: "var(--warn)", background: "var(--warn-bg)" };
}

export function FinanceiroTabela({ linhas }: { linhas: LinhaFinanceiro[] }) {
  const totalReceita = linhas.reduce((soma, l) => soma + l.receita, 0);
  const totalCusto = linhas.reduce((soma, l) => soma + l.custo, 0);
  const totalLucro = totalReceita - totalCusto;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="panel-block p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Receita total
          </div>
          <div className="num mt-1 text-[22px]" style={{ fontFamily: "var(--font-display)" }}>
            {fmtMoney(totalReceita)}
          </div>
        </div>
        <div className="panel-block p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Custo total
          </div>
          <div className="num mt-1 text-[22px]" style={{ fontFamily: "var(--font-display)" }}>
            {fmtMoney(totalCusto)}
          </div>
        </div>
        <div className="panel-block p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Lucro total
          </div>
          <div className="num mt-1 text-[22px]" style={{ fontFamily: "var(--font-display)" }}>
            {fmtMoney(totalLucro)}
          </div>
        </div>
      </div>

      <div className="panel-block">
        <div className="overflow-x-auto">
          <table className="min-w-[880px]">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Cliente</th>
                <th>Receita</th>
                <th>Custo</th>
                <th>Lucro</th>
                <th>Pago aos bombeiros</th>
                <th>Recebido do cliente</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhum evento cadastrado ainda.
                  </td>
                </tr>
              ) : (
                linhas.map((l) => {
                  const lucro = l.receita - l.custo;
                  return (
                    <tr key={l.eventoId}>
                      <td className="font-semibold">
                        <Link href={`/financeiro/${l.eventoId}`} className="hover:underline">
                          {l.nome}
                        </Link>
                      </td>
                      <td>{l.cliente}</td>
                      <td className="num">{fmtMoney(l.receita)}</td>
                      <td className="num">
                        {fmtMoney(l.custo)}
                        {l.custoEstimado && (
                          <span className="ml-1 text-[10.5px]" style={{ color: "var(--text-faint)" }}>
                            (estimado)
                          </span>
                        )}
                      </td>
                      <td className="num" style={{ color: lucro < 0 ? "var(--crit)" : undefined }}>
                        {fmtMoney(lucro)}
                      </td>
                      <td>
                        <form action={atualizarStatusPagamentoBombeiros}>
                          <input type="hidden" name="evento_id" value={l.eventoId} />
                          {/* key força remontar o <select> quando o status confirmado
                              pelo servidor muda — sem isso, defaultValue só é aplicado
                              na montagem inicial e o elemento pode ficar mostrando um
                              valor que já não bate mais com o banco depois de um
                              revalidate (achado real testando: "mudei e voltou sozinho"). */}
                          <select
                            key={l.statusPagamento}
                            name="status"
                            defaultValue={l.statusPagamento}
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                            style={corStatus(l.statusPagamento)}
                          >
                            {STATUS_PAGAMENTO.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </form>
                      </td>
                      <td>
                        <form action={atualizarStatusRecebimentoCliente}>
                          <input type="hidden" name="evento_id" value={l.eventoId} />
                          <select
                            key={l.statusRecebimento}
                            name="status"
                            defaultValue={l.statusRecebimento}
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                            style={corStatus(l.statusRecebimento)}
                          >
                            {STATUS_RECEBIMENTO.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
