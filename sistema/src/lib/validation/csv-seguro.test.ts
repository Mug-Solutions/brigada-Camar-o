import { describe, it, expect } from "vitest";
import { comecaComCaractereFormula, escaparParaCsv } from "./csv-seguro";

describe("comecaComCaractereFormula", () => {
  it("detecta caracteres de fórmula no início", () => {
    expect(comecaComCaractereFormula("=CMD(...)")).toBe(true);
    expect(comecaComCaractereFormula("+5511999999999")).toBe(true);
    expect(comecaComCaractereFormula("-1")).toBe(true);
    expect(comecaComCaractereFormula("@usuario")).toBe(true);
  });

  it("não sinaliza nome/chave normal", () => {
    expect(comecaComCaractereFormula("Maria da Silva")).toBe(false);
    expect(comecaComCaractereFormula("maria@email.com")).toBe(false);
    expect(comecaComCaractereFormula("123.456.789-00")).toBe(false);
  });
});

describe("escaparParaCsv", () => {
  it("prefixa com apóstrofo quando começa com caractere de fórmula", () => {
    expect(escaparParaCsv("=CMD(...)")).toBe("'=CMD(...)");
  });

  it("mantém valor normal intacto", () => {
    expect(escaparParaCsv("Maria da Silva")).toBe("Maria da Silva");
  });
});
