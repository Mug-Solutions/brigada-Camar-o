"use client";

import { useActionState, useRef, useState } from "react";
import { TAMANHO_MAXIMO_DOCUMENTO_BYTES } from "@/lib/constants";
import { enviarDocumento, type EnviarDocumentoState } from "./actions";

const initialState: EnviarDocumentoState = { error: null, sucesso: false };
const TAMANHO_MAXIMO_MB = TAMANHO_MAXIMO_DOCUMENTO_BYTES / (1024 * 1024);

interface EnviarDocumentoFormProps {
  tipoDocumento: "aso" | "credenciamento" | "curso";
  label: string;
}

export function EnviarDocumentoForm({ tipoDocumento, label }: EnviarDocumentoFormProps) {
  const [state, formAction, pending] = useActionState(enviarDocumento, initialState);
  const [erroTamanho, setErroTamanho] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        // Acima do limite do body das Server Actions (next.config.ts),
        // o Next.js rejeita com um 413 genérico antes da Server Action
        // rodar — a página trava numa tela de erro de rede em vez da
        // mensagem amigável (achado real: fotos de celular em
        // resolução máxima passam fácil dos 5MB aceitos aqui). Barra
        // no cliente antes de sequer tentar mandar pro servidor.
        const arquivo = formData.get("arquivo");
        if (arquivo instanceof File && arquivo.size > TAMANHO_MAXIMO_DOCUMENTO_BYTES) {
          setErroTamanho(`Arquivo maior que ${TAMANHO_MAXIMO_MB}MB — comprima ou tire uma foto com menos resolução.`);
          return;
        }
        setErroTamanho(null);
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
            onChange={() => setErroTamanho(null)}
          />
        </div>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {(erroTamanho ?? state.error) && (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--crit)" }}>
          {erroTamanho ?? state.error}
        </p>
      )}
      {!erroTamanho && state.sucesso && (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--ok)" }}>
          Enviado.
        </p>
      )}
    </form>
  );
}
