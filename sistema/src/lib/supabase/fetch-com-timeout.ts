import "server-only";

const TIMEOUT_PADRAO_MS = 10_000;

function fetchComSinal(timeoutMs: number, input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...init, signal });
}

/**
 * fetch com timeout (+ 1 nova tentativa se o timeout disparar) pra
 * chamadas ao Supabase a partir do servidor.
 *
 * Achado real: sem timeout nenhum, uma requisição que trava depois de
 * abrir a conexão (socket do pool de keep-alive do Node reaproveitado
 * que morreu em silêncio do outro lado — comum atrás de NAT/firewall)
 * deixa `supabase.auth.getUser()` (chamado em toda página autenticada
 * via getSessionUsuario()) pendurado pra sempre. Sem timeout, a
 * página trava num "Carregando..." infinito em vez de mostrar um erro
 * e deixar o usuário tentar de novo — foi confirmado ao vivo: com a
 * sessão presa assim, nem o botão "Sair" (Server Action) completava.
 *
 * A segunda tentativa existe porque, nesse cenário específico (socket
 * morto, não o Supabase fora do ar — confirmado ao vivo testando
 * direto), o problema é local a UMA conexão do pool: tentar de novo
 * abre um socket novo e normalmente resolve sozinho, sem o usuário
 * nem perceber que algo travou. `AbortSignal.timeout()` rejeita com
 * um erro `TimeoutError` especificamente quando é ELE quem aborta
 * (não quando é o próprio chamador, via `init.signal`) — só repete
 * nesse caso, nunca mascarando um abort intencional ou outro tipo de
 * falha de rede.
 *
 * Combina com o AbortSignal que o supabase-js já passar (cancelamento
 * próprio da lib), em vez de substituí-lo — os dois motivos de aborto
 * continuam funcionando.
 */
export function criarFetchComTimeout(timeoutMs: number = TIMEOUT_PADRAO_MS): typeof fetch {
  return async (input, init) => {
    try {
      return await fetchComSinal(timeoutMs, input, init);
    } catch (erro) {
      if (erro instanceof Error && erro.name === "TimeoutError") {
        return fetchComSinal(timeoutMs, input, init);
      }
      throw erro;
    }
  };
}
