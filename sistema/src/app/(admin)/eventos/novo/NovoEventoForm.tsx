"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarEvento, type CriarEventoState } from "../actions";

const initialState: CriarEventoState = { error: null };

interface NovoEventoFormProps {
  clientes: { id: string; nome: string }[];
}

export function NovoEventoForm({ clientes }: NovoEventoFormProps) {
  const [state, formAction, pending] = useActionState(criarEvento, initialState);

  if (clientes.length === 0) {
    return (
      <div className="panel-block max-w-[560px] p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        Nenhum cliente cadastrado ainda. Cadastre um{" "}
        <Link href="/clientes/novo" className="underline">
          cliente
        </Link>{" "}
        antes de criar um evento.
      </div>
    );
  }

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
          Dados do Evento
        </legend>
        <div className="field mb-4">
          <label htmlFor="nome">Nome do evento</label>
          <input type="text" id="nome" name="nome" required />
        </div>
        <div className="field mb-4">
          <label htmlFor="cliente_id">Cliente</label>
          <select id="cliente_id" name="cliente_id" defaultValue={clientes[0].id} required>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="field mb-4">
          <label htmlFor="local">Local</label>
          <input type="text" id="local" name="local" placeholder="Endereço ou nome do espaço" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="data_inicio">Data de início</label>
            <input type="date" id="data_inicio" name="data_inicio" required />
          </div>
          <div className="field">
            <label htmlFor="data_fim">Data de fim</label>
            <input type="date" id="data_fim" name="data_fim" required />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="quantitativo_bombeiros">Quantitativo de bombeiros</label>
            <input type="number" id="quantitativo_bombeiros" name="quantitativo_bombeiros" min={0} defaultValue={0} required />
          </div>
          <div className="field">
            <label htmlFor="valor_fechamento">Valor de fechamento (orçamento proposto)</label>
            <input type="number" id="valor_fechamento" name="valor_fechamento" min={0} step="0.01" defaultValue={0} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="materiais">Materiais</label>
          <textarea id="materiais" name="materiais" rows={3} placeholder="Ex.: 10 extintores, 1 DEA, kit de primeiros socorros" />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2.5">
        <Link href="/eventos" className="btn">
          Cancelar
        </Link>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar Evento"}
        </button>
      </div>
    </form>
  );
}
