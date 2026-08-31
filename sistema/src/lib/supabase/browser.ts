import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso em Client Components. Usa a anon key (segura
 * para o navegador — o acesso real é controlado por RLS) e persiste a
 * sessão via cookies, para que o servidor (Server Components, proxy)
 * enxergue o mesmo login.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar configurados em .env.local"
    );
  }

  return createBrowserClient(url, anonKey);
}
