import type { Bombeiro } from "./types";

export type DocLevel = "ok" | "warn" | "crit";

export interface DocStatus {
  level: DocLevel;
  label: string;
}

/**
 * Status de um documento (ASO ou Credenciamento) a partir da data de
 * validade. Vencido = crítico, vence em até 30 dias = atenção, senão válido.
 */
export function docStatus(isoDate: string | null, today: Date = new Date()): DocStatus {
  if (!isoDate) return { level: "crit", label: "Não informado" };

  const date = new Date(isoDate + "T00:00:00");
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return { level: "crit", label: "Vencido" };
  if (diffDays <= 30) return { level: "warn", label: `Vence em ${diffDays}d` };
  return { level: "ok", label: "Válido" };
}

/**
 * Aptidão do bombeiro para ser escalado: combina E-Social, ASO e
 * Credenciamento. Um bombeiro "crit" não deve aparecer como opção
 * selecionável nas telas de escala.
 */
export function bombeiroAptidao(b: Bombeiro, today: Date = new Date()): DocStatus {
  if (b.esocial_status === "Inativo") return { level: "crit", label: "Inativo" };

  const aso = docStatus(b.aso_data, today);
  const cred = docStatus(b.credenciamento_data, today);

  if (aso.level === "crit" || cred.level === "crit") {
    return { level: "crit", label: "Impedido" };
  }
  if (aso.level === "warn" || cred.level === "warn") {
    return { level: "warn", label: "Atenção" };
  }
  return { level: "ok", label: "Apto" };
}

export function fmtMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
