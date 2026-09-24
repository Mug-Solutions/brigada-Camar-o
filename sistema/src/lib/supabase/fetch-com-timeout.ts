import "server-only";

const TIMEOUT_PADRAO_MS = 10_000;

/**
 * fetch com timeout pra chamadas ao Supabase a partir do servidor.
 *
 * Achado real: sem isso, uma requisição que trava depois de abrir a
 * conexão (socket do pool de keep-alive do Node reaproveitado que
 * morreu em silêncio do outro lado — comum atrás de NAT/firewall)
 * deixa `supabase.auth.getUser()` (chamado em toda página autenticada
 * via getSessionUsuario()) pendurado pra sempre. Sem timeout, a
 * página trava num "Carregando..." infinito em vez de mostrar um erro
 * e deixar o usuário tentar de novo — foi confirmado ao vivo: com a
 * sessão presa assim, nem o botão "Sair" (Server Action) completava.
 *
 * Combina com o AbortSignal que o supabase-js já passar (cancelamento
 * próprio da lib), em vez de substituí-lo — os dois motivos de aborto
 * continuam funcionando.
 */
export function criarFetchComTimeout(timeoutMs: number = TIMEOUT_PADRAO_MS): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    return fetch(input, { ...init, signal });
  };
}
