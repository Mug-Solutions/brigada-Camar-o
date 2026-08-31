import { describe, it, expect } from "vitest";
import { mascararCPF, mascararCNPJ, mascararTelefone } from "./mascara";

describe("mascararCPF", () => {
  it("formata progressivamente conforme os dígitos entram", () => {
    expect(mascararCPF("123")).toBe("123");
    expect(mascararCPF("123456")).toBe("123.456");
    expect(mascararCPF("123456789")).toBe("123.456.789");
    expect(mascararCPF("12345678900")).toBe("123.456.789-00");
  });

  it("trava em 11 dígitos, ignorando o excedente", () => {
    expect(mascararCPF("123456789001234567")).toBe("123.456.789-00");
  });

  it("ignora caracteres não numéricos na entrada", () => {
    expect(mascararCPF("123.456.789-00")).toBe("123.456.789-00");
  });
});

describe("mascararCNPJ", () => {
  it("formata progressivamente conforme os dígitos entram", () => {
    expect(mascararCNPJ("12")).toBe("12");
    expect(mascararCNPJ("12345")).toBe("12.345");
    expect(mascararCNPJ("12345678")).toBe("12.345.678");
    expect(mascararCNPJ("123456780001")).toBe("12.345.678/0001");
    expect(mascararCNPJ("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("trava em 14 dígitos, ignorando o excedente (achado real do usuário: campo aceitava 29 dígitos)", () => {
    expect(mascararCNPJ("1111111111111111111111111111")).toBe("11.111.111/1111-11");
  });
});

describe("mascararTelefone", () => {
  it("formata celular com 9º dígito", () => {
    expect(mascararTelefone("31900000000")).toBe("(31) 90000-0000");
  });

  it("formata fixo (10 dígitos)", () => {
    expect(mascararTelefone("3130000000")).toBe("(31) 3000-0000");
  });

  it("trava em 11 dígitos", () => {
    expect(mascararTelefone("319000000001234")).toBe("(31) 90000-0000");
  });
});
