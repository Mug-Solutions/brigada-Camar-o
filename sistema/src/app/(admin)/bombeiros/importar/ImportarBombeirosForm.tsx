"use client";

import { useActionState } from "react";
import { importarBombeiros, type ImportarBombeirosState } from "./actions";

const initialState: ImportarBombeirosState = { error: null, resultado: null };

export function ImportarBombeirosForm() {
  const [state, formAction, pending] = useActionState(importarBombeiros, initialState);

  return (
    <div>
      <form action={formAction} className="panel-block max-w-[480px] p-6">
        {state.error && (
          <div
            className="mb-4 rounded-md border px-4 py-3 text-[13px]"
            style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
          >
            {state.error}
          </div>
        )}
        <div className="field mb-4">
          <label htmlFor="arquivo">Arquivo CSV</label>
          <input type="file" id="arquivo" name="arquivo" accept=".csv,text/csv" required />
        </div>
        <button type="submit" className="btn btn--primary w-full justify-center" disabled={pending}>
          {pending ? "Importando..." : "Importar"}
        </button>
      </form>

      {state.resultado && (
        <div className="panel-block mt-4 max-w-[480px] p-6">
          <p className="mb-2 text-[13px]">
            <span className="font-semibold" style={{ color: "var(--ok)" }}>
              {state.resultado.importados} importado(s)
            </span>
            {" · "}
            <span style={{ color: "var(--text-soft)" }}>{state.resultado.pulados} já existente(s), pulado(s)</span>
            {" · "}
            <span style={{ color: state.resultado.erros.length > 0 ? "var(--crit)" : "var(--text-soft)" }}>
              {state.resultado.erros.length} com erro
            </span>
          </p>
          {state.resultado.erros.length > 0 && (
            <ul className="mt-3 space-y-1 text-[12.5px]" style={{ color: "var(--crit)" }}>
              {state.resultado.erros.map((e) => (
                <li key={e.linha}>
                  Linha {e.linha}: {e.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
