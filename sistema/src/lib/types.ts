import type { DiaSemana, Funcao, Papel, StatusEvento, Turno } from "./constants";

export interface Usuario {
  id: string;
  auth_id: string;
  nome: string;
  papel: Papel;
  bombeiro_id: string | null;
  ativo: boolean;
  created_at: string;
}

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
  chave_pix: string | null;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  email: string | null;
  endereco: string | null;
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
  custo_estimado: number | null;
  status: StatusEvento;
  created_at: string;
}

export interface Escala {
  id: string;
  evento_id: string;
  bombeiro_id: string;
  data: string; // ISO date
  turno: Turno;
  tipo: "titular" | "reserva";
  horario_cumprido: string | null;
  valor: number;
  pago: boolean;
  status_confirmacao: "pendente" | "confirmado";
  created_at: string;
}

export interface EventoFinanceiro {
  evento_id: string;
  pago_bombeiros_data: string | null;
  pago_bombeiros_status: "Pendente" | "Pago" | "Atrasado";
  recebido_cliente_data: string | null;
  recebido_cliente_status: "Pendente" | "Recebido" | "Atrasado";
}

export interface PrecoConfig {
  chave: string;
  valor: number;
  descricao: string;
  updated_at: string;
}

export interface Notificacao {
  id: string;
  bombeiro_id: string;
  tipo_documento: "aso" | "credenciamento";
  nivel: "warn" | "crit";
  mensagem: string;
  lida: boolean;
  criado_em: string;
}

export interface Disponibilidade {
  id: string;
  bombeiro_id: string;
  dia_semana: DiaSemana;
  turno: Turno;
  regiao: string | null;
  created_at: string;
}

export interface Candidatura {
  id: string;
  evento_id: string;
  bombeiro_id: string;
  status: "pendente" | "aceita" | "recusada";
  criado_em: string;
  revisado_em: string | null;
  revisado_por: string | null;
}

export interface AuditoriaLog {
  id: string;
  usuario_id: string | null;
  tabela: string;
  registro_id: string | null;
  acao: "criar" | "editar" | "excluir" | "aprovar" | "recusar";
  valor_antes: Record<string, unknown> | null;
  valor_depois: Record<string, unknown> | null;
  criado_em: string;
}

export interface BombeiroDocumento {
  id: string;
  bombeiro_id: string;
  tipo_documento: "aso" | "credenciamento" | "curso";
  storage_path: string;
  nome_arquivo: string;
  tamanho_bytes: number;
  enviado_em: string;
  enviado_por: string | null;
}

export interface SolicitacaoDocumento {
  id: string;
  bombeiro_id: string;
  tipo_documento: "aso" | "credenciamento";
  data_nova: string; // ISO date
  status: "pendente" | "aprovado" | "recusado";
  criado_em: string;
  revisado_em: string | null;
  revisado_por: string | null;
}
