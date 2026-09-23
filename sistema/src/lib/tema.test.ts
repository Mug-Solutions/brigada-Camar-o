import { describe, expect, it } from "vitest";
import { alternarTema, ehTema, TEMA_PADRAO, temaOuPadrao } from "./tema";

describe("tema", () => {
  it("o padrão é claro, independente do sistema operacional", () => {
    expect(TEMA_PADRAO).toBe("claro");
  });

  it("reconhece só os temas existentes", () => {
    expect(ehTema("claro")).toBe(true);
    expect(ehTema("escuro")).toBe(true);
    expect(ehTema("sistema")).toBe(false);
    expect(ehTema(null)).toBe(false);
  });

  it("valor guardado inválido ou ausente cai no padrão, nunca quebra a tela", () => {
    expect(temaOuPadrao(null)).toBe("claro");
    expect(temaOuPadrao("")).toBe("claro");
    expect(temaOuPadrao("dark")).toBe("claro");
    expect(temaOuPadrao("escuro")).toBe("escuro");
  });

  it("alterna entre os dois", () => {
    expect(alternarTema("claro")).toBe("escuro");
    expect(alternarTema("escuro")).toBe("claro");
  });
});
