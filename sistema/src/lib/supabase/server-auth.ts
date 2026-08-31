import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Cliente Supabase vinculado à sessão do usuário logado (via cookies),
 * respeitando RLS — diferente de src/lib/supabase/server.ts, que usa a
 * service-role key e ignora RLS de propósito para as telas admin.
 *
 * Use este client sempre que a consulta precisar ser filtrada pelo
 * usuário autenticado (ex.: um bombeiro lendo sua própria escala).
 *
 * Retorna null quando as variáveis de ambiente de auth não estão
 * configuradas, para preservar o "modo apresentação" das páginas admin.
 */
export async function getSessionSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Chamado a partir de um Server Component (não pode gravar cookie).
          // A sessão continua sendo renovada normalmente pelo proxy (src/proxy.ts).
        }
      },
    },
  });
}
