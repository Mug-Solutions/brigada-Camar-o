"use client";

import { useState } from "react";

const RESET_MS = 2000;

export function CopiarPixButton({ brCode }: { brCode: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(brCode);
          setCopiado(true);
          setTimeout(() => setCopiado(false), RESET_MS);
        } catch {
          // Clipboard indisponível (ex.: permissão negada) — o código
          // continua visível como texto pra selecionar/copiar na mão.
        }
      }}
    >
      {copiado ? "Copiado!" : "Copiar código"}
    </button>
  );
}
