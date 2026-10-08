import { getSupabaseService } from "./supabase-service";
import type { DonneesAssistant } from "./assistant-parcours";

/**
 * Tables de l'Assistant CG (créées et remplies directement dans Supabase par Fred, 07/10/2026) :
 * lues UNIQUEMENT côté serveur, avec la clé service_role (anon n'y a aucun accès).
 * Les colonnes permanent_nom / permanent_email de site_chatbot_repartition ne sont jamais lues.
 */

export const CLE_CHATBOT_ACTIF = "chatbot_actif";

const DUREE_CACHE = 5 * 60_000;
let cache: { donnees: DonneesAssistant; expire: number } | null = null;

export async function chargerDonneesAssistant(): Promise<DonneesAssistant | null> {
  if (cache && cache.expire > Date.now()) return cache.donnees;
  const supabase = getSupabaseService();
  if (!supabase) return null;
  const [secteurs, repartition, centrales, antennes] = await Promise.all([
    supabase.from("site_chatbot_secteurs").select("mot_cle, centrales, remarque"),
    supabase
      .from("site_chatbot_repartition")
      .select("region, cp_code, cp_nom, contact_nom, contact_email, contact_tel")
      .eq("actif", true),
    supabase
      .from("site_chatbot_centrales")
      .select("province, centrale, nom_affiche, bureau, adresse, code_postal, commune, telephone, email, horaires, site_web"),
    supabase.from("site_chatbot_antennes").select("province, antenne, adresse, code_postal, commune, telephone, horaires"),
  ]);
  const erreur = secteurs.error || repartition.error || centrales.error || antennes.error;
  if (erreur) {
    console.error("[assistant] Lecture des tables impossible :", erreur.message);
    return null;
  }
  const donnees: DonneesAssistant = {
    secteurs: secteurs.data ?? [],
    // Codes nettoyés (« CP 144 » est saisi avec une espace finale dans la base).
    repartition: (repartition.data ?? []).map((r) => ({ ...r, cp_code: r.cp_code.trim() })),
    centrales: centrales.data ?? [],
    antennes: antennes.data ?? [],
  };
  cache = { donnees, expire: Date.now() + DUREE_CACHE };
  return donnees;
}

/** Interrupteur site_parametres.chatbot_actif ('on' / 'off'). En développement local, l'assistant est toujours visible. */
export async function assistantActif(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  const supabase = getSupabaseService();
  if (!supabase) return false;
  const { data, error } = await supabase.from("site_parametres").select("valeur").eq("cle", CLE_CHATBOT_ACTIF).maybeSingle();
  if (error) return false;
  return data?.valeur === "on";
}
