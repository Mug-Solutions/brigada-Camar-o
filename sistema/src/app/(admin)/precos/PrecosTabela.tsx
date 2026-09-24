"use client";

import type { PrecoConfig } from "@/lib/types";
import { atualizarDescricaoPreco, atualizarPreco, excluirPreco } from "./actions";

interface PrecosTabelaProps {
  precos: PrecoConfig[];
  demo: boolean;
}

export function PrecosTabela({ precos, demo }: PrecosTabelaProps) {
  return (
    <table className="min-w-[560px]">
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Valor</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {precos.map((p) => (
          <tr key={p.chave}>
            <td>
              <form action={atualizarDescricaoPreco}>
                <input type="hidden" name="chave" value={p.chave} />
                {/* key força remontar quando o valor confirmado pelo servidor
                    muda — mesmo achado real corrigido em FinanceiroTabela.tsx. */}
                <input
                  key={p.descricao}
                  type="text"
                  name="descricao"
                  defaultValue={p.descricao}
                  maxLength={140}
                  className="font-semibold"
                  disabled={demo}
                  onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                />
              </form>
            </td>
            <td>
              <form action={atualizarPreco}>
                <input type="hidden" name="chave" value={p.chave} />
                <input
                  key={p.valor}
                  type="number"
                  name="valor"
                  min={0}
                  step="0.01"
                  defaultValue={p.valor}
                  className="w-[110px]"
                  disabled={demo}
                  onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                />
              </form>
            </td>
            <td>
              <form
                action={excluirPreco}
                onSubmit={(e) => {
                  if (!confirm(`Excluir "${p.descricao}" da régua de preços?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="chave" value={p.chave} />
                <button
                  type="submit"
                  className="btn"
                  style={{ borderColor: "var(--crit)", color: "var(--crit)" }}
                  disabled={demo}
                >
                  Excluir
                </button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
