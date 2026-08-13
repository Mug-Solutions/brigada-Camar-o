"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarBombeiro, type CriarBombeiroState } from "../actions";
import { FUNCOES } from "@/lib/constants";

const initialState: CriarBombeiroState = { error: null };

export function NovoBombeiroForm() {
  const [state, formAction, pending] = useActionState(criarBombeiro, initialState);

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
          Dados Pessoais
        </legend>
        <div className="field mb-4">
          <label htmlFor="nome">Nome completo</label>
          <input type="text" id="nome" name="nome" required />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="cpf">CPF</label>
            <input type="text" id="cpf" name="cpf" placeholder="000.000.000-00" required />
          </div>
          <div className="field">
            <label htmlFor="telefone">Telefone</label>
            <input type="text" id="telefone" name="telefone" placeholder="(31) 90000-0000" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="funcao">Função</label>
          <select id="funcao" name="funcao" defaultValue={FUNCOES[0]}>
            {FUNCOES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="mb-6 border-0 p-0">
        <legend
          className="mb-3.5 w-full border-b pb-2.5 text-[12px] uppercase tracking-wide"
          style={{ borderColor: "var(--line)", fontFamily: "var(--font-display)" }}
        >
          Documentação
        </legend>
        <div className="field mb-4">
          <label htmlFor="aso_data">Data do ASO</label>
          <input type="date" id="aso_data" name="aso_data" required />
        </div>
        <div className="field mb-4">
          <label htmlFor="esocial_matricula">Matrícula E-Social</label>
          <input type="text" id="esocial_matricula" name="esocial_matricula" placeholder="Ex.: 822" required />
        </div>
        <div className="field">
          <label htmlFor="credenciamento_data">Validade do Credenciamento</label>
          <input type="date" id="credenciamento_data" name="credenciamento_data" required />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2.5">
        <Link href="/bombeiros" className="btn">
          Cancelar
        </Link>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar Bombeiro"}
        </button>
      </div>
    </form>
  );
}
