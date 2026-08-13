export const FUNCOES = [
  "Bombeiro Civil",
  "Bombeiro Civil Líder",
  "Supervisora de Brigada",
] as const;

export type Funcao = (typeof FUNCOES)[number];

export const TURNOS = {
  Diurno: { ini: "08:00", fim: "18:00", valor: 150 },
  Noturno: { ini: "18:00", fim: "00:00", valor: 135 },
  Especial: { ini: "08:00", fim: "20:00", valor: 280 },
} as const;

export type Turno = keyof typeof TURNOS;

export const ALIMENTACAO_DIA = 20;

export const STATUS_EVENTO = ["Planejamento", "Confirmado", "Concluído"] as const;
export type StatusEvento = (typeof STATUS_EVENTO)[number];
