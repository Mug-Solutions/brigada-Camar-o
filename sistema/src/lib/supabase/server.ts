import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso exclusivo no servidor (Server Components e
 * Server Actions). Usa a service role key porque RLS ainda não foi
 * configurado (não há autenticação de usuários nesta fase) — por isso
 * o import "server-only" no topo: qualquer tentativa de importar este
 * arquivo num Client Component quebra o build, em vez de vazar a chave.
 */
export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados em .env.local"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
