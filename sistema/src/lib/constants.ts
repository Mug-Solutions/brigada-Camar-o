export const FUNCOES = [
  "Bombeiro Civil",
  "Bombeiro Civil Líder",
  "Supervisora de Brigada",
] as const;

export type Funcao = (typeof FUNCOES)[number];

// `valor` aqui é só o default do modo de demonstração (sem Supabase
// configurado) e a chave de nome/horário de cada turno — o preço real
// vem de `precos_config` (tabela, editável em /precos), não daqui.
// Ver CHAVE_PRECO_POR_TURNO para o mapeamento turno → chave na tabela.
export const TURNOS = {
  Diurno: { ini: "08:00", fim: "18:00", valor: 150 },
  Noturno: { ini: "18:00", fim: "00:00", valor: 135 },
  Especial: { ini: "08:00", fim: "20:00", valor: 280 },
} as const;

export type Turno = keyof typeof TURNOS;

export const CHAVE_PRECO_POR_TURNO: Record<Turno, string> = {
  Diurno: "turno_diurno",
  Noturno: "turno_noturno",
  Especial: "turno_especial",
};

export const CHAVE_PRECO_ALIMENTACAO = "alimentacao_dia";

/** Default do modo de demonstração — o valor real vem de `precos_config`. */
export const ALIMENTACAO_DIA = 20;

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const STATUS_EVENTO = ["Planejamento", "Confirmado", "Concluído"] as const;
export type StatusEvento = (typeof STATUS_EVENTO)[number];

export const PAPEIS = ["bombeiro", "staff"] as const;
export type Papel = (typeof PAPEIS)[number];

/** Para onde cada papel vai depois do login / ao tentar acessar uma área que não é a sua. */
export const HOME_POR_PAPEL: Record<Papel, string> = {
  bombeiro: "/portal",
  staff: "/painel",
};

// Compartilhado entre o form de upload (client) e a validação da
// Server Action (server) — precisa ficar bem abaixo do
// serverActions.bodySizeLimit (next.config.ts) pra barrar o arquivo
// ANTES de mandar pro servidor: acima do limite do body, o Next.js
// rejeita com um 413 genérico antes da Server Action rodar, travando
// a página numa tela de erro de rede em vez da mensagem amigável.
export const TAMANHO_MAXIMO_DOCUMENTO_BYTES = 5 * 1024 * 1024; // 5MB — foto de celular de um documento físico cabe folgado
