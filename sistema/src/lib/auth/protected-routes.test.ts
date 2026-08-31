import { describe, it, expect } from "vitest";
import { ehAreaDoPapel, ehRotaProtegida } from "./protected-routes";

describe("ehRotaProtegida", () => {
  it("reconhece a raiz exata de cada área protegida", () => {
    expect(ehRotaProtegida("/portal")).toBe(true);
    expect(ehRotaProtegida("/painel")).toBe(true);
    expect(ehRotaProtegida("/bombeiros")).toBe(true);
    expect(ehRotaProtegida("/clientes")).toBe(true);
    expect(ehRotaProtegida("/eventos")).toBe(true);
    expect(ehRotaProtegida("/precos")).toBe(true);
    expect(ehRotaProtegida("/financeiro")).toBe(true);
  });

  it("reconhece sub-rotas", () => {
    expect(ehRotaProtegida("/bombeiros/novo")).toBe(true);
    expect(ehRotaProtegida("/portal/escala")).toBe(true);
  });

  it("não bloqueia rotas públicas", () => {
    expect(ehRotaProtegida("/login")).toBe(false);
    expect(ehRotaProtegida("/")).toBe(false);
  });

  it("não confunde prefixos parecidos com rotas de fato protegidas", () => {
    // "/painel-externo" não é "/painel" nem começa com "/painel/"
    expect(ehRotaProtegida("/painel-externo")).toBe(false);
  });
});

describe("ehAreaDoPapel", () => {
  it("staff acessa as 4 áreas administrativas, não só a home", () => {
    // Regressão: bug real encontrado testando no navegador — a checagem
    // antiga só liberava a home (/painel), bloqueando staff de abrir
    // /bombeiros, /eventos e /financeiro.
    expect(ehAreaDoPapel("staff", "/painel")).toBe(true);
    expect(ehAreaDoPapel("staff", "/bombeiros")).toBe(true);
    expect(ehAreaDoPapel("staff", "/bombeiros/aprovacoes")).toBe(true);
    expect(ehAreaDoPapel("staff", "/clientes")).toBe(true);
    expect(ehAreaDoPapel("staff", "/eventos")).toBe(true);
    expect(ehAreaDoPapel("staff", "/precos")).toBe(true);
    expect(ehAreaDoPapel("staff", "/financeiro")).toBe(true);
  });

  it("bombeiro só acessa o Portal", () => {
    expect(ehAreaDoPapel("bombeiro", "/portal")).toBe(true);
    expect(ehAreaDoPapel("bombeiro", "/portal/escala")).toBe(true);
    expect(ehAreaDoPapel("bombeiro", "/painel")).toBe(false);
    expect(ehAreaDoPapel("bombeiro", "/bombeiros")).toBe(false);
  });

  it("staff não acessa o Portal do Bombeiro", () => {
    expect(ehAreaDoPapel("staff", "/portal")).toBe(false);
  });
});
