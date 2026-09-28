import type { SupabaseClient } from "@supabase/supabase-js";
import { VEILLE_NOUVEAU } from "./veille";
import { lireFlux } from "./veille-flux";

export type BilanSource = { source: string; trouves: number; ajoutes: number; erreur?: string };
export type BilanRamassage = { sources: BilanSource[]; ajoutes: number; duree_ms: number };

const DELAI_MS = 12_000;
const TAILLE_MAX = 5 * 1024 * 1024;

async function telechargerFlux(url: string): Promise<string> {
  const reponse = await fetch(url, {
    signal: AbortSignal.timeout(DELAI_MS),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; VeilleACCGNalux/1.0; +https://accg-nalux.com)",
      Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!reponse.ok) throw new Error(`le site répond ${reponse.status}`);
  const texte = await reponse.text();
  if (texte.length > TAILLE_MAX) throw new Error("flux trop volumineux");
  return texte;
}

function messageErreur(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") return "le site ne répond pas (délai dépassé)";
    return err.message;
  }
  return String(err);
}

/**
 * Lit le flux de chaque source active et ajoute ses articles à site_veille, sans doublon :
 * l'index unique sur "lien" + ignoreDuplicates = « on conflict do nothing ».
 * Une source en échec n'empêche pas les autres.
 */
export async function ramasserFlux(supabase: SupabaseClient): Promise<BilanRamassage> {
  const debut = Date.now();
  const { data: sources, error } = await supabase
    .from("site_sources")
    .select("id, nom, url_flux")
    .eq("actif", true)
    .order("nom");
  if (error) throw new Error(`Lecture des sources impossible : ${error.message}`);

  const bilans = await Promise.all(
    (sources ?? []).map(async (s: { id: string; nom: string; url_flux: string }): Promise<BilanSource> => {
      try {
        const items = lireFlux(await telechargerFlux(s.url_flux));
        if (!items.length) return { source: s.nom, trouves: 0, ajoutes: 0 };
        const lignes = items.map((i) => ({
          ...i,
          source_id: s.id,
          source_nom: s.nom,
          statut: VEILLE_NOUVEAU,
        }));
        const { data, error: errInsert } = await supabase
          .from("site_veille")
          .upsert(lignes, { onConflict: "lien", ignoreDuplicates: true })
          .select("id");
        if (errInsert) throw new Error(`enregistrement impossible (${errInsert.message})`);
        return { source: s.nom, trouves: items.length, ajoutes: data?.length ?? 0 };
      } catch (err) {
        console.error(`veille ${s.nom}:`, err);
        return { source: s.nom, trouves: 0, ajoutes: 0, erreur: messageErreur(err) };
      }
    })
  );

  return {
    sources: bilans,
    ajoutes: bilans.reduce((n, b) => n + b.ajoutes, 0),
    duree_ms: Date.now() - debut,
  };
}
