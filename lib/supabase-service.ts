import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role : contourne la RLS.
 * SERVEUR UNIQUEMENT (routes API) — ne jamais l'importer dans un composant client.
 * Retourne null si SUPABASE_SERVICE_ROLE_KEY n'est pas configurée.
 */
export function getSupabaseService(): SupabaseClient | null {
  if (typeof window !== "undefined") throw new Error("getSupabaseService() est réservé au serveur.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return null;
  return createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
