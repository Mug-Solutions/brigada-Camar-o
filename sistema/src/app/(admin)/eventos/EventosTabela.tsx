"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { fmtDateBR, fmtMoney } from "@/lib/domain";
import { Chip } from "@/components/Chip";
import type { Evento } from "@/lib/types";
import { aprovarOrcamentoEvento, atualizarCustoEvento, cancelarEvento, concluirEvento } from "./actions";
import { ExcluirEventoButton } from "./[id]/ExcluirEventoButton";
import type { EscalaComBombeiro } from "./page";

type EventoComCliente = Evento & { clientes: { nome: string } | null };

interface EventosTabelaProps {
  eventos: EventoComCliente[];
  escalas: EscalaComBombeiro[];
  precoAlimentacao: number;
}

export function EventosTabela({ eventos, escalas, precoAlimentacao }: EventosTabelaProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);

  return (
    <table className="min-w-[720px]">
      <thead>
        <tr>
          <th>Evento</th>
          <th>Cliente</th>
          <th>Data</th>
          <th>Qtd. Bombeiro</th>
          <th>Status da escala</th>
          <th>Valor Fechamento</th>
          <th>Custo do evento</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {eventos.map((e) => {
          const aberto = abertoId === e.id;
          const escalasDoEvento = escalas.filter((esc) => esc.evento_id === e.id);
          const titulares = escalasDoEvento.filter((esc) => esc.tipo === "titular");
          const reservas = escalasDoEvento.filter((esc) => esc.tipo === "reserva");
          const somaTitulares = titulares.reduce((soma, t) => soma + Number(t.valor), 0);
          // Custo automático = pago aos bombeiros + alimentação (diárias
          // × valor configurado em /precos) — mesma fórmula usada em
          // financeiro/calculo.ts, pra não pré-preencher um valor
          // diferente do que a tela Financeiro depois vai mostrar.
          const custoAtual = e.custo_estimado ?? somaTitulares + titulares.length * precoAlimentacao;
          const escalaStatus = titulares.length === 0
            ? { level: "crit" as const, label: "Sem escala" }
            : titulares.length < e.quantitativo_bombeiros
              ? { level: "warn" as const, label: `${titulares.length}/${e.quantitativo_bombeiros} escalados` }
              : { level: "ok" as const, label: `${titulares.length}/${e.quantitativo_bombeiros} escalados` };

          return (
            <Fragment key={e.id}>
              <tr>
                <td className="font-semibold">
                  <button
                    type="button"
                    onClick={() => setAbertoId(aberto ? null : e.id)}
                    className="text-left hover:underline"
                  >
                    {e.nome}
                  </button>
                  <span className="mt-0.5 block text-[11.5px] font-normal" style={{ color: "var(--text-faint)" }}>
                    {e.local}
                  </span>
                </td>
                <td>{e.clientes?.nome ?? "—"}</td>
                <td className="num">
                  {fmtDateBR(e.data_inicio)}
                  {e.data_fim !== e.data_inicio ? ` – ${fmtDateBR(e.data_fim)}` : ""}
                </td>
                <td className="num">{e.quantitativo_bombeiros}</td>
                <td>
                  <Chip level={escalaStatus.level} label={escalaStatus.label} />
                </td>
                <td className="num">{fmtMoney(Number(e.valor_fechamento))}</td>
                <td>
                  <form action={atualizarCustoEvento}>
                    <input type="hidden" name="evento_id" value={e.id} />
                    {/* key força remontar quando o valor confirmado pelo servidor
                        muda — mesmo achado real corrigido em FinanceiroTabela.tsx. */}
                    <input
                      key={custoAtual}
                      type="number"
                      name="custo_estimado"
                      min={0}
                      step="0.01"
                      defaultValue={custoAtual}
                      className="w-[100px]"
                      onBlur={(ev) => ev.currentTarget.form?.requestSubmit()}
                    />
                  </form>
                </td>
                <td>
                  <span className="pill">{e.status}</span>
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    {e.status === "Planejamento" && (
                      <>
                        <form action={aprovarOrcamentoEvento}>
                          <input type="hidden" name="evento_id" value={e.id} />
                          <button type="submit" className="btn btn--primary">
                            Aprovar orçamento
                          </button>
                        </form>
                        <ExcluirEventoButton eventoId={e.id} nomeEvento={e.nome} />
                      </>
                    )}
                    {e.status === "Confirmado" && (
                      <>
                        <form action={concluirEvento}>
                          <input type="hidden" name="evento_id" value={e.id} />
                          <button type="submit" className="btn">
                            Marcar concluído
                          </button>
                        </form>
                        <form
                          action={cancelarEvento}
                          onSubmit={(ev) => {
                            if (!confirm(`Cancelar "${e.nome}"? Libera os bombeiros já escalados que ainda não trabalharam nesse evento.`)) {
                              ev.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="evento_id" value={e.id} />
                          <button type="submit" className="btn" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>
                            Cancelar
                          </button>
                        </form>
                        <ExcluirEventoButton eventoId={e.id} nomeEvento={e.nome} />
                      </>
                    )}
                    {e.status === "Concluído" && (
                      <Link href={`/financeiro/${e.id}/pix`} className="btn btn--primary">
                        PIX
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
              {aberto && (
                <tr>
                  <td colSpan={9} className="bg-[var(--surface)] p-0">
                    <div className="p-5">
                      <div className="mb-4">
                        <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                          Materiais
                        </div>
                        <div className="text-[13px]">{e.materiais ?? "—"}</div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <EscalaLista titulo="Titulares" linhas={titulares} vazio="Nenhum titular escalado ainda." />
                        <EscalaLista titulo="Lista de reserva" linhas={reservas} vazio="Nenhum reserva escalado ainda." />
                      </div>

                      <div className="mt-4">
                        <Link href={`/eventos/${e.id}`} className="btn btn--primary">
                          Montar escala →
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function EscalaLista({
  titulo,
  linhas,
  vazio,
}: {
  titulo: string;
  linhas: EscalaComBombeiro[];
  vazio: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {titulo}
      </div>
      {linhas.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: "var(--text-faint)" }}>
          {vazio}
        </p>
      ) : (
        <ul className="space-y-1">
          {linhas.map((esc) => (
            <li key={esc.id} className="text-[13px]">
              <span className="font-semibold">{esc.bombeiros?.nome ?? "—"}</span>{" "}
              <span style={{ color: "var(--text-soft)" }}>
                — {fmtDateBR(esc.data)} · {esc.turno} · {fmtMoney(Number(esc.valor))}
                {esc.horario_cumprido ? ` · Ponto: ${esc.horario_cumprido}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
