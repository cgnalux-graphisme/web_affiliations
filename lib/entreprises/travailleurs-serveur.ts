import type { SupabaseClient } from "@supabase/supabase-js";
import { lireCle } from "./regles";
import { COLONNES_WORKER, trierTravailleurs, versTravailleur, type LigneWorker, type Travailleur } from "./travailleurs";

/**
 * Lecture des travailleurs (table `workers` de CG Link). SERVEUR UNIQUEMENT, clé service_role : à n'appeler
 * qu'après avoir vérifié le droit (app Entreprises, ou périmètre de l'app Délégués).
 */

/** Entreprises CG Link d'une fiche : la sienne et celles qu'elle regroupe (`autres_company_ids`). */
export async function companiesDeLaCle(db: SupabaseClient, cle: string): Promise<string[] | null> {
  const c = lireCle(cle);
  if (!c) return null;
  if (c.type === "company") return [c.id];
  return companiesDeLaFiche(db, c.id);
}

export async function companiesDeLaFiche(db: SupabaseClient, ficheId: string): Promise<string[] | null> {
  const { data, error } = await db.from("site_entreprises").select("company_id, autres_company_ids").eq("id", ficheId).maybeSingle();
  if (error || !data) return null;
  const f = data as { company_id: string | null; autres_company_ids: string[] | null };
  return [...new Set([f.company_id, ...(f.autres_company_ids ?? [])].filter((x): x is string => !!x))];
}

/** Tous les travailleurs de ces entreprises CG Link, triés par nom (au plus quelques centaines par entreprise). */
export async function travailleursDe(db: SupabaseClient, companyIds: string[]): Promise<Travailleur[] | null> {
  if (!companyIds.length) return [];
  const lignes: LigneWorker[] = [];
  // Par pages de 1000 (limite de l'API) : une entreprise en compte 601 au plus aujourd'hui.
  for (let debut = 0; debut < 20_000; debut += 1000) {
    const { data, error } = await db.from("workers").select(COLONNES_WORKER).in("company_id", companyIds).order("id").range(debut, debut + 999);
    if (error) {
      console.error("[travailleurs]", error.code);
      return null;
    }
    lignes.push(...((data ?? []) as LigneWorker[]));
    if (!data || data.length < 1000) break;
  }
  return trierTravailleurs(lignes.map(versTravailleur));
}
