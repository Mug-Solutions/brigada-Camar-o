import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso exclusivo no servidor (Server Components e
 * Server Actions). Usa a service role key porque RLS ainda não foi
 * configurado (não há autenticação de usuários nesta fase) — por isso
 * o import "server-only" no topo: qualquer tentativa de importar este
 * arquivo num Client Component quebra o build, em vez de vazar a chave.
 *
 * Retorna null quando as variáveis de ambiente não estão configuradas,
 * para permitir que as páginas caiam em dados de demonstração em vez
 * de quebrar — útil para apresentar a tela antes do banco existir.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/** Versão que lança erro — para Server Actions, onde salvar sem banco não faz sentido. */
export function createServerSupabaseClient(): SupabaseClient {
  const client = getServerSupabaseClient();
  if (!client) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados em .env.local"
    );
  }
  return client;
}
