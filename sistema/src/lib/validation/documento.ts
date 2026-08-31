/** Remove tudo que não é dígito — usado para comparar CPF/telefone
 * independente de máscara (pontos, traço, parênteses, espaço). */
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function cpfTemFormatoValido(cpf: string): boolean {
  return apenasDigitos(cpf).length === 11;
}

export function cnpjTemFormatoValido(cnpj: string): boolean {
  return apenasDigitos(cnpj).length === 14;
}

/** Aceita telefone fixo (10 dígitos) ou celular com 9º dígito (11), com ou sem DDD já contado nisso. */
export function telefoneTemFormatoValido(telefone: string): boolean {
  const digitos = apenasDigitos(telefone).length;
  return digitos === 10 || digitos === 11;
}
