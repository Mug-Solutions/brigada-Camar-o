"use client";

import type { PrecoConfig } from "@/lib/types";
import { atualizarPreco } from "./actions";

interface PrecosTabelaProps {
  precos: PrecoConfig[];
  demo: boolean;
}

export function PrecosTabela({ precos, demo }: PrecosTabelaProps) {
  return (
    <table className="min-w-[380px]">
      <thead>
        <tr>
          <th>Item</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        {precos.map((p) => (
          <tr key={p.chave}>
            <td className="font-semibold">{p.descricao}</td>
            <td>
              <form action={atualizarPreco}>
                <input type="hidden" name="chave" value={p.chave} />
                {/* key força remontar quando o valor confirmado pelo servidor
                    muda — sem isso, defaultValue não sincroniza sozinho
                    depois de um revalidate (mesmo achado real corrigido em
                    FinanceiroTabela.tsx). */}
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
