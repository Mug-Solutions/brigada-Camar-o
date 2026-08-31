import { describe, it, expect } from "vitest";
import { apenasDigitos, cnpjTemFormatoValido, cpfTemFormatoValido, telefoneTemFormatoValido } from "./documento";

describe("apenasDigitos", () => {
  it("remove máscara de CPF", () => {
    expect(apenasDigitos("123.456.789-00")).toBe("12345678900");
  });

  it("remove máscara de telefone", () => {
    expect(apenasDigitos("(31) 90000-0000")).toBe("31900000000");
  });

  it("é neutro em uma string já só com dígitos", () => {
    expect(apenasDigitos("12345678900")).toBe("12345678900");
  });
});

describe("cpfTemFormatoValido", () => {
  it("aceita CPF com máscara ou sem", () => {
    expect(cpfTemFormatoValido("123.456.789-00")).toBe(true);
    expect(cpfTemFormatoValido("12345678900")).toBe(true);
  });

  it("rejeita CPF com dígitos a mais ou a menos", () => {
    expect(cpfTemFormatoValido("1234567890")).toBe(false);
    expect(cpfTemFormatoValido("123456789001")).toBe(false);
    expect(cpfTemFormatoValido("")).toBe(false);
  });
});

describe("cnpjTemFormatoValido", () => {
  it("aceita CNPJ com máscara ou sem", () => {
    expect(cnpjTemFormatoValido("12.345.678/0001-90")).toBe(true);
    expect(cnpjTemFormatoValido("12345678000190")).toBe(true);
  });

  it("rejeita CNPJ com dígitos a mais ou a menos", () => {
    expect(cnpjTemFormatoValido("1234567800019")).toBe(false);
    expect(cnpjTemFormatoValido("123456780001900")).toBe(false);
    expect(cnpjTemFormatoValido("")).toBe(false);
  });
});

describe("telefoneTemFormatoValido", () => {
  it("aceita celular com 9º dígito (11) e fixo (10)", () => {
    expect(telefoneTemFormatoValido("(31) 90000-0000")).toBe(true);
    expect(telefoneTemFormatoValido("(31) 3000-0000")).toBe(true);
  });

  it("rejeita telefone incompleto", () => {
    expect(telefoneTemFormatoValido("90000-0000")).toBe(false);
  });
});
