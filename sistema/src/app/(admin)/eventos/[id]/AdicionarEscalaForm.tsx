"use client";

import { useActionState, useMemo, useState } from "react";
import { DIAS_SEMANA } from "@/lib/constants";
import { adicionarEscala, type EscalaFormState } from "./actions";

const initialState: EscalaFormState = { error: null };

interface Disponibilidade {
  bombeiro_id: string;
  dia_semana: string;
  turno: string;
  regiao: string | null;
}

interface AdicionarEscalaFormProps {
  eventoId: string;
  eventoLocal: string | null;
  dataInicio: string;
  dataFim: string;
  bombeiros: { id: string; nome: string }[];
  turnos: { nome: string; ini: string; fim: string; valor: number }[];
  disponibilidades: Disponibilidade[];
  bombeiroSelecionadoId?: string;
}

function diaSemanaDaData(data: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const indice = new Date(`${data}T00:00:00`).getDay();
  return DIAS_SEMANA[indice] ?? null;
}

export function AdicionarEscalaForm({
  eventoId,
  eventoLocal,
  dataInicio,
  dataFim,
  bombeiros,
  turnos,
  disponibilidades,
  bombeiroSelecionadoId,
}: AdicionarEscalaFormProps) {
  const [state, formAction, pending] = useActionState(adicionarEscala, initialState);
  const [bombeiroId, setBombeiroId] = useState(bombeiroSelecionadoId ?? bombeiros[0]?.id ?? "");
  const [data, setData] = useState(dataInicio);
  const [turno, setTurno] = useState(turnos[0]?.nome ?? "");

  const bombeirosPorId = useMemo(() => new Map(bombeiros.map((b) => [b.id, b])), [bombeiros]);

  // Fase 7 do roadmap: "sugestão automática de escala por
  // disponibilidade/proximidade". Disponibilidade = bombeiro tem uma
  // linha cadastrada pro mesmo dia da semana + turno da escala sendo
  // montada agora. "Proximidade" é uma aproximação honesta — não existe
  // endereço geocodificado no sistema ainda — usa a região (texto
  // livre da disponibilidade) contida no local do evento, ou o
  // contrário, como sinal de perto/longe.
  const sugeridos = useMemo(() => {
    const diaSemana = diaSemanaDaData(data);
    if (!diaSemana) return [];

    const localNormalizado = (eventoLocal ?? "").toLowerCase();

    // Um bombeiro pode ter mais de uma linha de disponibilidade batendo
    // (regiões diferentes no mesmo dia/turno) — dedup mantendo o
    // melhor resultado (com proximidade) se qualquer uma bater.
    const proximidadePorBombeiro = new Map<string, boolean>();
    for (const d of disponibilidades) {
      if (d.dia_semana !== diaSemana || d.turno !== turno || !bombeirosPorId.has(d.bombeiro_id)) continue;
      const regiaoNormalizada = (d.regiao ?? "").toLowerCase().trim();
      const proximidade =
        regiaoNormalizada.length > 0 &&
        (localNormalizado.includes(regiaoNormalizada) || regiaoNormalizada.includes(localNormalizado));
      proximidadePorBombeiro.set(d.bombeiro_id, proximidadePorBombeiro.get(d.bombeiro_id) || proximidade);
    }

    return Array.from(proximidadePorBombeiro.entries())
      .map(([id, proximidade]) => ({ id, nome: bombeirosPorId.get(id)?.nome ?? "—", proximidade }))
      .sort((a, b) => Number(b.proximidade) - Number(a.proximidade) || a.nome.localeCompare(b.nome));
  }, [data, turno, disponibilidades, bombeirosPorId, eventoLocal]);

  return (
    <form action={formAction}>
      <input type="hidden" name="evento_id" value={eventoId} />

      {state.error && (
        <div
          className="mb-4 rounded-md border px-3 py-2 text-[12.5px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {state.error}
        </div>
      )}

      <div className="field mb-3.5">
        <label htmlFor="bombeiro_id">Bombeiro</label>
        <select
          id="bombeiro_id"
          name="bombeiro_id"
          value={bombeiroId}
          onChange={(e) => setBombeiroId(e.target.value)}
          required
        >
          {bombeiros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="field mb-3.5">
        <label htmlFor="data">Data</label>
        <input
          type="date"
          id="data"
          name="data"
          min={dataInicio}
          max={dataFim}
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      <div className="field mb-3.5">
        <label htmlFor="turno">Turno</label>
        <select id="turno" name="turno" value={turno} onChange={(e) => setTurno(e.target.value)} required>
          {turnos.map((t) => (
            <option key={t.nome} value={t.nome}>
              {t.nome} ({t.ini}–{t.fim})
            </option>
          ))}
        </select>
      </div>

      {sugeridos.length > 0 && (
        <div className="field mb-3.5">
          <label>Sugeridos pra esse dia/turno</label>
          <div className="flex flex-wrap gap-1.5">
            {sugeridos.slice(0, 6).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setBombeiroId(s.id)}
                className="btn"
                style={
                  s.id === bombeiroId
                    ? { borderColor: "var(--accent)", color: "var(--accent)" }
                    : undefined
                }
              >
                {s.nome}
                {s.proximidade ? " · região" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field mb-4">
        <label htmlFor="tipo">Tipo</label>
        <select id="tipo" name="tipo" defaultValue="titular">
          <option value="titular">Titular</option>
          <option value="reserva">Reserva</option>
        </select>
      </div>

      <button type="submit" className="btn btn--primary w-full justify-center" disabled={pending}>
        {pending ? "Escalando..." : "Escalar"}
      </button>
    </form>
  );
}
