import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** Client Supabase partagé (formulaires publics, sans session auth). */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  }
  return client;
}

let authClient: SupabaseClient | undefined;

/**
 * Client Supabase navigateur AVEC session (espace admin).
 * La session est stockée en cookies, donc lisible aussi côté serveur et proxy.
 */
export function getSupabaseAuth(): SupabaseClient {
  if (!authClient) {
    authClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return authClient;
}
