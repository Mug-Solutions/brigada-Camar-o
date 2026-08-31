"use client";

import { excluirEvento } from "./actions";

interface ExcluirEventoButtonProps {
  eventoId: string;
  nomeEvento: string;
}

/** Confirmação nativa antes de submeter — exclusão cascateia pra
 * escalas/candidaturas (ver comentário em excluirEvento, eventos/[id]/actions.ts)
 * e não tem desfazer, então merece uma pausa antes de disparar. */
export function ExcluirEventoButton({ eventoId, nomeEvento }: ExcluirEventoButtonProps) {
  return (
    <form
      action={excluirEvento}
      onSubmit={(e) => {
        if (!confirm(`Excluir "${nomeEvento}"? Isso remove também a escala e as candidaturas desse evento. Não tem como desfazer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="evento_id" value={eventoId} />
      <button type="submit" className="btn" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>
        Excluir
      </button>
    </form>
  );
}
