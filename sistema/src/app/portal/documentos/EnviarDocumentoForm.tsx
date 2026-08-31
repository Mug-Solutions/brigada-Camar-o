"use client";

import { useActionState, useRef } from "react";
import { enviarDocumento, type EnviarDocumentoState } from "./actions";

const initialState: EnviarDocumentoState = { error: null, sucesso: false };

interface EnviarDocumentoFormProps {
  tipoDocumento: "aso" | "credenciamento" | "curso";
  label: string;
}

export function EnviarDocumentoForm({ tipoDocumento, label }: EnviarDocumentoFormProps) {
  const [state, formAction, pending] = useActionState(enviarDocumento, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
    >
      <input type="hidden" name="tipo_documento" value={tipoDocumento} />
      <div className="flex items-end gap-2">
        <div className="field flex-1">
          <label htmlFor={`arquivo_${tipoDocumento}`}>{label}</label>
          <input
            type="file"
            id={`arquivo_${tipoDocumento}`}
            name="arquivo"
            accept="application/pdf,image/jpeg,image/png"
            required
          />
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
      {state.sucesso && (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--ok)" }}>
          Enviado.
        </p>
      )}
    </form>
  );
}
