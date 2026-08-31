/** Converte "15/04/2026" (formato usado nas planilhas da Brigada
 * Camarão) para "2026-04-15" (ISO, formato usado no banco). Retorna
 * `null` se não bater o formato ou a data não existir de verdade
 * (ex.: 31/02). */
export function dataBrParaIso(dataBr: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBr.trim());
  if (!match) return null;

  const [, diaStr, mesStr, anoStr] = match;
  const dia = Number(diaStr);
  const mes = Number(mesStr);
  const ano = Number(anoStr);

  const data = new Date(ano, mes - 1, dia);
  const dataValida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  if (!dataValida) return null;

  return `${anoStr}-${mesStr}-${diaStr}`;
}
