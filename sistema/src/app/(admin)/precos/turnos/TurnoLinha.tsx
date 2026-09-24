"use client";

import { alternarTurnoAtivo, atualizarTurno, excluirTurno } from "./actions";

export interface TurnoLinhaProps {
  nome: string;
  horaInicio: string;
  horaFim: string;
  valor: number;
  ativo: boolean;
}

export function TurnoLinha({ nome, horaInicio, horaFim, valor, ativo }: TurnoLinhaProps) {
  return (
    <tr>
      <td className="font-semibold">{nome}</td>
      <td colSpan={3}>
        {/* Um form só pra horário início/fim/valor — editar qualquer um
            dos três reenvia os três juntos (o achado real de "key força
            remontar quando o valor do servidor muda" de PrecosTabela.tsx
            se aplica aqui igual). */}
        <form
          action={atualizarTurno}
          className="flex items-center gap-2"
          key={`${horaInicio}-${horaFim}-${valor}`}
        >
          <input type="hidden" name="nome" value={nome} />
          <input
            type="time"
            name="hora_inicio"
            defaultValue={horaInicio}
            className="w-[100px]"
            onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          />
          <span style={{ color: "var(--text-faint)" }}>às</span>
          <input
            type="time"
            name="hora_fim"
            defaultValue={horaFim}
            className="w-[100px]"
            onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          />
          <input
            type="number"
            name="valor"
            min={0}
            step="0.01"
            defaultValue={valor}
            className="w-[100px]"
            onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          />
        </form>
      </td>
      <td>
        <form action={alternarTurnoAtivo}>
          <input type="hidden" name="nome" value={nome} />
          <input
            key={String(ativo)}
            type="checkbox"
            name="ativo"
            defaultChecked={ativo}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            aria-label={`Turno ${ativo ? "ativo" : "inativo"}`}
          />
        </form>
      </td>
      <td>
        <form
          action={excluirTurno}
          onSubmit={(e) => {
            if (!confirm(`Excluir o turno "${nome}"? Só funciona se ele nunca tiver sido usado numa escala/disponibilidade.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="nome" value={nome} />
          <button type="submit" className="btn" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>
            Excluir
          </button>
        </form>
      </td>
    </tr>
  );
}
