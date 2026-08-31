"use client";

import { useActionState } from "react";
import { solicitarAtualizacaoDocumento, type SolicitarDocumentoState } from "./actions";

const initialState: SolicitarDocumentoState = { error: null, sucesso: false };

interface AtualizarDocumentoFormProps {
  tipoDocumento: "aso" | "credenciamento";
  label: string;
}

export function AtualizarDocumentoForm({ tipoDocumento, label }: AtualizarDocumentoFormProps) {
  const [state, formAction, pending] = useActionState(solicitarAtualizacaoDocumento, initialState);

  if (state.sucesso) {
    return (
      <p className="text-[12.5px]" style={{ color: "var(--ok)" }}>
        Pedido enviado — aguardando aprovação da coordenação.
      </p>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="tipo_documento" value={tipoDocumento} />
      <div className="flex items-end gap-2">
        <div className="field flex-1">
          <label htmlFor={`data_nova_${tipoDocumento}`}>{label}</label>
          <input type="date" id={`data_nova_${tipoDocumento}`} name="data_nova" required />
        </div>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {state.error && (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--crit)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
