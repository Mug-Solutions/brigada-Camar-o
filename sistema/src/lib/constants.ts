export const FUNCOES = [
  "Bombeiro Civil",
  "Bombeiro Civil Líder",
  "Supervisora de Brigada",
] as const;

export type Funcao = (typeof FUNCOES)[number];

// Só o default do modo de demonstração (sem Supabase configurado) —
// turnos de verdade são configuráveis pelo staff em /precos/turnos
// (tabela turnos_config, migração 0028: nome, horário e valor editáveis,
// staff pode criar/desativar/excluir). Turno deixou de ser uma union
// fixa por isso — mesmo raciocínio já aplicado a Funcao/FUNCOES depois
// da migração 0021 (funcoes_bombeiro): a lista real mora no banco, o
// tipo TypeScript só precisa ser largo o bastante pra aceitar qualquer
// valor validado em runtime contra a tabela.
export const TURNOS = {
  Diurno: { ini: "08:00", fim: "18:00", valor: 150 },
  Noturno: { ini: "18:00", fim: "00:00", valor: 135 },
  Especial: { ini: "08:00", fim: "20:00", valor: 280 },
} as const;

export type Turno = string;

export const CHAVE_PRECO_ALIMENTACAO = "alimentacao_dia";

/** Default do modo de demonstração — o valor real vem de `precos_config`. */
export const ALIMENTACAO_DIA = 20;

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const STATUS_EVENTO = ["Planejamento", "Confirmado", "Concluído", "Cancelado"] as const;
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
