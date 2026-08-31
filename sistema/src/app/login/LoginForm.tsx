"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ pendente }: { pendente: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="panel-block w-full max-w-[380px] p-6">
      {pendente && !state.error && (
        <div
          className="mb-5 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }}
        >
          Seu cadastro ainda está em análise pela coordenação. Você será avisado quando for aprovado.
        </div>
      )}
      {state.error && (
        <div
          className="mb-5 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {state.error}
        </div>
      )}

      <div className="field mb-4">
        <label htmlFor="email">E-mail</label>
        <input type="email" id="email" name="email" autoComplete="email" required />
      </div>
      <div className="field mb-6">
        <label htmlFor="senha">Senha</label>
        <input type="password" id="senha" name="senha" autoComplete="current-password" required />
      </div>

      <button type="submit" className="btn btn--primary w-full justify-center" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
