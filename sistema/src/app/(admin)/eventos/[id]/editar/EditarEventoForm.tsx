"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Evento } from "@/lib/types";
import { editarEvento, type EditarEventoState } from "../actions";

const initialState: EditarEventoState = { error: null };

interface EditarEventoFormProps {
  evento: Evento;
  clientes: { id: string; nome: string }[];
}

export function EditarEventoForm({ evento, clientes }: EditarEventoFormProps) {
  const [state, formAction, pending] = useActionState(editarEvento, initialState);

  return (
    <form action={formAction} className="panel-block max-w-[560px] p-6">
      <input type="hidden" name="evento_id" value={evento.id} />

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
          <input type="text" id="nome" name="nome" defaultValue={evento.nome} required />
        </div>
        <div className="field mb-4">
          <label htmlFor="cliente_id">Cliente</label>
          {/* Achado real de revisão de segurança: sem uma <option value="">
              explícita, quando evento.cliente_id vem null (cliente original
              apagado — supabase/schema.sql tem "on delete set null" nessa FK),
              o navegador seleciona silenciosamente o primeiro cliente da
              lista, e como o <select> é required isso passava despercebido
              pela validação — o evento seria salvo com um cliente errado sem
              o staff perceber. */}
          <select id="cliente_id" name="cliente_id" defaultValue={evento.cliente_id ?? ""} required>
            {!evento.cliente_id && (
              <option value="" disabled>
                Selecione um cliente
              </option>
            )}
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="field mb-4">
          <label htmlFor="local">Local</label>
          <input
            type="text"
            id="local"
            name="local"
            placeholder="Endereço ou nome do espaço"
            defaultValue={evento.local ?? ""}
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="data_inicio">Data de início</label>
            <input type="date" id="data_inicio" name="data_inicio" defaultValue={evento.data_inicio} required />
          </div>
          <div className="field">
            <label htmlFor="data_fim">Data de fim</label>
            <input type="date" id="data_fim" name="data_fim" defaultValue={evento.data_fim} required />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="quantitativo_bombeiros">Quantitativo de bombeiros</label>
            <input
              type="number"
              id="quantitativo_bombeiros"
              name="quantitativo_bombeiros"
              min={0}
              defaultValue={evento.quantitativo_bombeiros}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="valor_fechamento">Valor de fechamento</label>
            <input
              type="number"
              id="valor_fechamento"
              name="valor_fechamento"
              min={0}
              step="0.01"
              defaultValue={evento.valor_fechamento}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="materiais">Materiais</label>
          <textarea
            id="materiais"
            name="materiais"
            rows={3}
            placeholder="Ex.: 10 extintores, 1 DEA, kit de primeiros socorros"
            defaultValue={evento.materiais ?? ""}
          />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2.5">
        <Link href={`/eventos/${evento.id}`} className="btn">
          Cancelar
        </Link>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
