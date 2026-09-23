import { describe, expect, it } from "vitest";
import {
  cargaHorariaMinutos,
  fmtCargaHoraria,
  fmtDataPorExtenso,
  montarLinhasTabela,
  nomeArquivoDocumento,
  pendenciasDocumento,
  validarLinhaProgramacao,
  type DadosDocumento,
} from "./dados";

describe("cargaHorariaMinutos", () => {
  it("calcula no mesmo dia", () => {
    expect(cargaHorariaMinutos("08:00:00", "18:00:00")).toBe(600);
    expect(cargaHorariaMinutos("08:00", "20:30")).toBe(750);
  });

  it("atravessa a meia-noite em vez de dar negativo", () => {
    expect(cargaHorariaMinutos("18:00", "00:00")).toBe(360);
    expect(cargaHorariaMinutos("22:00", "06:00")).toBe(480);
  });
});

describe("fmtCargaHoraria", () => {
  it("omite minutos zerados", () => {
    expect(fmtCargaHoraria(600)).toBe("10h");
    expect(fmtCargaHoraria(750)).toBe("12h30");
    expect(fmtCargaHoraria(605)).toBe("10h05");
  });
});

describe("fmtDataPorExtenso", () => {
  it("usa mês com inicial maiúscula, como os modelos", () => {
    expect(fmtDataPorExtenso(new Date("2026-08-12T15:00:00Z"))).toBe("12 de Agosto de 2026");
  });

  it("usa o fuso de São Paulo, não o do servidor", () => {
    // 01:30 UTC do dia 13 ainda é dia 12 em São Paulo (UTC-3).
    expect(fmtDataPorExtenso(new Date("2026-08-13T01:30:00Z"))).toBe("12 de Agosto de 2026");
  });
});

describe("montarLinhasTabela", () => {
  it("ordena por data e horário e formata cada coluna", () => {
    const linhas = montarLinhasTabela([
      { data: "2026-08-13", hora_inicio: "08:00:00", hora_fim: "18:00:00", quantidade: 4 },
      { data: "2026-08-12", hora_inicio: "18:00:00", hora_fim: "00:00:00", quantidade: 2 },
      { data: "2026-08-12", hora_inicio: "08:00:00", hora_fim: "18:00:00", quantidade: 6 },
    ]);
    expect(linhas).toEqual([
      { data: "12/08/2026", horario: "08:00 às 18:00", cargaHoraria: "10h", quantidade: "6" },
      { data: "12/08/2026", horario: "18:00 às 00:00", cargaHoraria: "6h", quantidade: "2" },
      { data: "13/08/2026", horario: "08:00 às 18:00", cargaHoraria: "10h", quantidade: "4" },
    ]);
  });
});

function dadosCompletos(): DadosDocumento {
  return {
    evento: { nome: "Show", local: "Mineirão", quantitativo_bombeiros: 6, valor_fechamento: 3000 },
    cliente: { nome: "Cliente LTDA", cnpj: "00.000.000/0001-00", endereco: "Rua A, 1" },
    programacao: [{ data: "2026-08-12", hora_inicio: "08:00:00", hora_fim: "18:00:00", quantidade: 6 }],
  };
}

describe("pendenciasDocumento", () => {
  it("não aponta nada com o cadastro completo", () => {
    expect(pendenciasDocumento("orcamento", dadosCompletos())).toEqual([]);
    expect(pendenciasDocumento("contrato", dadosCompletos())).toEqual([]);
  });

  it("exige programação nos dois documentos", () => {
    const dados = { ...dadosCompletos(), programacao: [] };
    expect(pendenciasDocumento("orcamento", dados)).toContain("Programação (datas e horários) não cadastrada.");
    expect(pendenciasDocumento("contrato", dados)).toContain("Programação (datas e horários) não cadastrada.");
  });

  it("só o contrato exige CNPJ e endereço do cliente", () => {
    const dados = dadosCompletos();
    dados.cliente = { nome: "Cliente LTDA", cnpj: null, endereco: "  " };
    expect(pendenciasDocumento("orcamento", dados)).toEqual([]);
    expect(pendenciasDocumento("contrato", dados)).toEqual([
      "CNPJ do cliente não cadastrado.",
      "Endereço do cliente não cadastrado.",
    ]);
  });

  it("barra contrato com programação pedindo mais gente que o quantitativo", () => {
    const dados = dadosCompletos();
    dados.programacao = [{ data: "2026-08-12", hora_inicio: "08:00:00", hora_fim: "18:00:00", quantidade: 8 }];
    expect(pendenciasDocumento("contrato", dados)).toHaveLength(1);
    expect(pendenciasDocumento("orcamento", dados)).toEqual([]);
  });

  it("aponta evento sem cliente, local ou valor", () => {
    const dados: DadosDocumento = {
      ...dadosCompletos(),
      cliente: null,
      evento: { nome: "Show", local: null, quantitativo_bombeiros: 6, valor_fechamento: 0 },
    };
    expect(pendenciasDocumento("orcamento", dados)).toEqual([
      "Evento sem cliente vinculado.",
      "Local do evento não preenchido.",
      "Valor de fechamento do evento não preenchido.",
    ]);
  });
});

describe("nomeArquivoDocumento", () => {
  it("tira acento do tipo e caracteres proibidos do nome do evento", () => {
    expect(nomeArquivoDocumento("orcamento", "Festa: Junina / 2026")).toBe("Orcamento - Festa Junina 2026.pdf");
    expect(nomeArquivoDocumento("contrato", "   ")).toBe("Contrato - evento.pdf");
  });
});

describe("validarLinhaProgramacao", () => {
  const periodo = { dataInicio: "2026-08-12", dataFim: "2026-08-13" };

  it("aceita uma linha válida", () => {
    expect(
      validarLinhaProgramacao({ data: "2026-08-12", horaInicio: "18:00", horaFim: "00:00", quantidade: "4" }, periodo)
    ).toEqual({ error: null, linha: { data: "2026-08-12", horaInicio: "18:00", horaFim: "00:00", quantidade: 4 } });
  });

  it("recusa data fora do período do evento", () => {
    const r = validarLinhaProgramacao({ data: "2026-08-14", horaInicio: "08:00", horaFim: "18:00", quantidade: "4" }, periodo);
    expect(r.error).toBe("A data precisa estar dentro do período do evento.");
  });

  it("recusa início igual ao fim e quantidade inválida", () => {
    expect(
      validarLinhaProgramacao({ data: "2026-08-12", horaInicio: "08:00", horaFim: "08:00", quantidade: "4" }, periodo).error
    ).toBe("O horário de fim precisa ser diferente do início.");
    expect(
      validarLinhaProgramacao({ data: "2026-08-12", horaInicio: "08:00", horaFim: "18:00", quantidade: "2.5" }, periodo).error
    ).toBe("Quantidade precisa ser um número inteiro entre 1 e 999.");
  });
});
