import { apenasDigitos } from "./documento";

/**
 * Máscaras aplicadas enquanto o usuário digita (onChange), não só
 * validadas no envio — o campo trava no formato certo e no tamanho
 * máximo em vez de deixar colar/digitar qualquer coisa (achado real:
 * usuário conseguiu digitar um CNPJ com 29 dígitos porque o campo era
 * texto livre com placeholder, sem nenhuma imposição de formato).
 */

export function mascararCPF(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

export function mascararCNPJ(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

/** Aceita fixo (10 dígitos) e celular com 9º dígito (11), formatando
 * progressivamente conforme a quantidade digitada. */
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return d;
}
