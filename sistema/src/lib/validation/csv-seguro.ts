/** Nome de pessoa/evento/cliente real, ou chave PIX real, nunca começa
 * com esses caracteres — bloqueia CSV/Formula Injection (OWASP): um
 * valor tipo "=CMD(...)" ou "=HYPERLINK(...)" gravado como está
 * executaria como fórmula se esse dado for exportado pra CSV/Excel
 * (o sistema já exporta financeiro e folha de pagamento — ver
 * src/app/api/export/). Usado tanto na entrada (rejeita o valor,
 * não silenciosamente altera um campo de identidade/pagamento real)
 * quanto na saída (defesa em profundidade pra dado que já estava no
 * banco antes desta checagem existir). */
const CARACTERES_FORMULA = /^[=+\-@\t\r]/;

export function comecaComCaractereFormula(valor: string): boolean {
  return CARACTERES_FORMULA.test(valor);
}

/** Pra uso só na exportação (defesa em profundidade) — nunca na
 * gravação, onde o valor deve ser rejeitado, não alterado. */
export function escaparParaCsv(valor: string): string {
  return comecaComCaractereFormula(valor) ? `'${valor}` : valor;
}
