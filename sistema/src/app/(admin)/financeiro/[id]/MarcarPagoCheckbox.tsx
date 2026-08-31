"use client";

import { marcarEscalaPaga } from "./actions";

interface MarcarPagoCheckboxProps {
  escalaId: string;
  eventoId: string;
  pago: boolean;
}

export function MarcarPagoCheckbox({ escalaId, eventoId, pago }: MarcarPagoCheckboxProps) {
  return (
    <form action={marcarEscalaPaga}>
      <input type="hidden" name="escala_id" value={escalaId} />
      <input type="hidden" name="evento_id" value={eventoId} />
      {/* key força remontar quando o valor confirmado pelo servidor muda —
          mesma correção aplicada em FinanceiroTabela.tsx (achado real
          testando: defaultChecked só é aplicado na montagem inicial, não
          sincroniza sozinho depois de um revalidate). */}
      <input
        key={String(pago)}
        type="checkbox"
        name="pago"
        defaultChecked={pago}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Marcar como pago"
      />
    </form>
  );
}
