"use client";

import { useEffect, useState } from "react";
import {
  alternarTema,
  ATRIBUTO_TEMA,
  CHAVE_TEMA,
  COLOR_SCHEME,
  ROTULO_TEMA,
  TEMA_PADRAO,
  temaOuPadrao,
  type Tema,
} from "@/lib/tema";

interface TemaToggleProps {
  /** Só o ícone, para caber no menu recolhido e na barra do Portal. */
  compacto?: boolean;
  /** No shell escuro (menu lateral, topo do Portal) o texto usa outra cor. */
  variante?: "shell" | "conteudo";
}

/**
 * Alterna claro/escuro. A escolha fica no localStorage — é preferência
 * de aparelho, não de conta (mesma régua do recolhimento do menu):
 * sobrevive a reload, não precisa ir ao banco nem ser sincronizada.
 */
export function TemaToggle({ compacto = false, variante = "shell" }: TemaToggleProps) {
  // Começa no padrão, igual ao que o servidor renderiza. O valor real é
  // lido depois de montar — o servidor nunca enxerga o localStorage, e
  // ler antes disso daria mismatch de hidratação. Quem evita o piscar
  // é o script de src/app/layout.tsx, que roda antes da pintura.
  const [tema, setTema] = useState<Tema>(TEMA_PADRAO);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(temaOuPadrao(document.documentElement.getAttribute(ATRIBUTO_TEMA)));
  }, []);

  function trocar() {
    const proximo = alternarTema(tema);
    setTema(proximo);
    document.documentElement.setAttribute(ATRIBUTO_TEMA, proximo);
    document.documentElement.style.colorScheme = COLOR_SCHEME[proximo];
    try {
      localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // Navegação privada ou armazenamento bloqueado: vale só nesta aba.
    }
  }

  // `nav-item` só serve no shell escuro: o hover dele pinta o fundo com
  // a cor do menu, que fica preta sobre conteúdo claro. Em conteúdo, usa
  // o mesmo botão do resto das telas.
  const classe =
    variante === "shell"
      ? `nav-item w-full ${compacto ? "justify-center" : "text-left"}`
      : "btn";
  const cor = variante === "shell" ? "var(--shell-text-soft)" : undefined;
  const proximo = alternarTema(tema);

  return (
    <button
      type="button"
      onClick={trocar}
      className={classe}
      style={cor ? { color: cor } : undefined}
      // O rótulo anuncia o que vai acontecer, não o estado atual.
      aria-label={`Mudar para ${ROTULO_TEMA[proximo].toLowerCase()}`}
      title={`Mudar para ${ROTULO_TEMA[proximo].toLowerCase()}`}
    >
      <span aria-hidden="true">{tema === "escuro" ? "☀" : "☾"}</span>
      {!compacto && <span>{ROTULO_TEMA[proximo]}</span>}
    </button>
  );
}
