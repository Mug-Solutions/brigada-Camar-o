"use client";

import { alternarFuncaoAtiva } from "./actions";

interface AtivoToggleProps {
  nome: string;
  ativo: boolean;
}

export function AtivoToggle({ nome, ativo }: AtivoToggleProps) {
  return (
    <form action={alternarFuncaoAtiva}>
      <input type="hidden" name="nome" value={nome} />
      {/* key força remontar quando o valor confirmado pelo servidor
          muda — mesmo achado real corrigido em FinanceiroTabela.tsx. */}
      <input
        key={String(ativo)}
        type="checkbox"
        name="ativo"
        defaultChecked={ativo}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label={`Função ${ativo ? "ativa" : "inativa"}`}
      />
    </form>
  );
}
