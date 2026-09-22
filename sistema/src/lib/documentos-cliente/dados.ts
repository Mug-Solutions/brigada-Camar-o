import { fmtDateBR } from "@/lib/domain";
import type { EventoProgramacao } from "@/lib/types";

/**
 * Regras puras dos documentos enviados ao cliente (orçamento e
 * contrato) — sem import de React/Supabase/react-pdf, pra poderem ser
 * testadas isoladamente (dados.test.ts), mesmo espírito de
 * src/lib/auth/protected-routes.ts.
 */

export const TIPOS_DOCUMENTO = ["orcamento", "contrato"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const NOME_DOCUMENTO: Record<TipoDocumento, string> = {
  orcamento: "Orçamento",
  contrato: "Contrato",
};

export function ehTipoDocumento(valor: string): valor is TipoDocumento {
  return (TIPOS_DOCUMENTO as readonly string[]).includes(valor);
}

export interface DadosDocumento {
  evento: {
    nome: string;
    local: string | null;
    quantitativo_bombeiros: number;
    valor_fechamento: number;
  };
  /** O nome cadastrado do cliente é tratado como razão social. */
  cliente: { nome: string; cnpj: string | null; endereco: string | null } | null;
  programacao: Pick<EventoProgramacao, "data" | "hora_inicio" | "hora_fim" | "quantidade">[];
}

export interface LinhaTabela {
  data: string;
  horario: string;
  cargaHoraria: string;
  quantidade: string;
}

/** "08:00:00" (tipo time do Postgres) ou "08:00" → minutos desde 00:00. */
function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Fim menor ou igual ao início = atravessa a meia-noite (18:00 às
 * 00:00 dá 6h, não -18h). O banco já recusa fim == início (migração
 * 0023), então o caso "24h" nunca chega aqui de verdade.
 */
export function cargaHorariaMinutos(horaInicio: string, horaFim: string): number {
  const diff = minutosDoDia(horaFim) - minutosDoDia(horaInicio);
  return diff > 0 ? diff : diff + 24 * 60;
}

export function fmtCargaHoraria(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function fmtHora(hora: string): string {
  return hora.slice(0, 5);
}

export function fmtQuantidadeBrigadistas(n: number): string {
  return `${n} ${n === 1 ? "brigadista" : "brigadistas"}`;
}

/** Ordem cronológica — a programação pode ter sido cadastrada fora de ordem. */
export function montarLinhasTabela(programacao: DadosDocumento["programacao"]): LinhaTabela[] {
  return [...programacao]
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora_inicio.localeCompare(b.hora_inicio))
    .map((p) => ({
      data: fmtDateBR(p.data),
      horario: `${fmtHora(p.hora_inicio)} às ${fmtHora(p.hora_fim)}`,
      cargaHoraria: fmtCargaHoraria(cargaHorariaMinutos(p.hora_inicio, p.hora_fim)),
      quantidade: String(p.quantidade),
    }));
}

/**
 * "Belo Horizonte, 12 de Agosto de 2026" — mês com inicial maiúscula,
 * igual aos modelos. Fuso fixo em São Paulo: o servidor pode estar em
 * UTC (container), e depois das 21h o documento sairia com a data de
 * amanhã.
 */
export function fmtDataPorExtenso(data: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(data);
  const get = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "";
  const mes = get("month");
  return `${get("day")} de ${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${get("year")}`;
}

/**
 * O que falta no cadastro pra gerar o documento. Lista vazia = pode
 * gerar. A mesma lista aparece na tela do evento (botão desabilitado
 * + motivos) e é re-checada na rota antes de montar o PDF — um
 * documento jurídico não pode sair com campo em branco.
 */
export function pendenciasDocumento(tipo: TipoDocumento, dados: DadosDocumento): string[] {
  const pendencias: string[] = [];
  const { evento, cliente, programacao } = dados;

  if (!cliente) pendencias.push("Evento sem cliente vinculado.");
  if (!evento.local?.trim()) pendencias.push("Local do evento não preenchido.");
  if (!(Number(evento.valor_fechamento) > 0)) pendencias.push("Valor de fechamento do evento não preenchido.");
  if (programacao.length === 0) pendencias.push("Programação (datas e horários) não cadastrada.");

  if (tipo === "contrato") {
    if (cliente && !cliente.cnpj?.trim()) pendencias.push("CNPJ do cliente não cadastrado.");
    if (cliente && !cliente.endereco?.trim()) pendencias.push("Endereço do cliente não cadastrado.");
    if (!(evento.quantitativo_bombeiros > 0)) pendencias.push("Quantitativo de bombeiros do evento não preenchido.");
    // O contrato escreve "prestação de serviço de N brigadistas" e, logo
    // abaixo, a tabela com a quantidade de cada dia. Se a tabela pede
    // mais gente do que o total contratado, o documento se contradiz.
    const maiorQuantidade = Math.max(0, ...programacao.map((p) => p.quantidade));
    if (evento.quantitativo_bombeiros > 0 && maiorQuantidade > evento.quantitativo_bombeiros) {
      pendencias.push(
        `A programação pede ${maiorQuantidade} brigadistas num mesmo horário, mas o evento está com quantitativo de ${evento.quantitativo_bombeiros}.`
      );
    }
  }

  return pendencias;
}

/** Nome do arquivo baixado: "Orcamento - Nome do Evento.pdf". */
export function nomeArquivoDocumento(tipo: TipoDocumento, nomeEvento: string): string {
  const base = NOME_DOCUMENTO[tipo].normalize("NFD").replace(/[̀-ͯ]/g, "");
  const evento = nomeEvento.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${base} - ${evento || "evento"}.pdf`;
}

export interface LinhaProgramacaoValidada {
  data: string;
  horaInicio: string;
  horaFim: string;
  quantidade: number;
}

/** Validação do formulário "Programação" da tela do evento. */
export function validarLinhaProgramacao(
  entrada: { data: string; horaInicio: string; horaFim: string; quantidade: string },
  periodo: { dataInicio: string; dataFim: string }
): { error: string; linha?: undefined } | { error: null; linha: LinhaProgramacaoValidada } {
  const data = entrada.data.trim();
  const horaInicio = entrada.horaInicio.trim();
  const horaFim = entrada.horaFim.trim();
  const quantidadeRaw = entrada.quantidade.trim();

  if (!data || !horaInicio || !horaFim || !quantidadeRaw) {
    return { error: "Preencha data, horário de início, horário de fim e quantidade." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data inválida." };
  if (data < periodo.dataInicio || data > periodo.dataFim) {
    return { error: "A data precisa estar dentro do período do evento." };
  }
  const horaValida = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!horaValida.test(horaInicio) || !horaValida.test(horaFim)) return { error: "Horário inválido." };
  if (horaInicio === horaFim) return { error: "O horário de fim precisa ser diferente do início." };

  const quantidade = Number(quantidadeRaw);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) {
    return { error: "Quantidade precisa ser um número inteiro entre 1 e 999." };
  }

  return { error: null, linha: { data, horaInicio, horaFim, quantidade } };
}
