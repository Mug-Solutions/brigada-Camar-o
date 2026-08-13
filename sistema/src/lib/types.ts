import type { Funcao, StatusEvento, Turno } from "./constants";

export interface Bombeiro {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  funcao: Funcao;
  aso_data: string | null; // ISO date
  esocial_matricula: string | null;
  esocial_status: "Ativo" | "Inativo";
  credenciamento_data: string | null; // ISO date
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  email: string | null;
  created_at: string;
}

export interface Evento {
  id: string;
  nome: string;
  cliente_id: string | null;
  local: string | null;
  data_inicio: string; // ISO date
  data_fim: string; // ISO date
  quantitativo_bombeiros: number;
  materiais: string | null;
  valor_fechamento: number;
  status: StatusEvento;
  created_at: string;
}

export interface Escala {
  id: string;
  evento_id: string;
  bombeiro_id: string;
  data: string; // ISO date
  turno: Turno;
  horario_cumprido: string | null;
  valor: number;
  created_at: string;
}

export interface EventoFinanceiro {
  evento_id: string;
  pago_bombeiros_data: string | null;
  pago_bombeiros_status: "Pendente" | "Pago" | "Atrasado";
  recebido_cliente_data: string | null;
  recebido_cliente_status: "Pendente" | "Recebido" | "Atrasado";
}
