"use client";

import { useActionState, useState } from "react";
import { atualizarMeusDados, type AtualizarMeusDadosState } from "./actions";
import { mascararTelefone } from "@/lib/validation/mascara";

const initialState: AtualizarMeusDadosState = { error: null, sucesso: false };

interface MeusDadosFormProps {
  telefone: string | null;
  chavePix: string | null;
}

export function MeusDadosForm({ telefone, chavePix }: MeusDadosFormProps) {
  const [state, formAction, pending] = useActionState(atualizarMeusDados, initialState);
  const [telefoneValor, setTelefoneValor] = useState(telefone ?? "");

  return (
    <form action={formAction}>
      {state.error && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {state.error}
        </div>
      )}
      {state.sucesso && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--ok)", background: "var(--ok-bg)", color: "var(--ok)" }}
        >
          Dados atualizados.
        </div>
      )}

      <div className="field mb-4">
        <label htmlFor="telefone">Telefone</label>
        <input
          type="text"
          id="telefone"
          name="telefone"
          placeholder="(31) 90000-0000"
          maxLength={15}
          value={telefoneValor}
          onChange={(e) => setTelefoneValor(mascararTelefone(e.target.value))}
          required
        />
      </div>

      <div className="field mb-4">
        <label htmlFor="chave_pix">Chave PIX</label>
        <input
          type="text"
          id="chave_pix"
          name="chave_pix"
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          maxLength={140}
          defaultValue={chavePix ?? ""}
          required
        />
      </div>

      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
