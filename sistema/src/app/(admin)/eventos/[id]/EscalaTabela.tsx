"use client";

import { fmtDateBR, fmtMoney } from "@/lib/domain";
import { Chip } from "@/components/Chip";
import { registrarPonto, removerEscala } from "./actions";
import type { EscalaComBombeiro } from "./page";

interface EscalaTabelaProps {
  titulo: string;
  linhas: EscalaComBombeiro[];
  eventoId: string;
  vazio: string;
}

export function EscalaTabela({ titulo, linhas, eventoId, vazio }: EscalaTabelaProps) {
  return (
    <div>
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
        {titulo}
      </h2>
      <div className="panel-block">
        <div className="overflow-x-auto">
          <table className="min-w-[560px]">
            <thead>
              <tr>
                <th>Bombeiro</th>
                <th>Data</th>
                <th>Turno</th>
                <th>Valor</th>
                <th>Confirmação</th>
                <th>Ponto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center" style={{ color: "var(--text-faint)" }}>
                    {vazio}
                  </td>
                </tr>
              ) : (
                linhas.map((e) => (
                  <tr key={e.id}>
                    <td className="font-semibold">{e.bombeiros?.nome ?? "—"}</td>
                    <td className="num">{fmtDateBR(e.data)}</td>
                    <td>{e.turno}</td>
                    <td className="num">{fmtMoney(Number(e.valor))}</td>
                    <td>
                      <Chip
                        level={e.status_confirmacao === "confirmado" ? "ok" : "warn"}
                        label={e.status_confirmacao === "confirmado" ? "Confirmado" : "Pendente"}
                      />
                    </td>
                    <td>
                      <form action={registrarPonto}>
                        <input type="hidden" name="escala_id" value={e.id} />
                        <input type="hidden" name="evento_id" value={eventoId} />
                        <input
                          type="text"
                          name="horario_cumprido"
                          defaultValue={e.horario_cumprido ?? ""}
                          placeholder="08:00–18:00"
                          className="w-[110px]"
                          onBlur={(ev) => ev.currentTarget.form?.requestSubmit()}
                        />
                      </form>
                    </td>
                    <td>
                      <form action={removerEscala}>
                        <input type="hidden" name="escala_id" value={e.id} />
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
      </div>
    </div>
  );
}
