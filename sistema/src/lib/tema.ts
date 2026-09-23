/**
 * Tema claro/escuro escolhido pela pessoa. Módulo puro (sem React, sem
 * DOM) para o script que roda antes da primeira pintura, o botão e os
 * testes falarem exatamente a mesma língua — chave de armazenamento e
 * nome do atributo escritos uma vez só.
 *
 * Antes desta tela existir, o tema seguia `prefers-color-scheme`: quem
 * usava o sistema operacional no escuro via o sistema no escuro, sem
 * poder escolher. Agora o padrão é CLARO e a escolha é da pessoa.
 */
export const TEMAS = ["claro", "escuro"] as const;
export type Tema = (typeof TEMAS)[number];

export const TEMA_PADRAO: Tema = "claro";

/** Mesmo prefixo das outras preferências de interface (ver Sidebar). */
export const CHAVE_TEMA = "brigada:tema";

/** Atributo no <html>; o CSS pendura a paleta escura em [data-tema="escuro"]. */
export const ATRIBUTO_TEMA = "data-tema";

export function ehTema(valor: unknown): valor is Tema {
  return typeof valor === "string" && (TEMAS as readonly string[]).includes(valor);
}

/** Qualquer coisa inesperada (chave ausente, valor antigo, lixo) vira o padrão. */
export function temaOuPadrao(valor: unknown): Tema {
  return ehTema(valor) ? valor : TEMA_PADRAO;
}

export function alternarTema(atual: Tema): Tema {
  return atual === "escuro" ? "claro" : "escuro";
}

export const ROTULO_TEMA: Record<Tema, string> = {
  claro: "Tema claro",
  escuro: "Tema escuro",
};

/**
 * `color-scheme` avisa o navegador para desenhar barra de rolagem,
 * campos e menus nativos na mesma pegada do tema — sem isso, um select
 * ou um date picker aparece branco no meio do tema escuro.
 */
export const COLOR_SCHEME: Record<Tema, string> = {
  claro: "light",
  escuro: "dark",
};
