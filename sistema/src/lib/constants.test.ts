import { describe, it, expect } from "vitest";
import { PAPEIS, HOME_POR_PAPEL } from "./constants";

describe("HOME_POR_PAPEL", () => {
  it("manda bombeiro para o Portal e staff para o painel administrativo", () => {
    expect(HOME_POR_PAPEL.bombeiro).toBe("/portal");
    expect(HOME_POR_PAPEL.staff).toBe("/painel");
  });

  it("tem uma home definida para todo papel existente", () => {
    for (const papel of PAPEIS) {
      expect(HOME_POR_PAPEL[papel]).toBeTruthy();
    }
  });
});
