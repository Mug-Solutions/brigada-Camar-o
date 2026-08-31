"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarCliente, type CriarClienteState } from "../actions";
import { mascararCNPJ, mascararTelefone } from "@/lib/validation/mascara";

const initialState: CriarClienteState = { error: null };

export function NovoClienteForm() {
  const [state, formAction, pending] = useActionState(criarCliente, initialState);

  return (
    <form action={formAction} className="panel-block max-w-[560px] p-6">
      {state.error && (
        <div
          className="mb-5 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {state.error}
        </div>
      )}

      <fieldset className="mb-6 border-0 p-0">
        <legend
          className="mb-3.5 w-full border-b pb-2.5 text-[12px] uppercase tracking-wide"
          style={{ borderColor: "var(--line)", fontFamily: "var(--font-display)" }}
        >
          Dados do Cliente
        </legend>
        <div className="field mb-4">
          <label htmlFor="nome">Nome / Razão social</label>
          <input type="text" id="nome" name="nome" required />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="cnpj">CNPJ</label>
            <input
              type="text"
              id="cnpj"
              name="cnpj"
              placeholder="00.000.000/0000-00"
              maxLength={18}
              onChange={(e) => {
                e.target.value = mascararCNPJ(e.target.value);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="contato">Contato</label>
            <input
              type="text"
              id="contato"
              name="contato"
              placeholder="(31) 90000-0000"
              maxLength={15}
              onChange={(e) => {
                e.target.value = mascararTelefone(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="field mb-4">
          <label htmlFor="email">E-mail</label>
          <input type="email" id="email" name="email" />
        </div>
        <div className="field">
          <label htmlFor="endereco">Endereço</label>
          <input type="text" id="endereco" name="endereco" placeholder="Rua, número — cidade/UF" />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2.5">
        <Link href="/clientes" className="btn">
          Cancelar
        </Link>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar Cliente"}
        </button>
      </div>
    </form>
  );
}
