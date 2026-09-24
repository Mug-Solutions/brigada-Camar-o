"use client";

import { useActionState, useState } from "react";
import { fmtDateBR } from "@/lib/domain";
import { cargaHorariaMinutos, fmtCargaHoraria, fmtHora } from "@/lib/documentos-cliente/dados";
import type { LinhaProgramacao } from "@/lib/documentos-cliente/carregar";
import { adicionarProgramacao, removerProgramacao, type ProgramacaoFormState } from "./actions";

const initialState: ProgramacaoFormState = { error: null };

interface ProgramacaoEventoProps {
  eventoId: string;
  dataInicio: string;
  dataFim: string;
  linhas: LinhaProgramacao[];
  quantitativoBombeiros: number;
}

/**
 * Dias, horários e quantidade de brigadistas combinados com o cliente
 * — é exatamente a tabela que sai no orçamento e no contrato.
 */
export function ProgramacaoEvento({
  eventoId,
  dataInicio,
  dataFim,
  linhas,
  quantitativoBombeiros,
}: ProgramacaoEventoProps) {
  const [state, formAction, pending] = useActionState(adicionarProgramacao, initialState);
  // Controlada: o React 19 limpa o formulário depois de cada envio, e
  // a data deve ficar (o normal é cadastrar vários horários do mesmo
  // dia). Horário pode ser limpo mesmo. Qtd. Bomb. volta a ser
  // pré-preenchida com o quantitativo definido na criação do evento —
  // pedido do cliente pra não precisar redigitar o mesmo número toda
  // vez, mas continua editável por linha (dia/turno pode precisar de
  // uma quantidade diferente do resto do evento).
  const [data, setData] = useState(dataInicio);
  const [quantidade, setQuantidade] = useState(String(quantitativoBombeiros));

  return (
    <div>
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
        Programação combinada com o cliente
      </h2>
      <div className="panel-block">
        <div className="overflow-x-auto">
          <table className="min-w-[560px]">
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Carga horária</th>
                <th>Qtd. Bomb.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhum horário cadastrado. É esta tabela que sai no orçamento e no contrato.
                  </td>
                </tr>
              ) : (
                linhas.map((l) => (
                  <tr key={l.id}>
                    <td className="num">{fmtDateBR(l.data)}</td>
                    <td className="num">
                      {fmtHora(l.hora_inicio)} às {fmtHora(l.hora_fim)}
                    </td>
                    <td className="num">{fmtCargaHoraria(cargaHorariaMinutos(l.hora_inicio, l.hora_fim))}</td>
                    <td className="num">{l.quantidade}</td>
                    <td>
                      <form action={removerProgramacao}>
                        <input type="hidden" name="programacao_id" value={l.id} />
                        <input type="hidden" name="evento_id" value={eventoId} />
                        <button type="submit" className="btn">
                          Remover
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form action={formAction} className="border-t p-4" style={{ borderColor: "var(--line)" }}>
          <input type="hidden" name="evento_id" value={eventoId} />
          <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] sm:items-end">
            <div className="field">
              <label htmlFor="prog-data">Data</label>
              <input id="prog-data" type="date" name="data" value={data} onChange={(e) => setData(e.target.value)} min={dataInicio} max={dataFim} required />
            </div>
            <div className="field">
              <label htmlFor="prog-inicio">Início</label>
              <input id="prog-inicio" type="time" name="hora_inicio" required />
            </div>
            <div className="field">
              <label htmlFor="prog-fim">Fim</label>
              <input id="prog-fim" type="time" name="hora_fim" required />
            </div>
            <div className="field">
              <label htmlFor="prog-qtd">Qtd. Bomb.</label>
              <input
                id="prog-qtd"
                type="number"
                name="quantidade"
                min={1}
                max={999}
                step={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn--primary justify-center" disabled={pending}>
              {pending ? "Salvando..." : "Adicionar"}
            </button>
          </div>
          {state.error && (
            <p className="mt-2 text-[12.5px]" style={{ color: "var(--crit)" }}>
              {state.error}
            </p>
          )}
          <p className="mt-2 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
            Fim menor que o início conta como virada da meia-noite (ex.: 18:00 às 00:00 = 6h).
          </p>
        </form>
      </div>
    </div>
  );
}
