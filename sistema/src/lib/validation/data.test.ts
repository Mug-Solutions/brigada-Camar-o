import { describe, it, expect } from "vitest";
import { dataBrParaIso } from "./data";

describe("dataBrParaIso", () => {
  it("converte data válida BR para ISO", () => {
    expect(dataBrParaIso("15/04/2026")).toBe("2026-04-15");
    expect(dataBrParaIso("01/01/2027")).toBe("2027-01-01");
  });

  it("aceita espaços em volta", () => {
    expect(dataBrParaIso(" 15/04/2026 ")).toBe("2026-04-15");
  });

  it("rejeita formato errado", () => {
    expect(dataBrParaIso("2026-04-15")).toBeNull();
    expect(dataBrParaIso("15-04-2026")).toBeNull();
    expect(dataBrParaIso("")).toBeNull();
  });

  it("rejeita data que não existe", () => {
    expect(dataBrParaIso("31/02/2026")).toBeNull();
    expect(dataBrParaIso("32/01/2026")).toBeNull();
    expect(dataBrParaIso("15/13/2026")).toBeNull();
  });
});
