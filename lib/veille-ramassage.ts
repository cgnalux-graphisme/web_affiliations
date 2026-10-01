import type { SupabaseClient } from "@supabase/supabase-js";
import { VEILLE_NOUVEAU, dansLaMemoire, limiteMemoire } from "./veille";
import { lireFlux } from "./veille-flux";

export type BilanSource = { source: string; trouves: number; ajoutes: number; erreur?: string };
export type BilanRamassage = { sources: BilanSource[]; ajoutes: number; purges: number; duree_ms: number };

/** site_parametres : date (ISO) du dernier ramassage, pour activer « Check IA » sur un fil à jour. */
export const CLE_DERNIER_RAMASSAGE = "veille_dernier_ramassage";
/** Durée de conservation des classements « Check IA ». */
const ANALYSES_JOURS = 7;

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
        // Seuls les articles de moins de MEMOIRE_JOURS jours entrent dans le fil.
        const items = lireFlux(await telechargerFlux(s.url_flux)).filter((i) => dansLaMemoire(i.date_publication));
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

  const purges = await purgerFil(supabase);
  const { error: errDate } = await supabase
    .from("site_parametres")
    .upsert({ cle: CLE_DERNIER_RAMASSAGE, valeur: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (errDate) console.error("veille : date du ramassage non enregistrée", errDate);

  return {
    sources: bilans,
    ajoutes: bilans.reduce((n, b) => n + b.ajoutes, 0),
    purges,
    duree_ms: Date.now() - debut,
  };
}

/**
 * Efface du fil les articles de plus de MEMOIRE_JOURS jours (date de publication, sinon date de ramassage)
 * et les classements « Check IA » de plus de ANALYSES_JOURS jours. Un échec est journalisé, jamais bloquant.
 */
export async function purgerFil(supabase: SupabaseClient): Promise<number> {
  const limite = limiteMemoire();
  const { data, error } = await supabase
    .from("site_veille")
    .delete()
    .or(`date_publication.lt.${limite},and(date_publication.is.null,created_at.lt.${limite})`)
    .select("id");
  if (error) console.error("veille : purge du fil impossible", error);

  const limiteAnalyses = new Date(Date.now() - ANALYSES_JOURS * 24 * 60 * 60 * 1000).toISOString();
  const { error: errAnalyses } = await supabase.from("site_veille_analyses").delete().lt("created_at", limiteAnalyses);
  if (errAnalyses) console.error("veille : purge des classements impossible", errAnalyses);

  return data?.length ?? 0;
}
