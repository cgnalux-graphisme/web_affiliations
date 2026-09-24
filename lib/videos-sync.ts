import type { SupabaseClient } from "@supabase/supabase-js";

/** Vidéo déjà enregistrée (ligne de site_videos). */
export type VideoEnregistree = { id: string; url: string; titre: string | null };

/** Vidéo telle qu'éditée dans le formulaire (id absent = nouvelle). */
export type VideoEdition = { cle: string; id?: string; url: string; titre: string };

/**
 * Aligne les vidéos d'une action sur la liste éditée : suppression des vidéos retirées,
 * ajout des nouvelles, enregistrement des titres modifiés. Renvoie les erreurs rencontrées.
 */
export async function synchroniserVideos(
  supabase: SupabaseClient,
  actionId: string,
  liste: VideoEdition[],
  originales: VideoEnregistree[]
): Promise<{ ajoutees: number; erreurs: string[] }> {
  const erreurs: string[] = [];
  const nom = (v: { titre: string | null; url: string }) => v.titre?.trim() || v.url;

  const gardees = new Set(liste.flatMap((v) => (v.id ? [v.id] : [])));
  for (const o of originales.filter((o) => !gardees.has(o.id))) {
    const { error } = await supabase.from("site_videos").delete().eq("id", o.id);
    if (error) {
      console.error(error);
      erreurs.push(`Suppression impossible : vidéo ${nom(o)}`);
    }
  }

  const nouvelles = liste.filter((v) => !v.id);
  if (nouvelles.length) {
    const { error } = await supabase
      .from("site_videos")
      .insert(nouvelles.map((v) => ({ action_id: actionId, url: v.url, titre: v.titre.trim() || null })));
    if (error) {
      console.error(error);
      erreurs.push(`Ajout impossible : ${nouvelles.length} vidéo${nouvelles.length > 1 ? "s" : ""}`);
    }
  }

  for (const v of liste.filter((v) => v.id)) {
    const titre = v.titre.trim() || null;
    const originale = originales.find((o) => o.id === v.id);
    if (titre === (originale?.titre?.trim() || null)) continue;
    const { error } = await supabase.from("site_videos").update({ titre }).eq("id", v.id!);
    if (error) {
      console.error(error);
      erreurs.push(`Titre non modifié : vidéo ${nom({ titre, url: v.url })}`);
    }
  }

  return { ajoutees: erreurs.some((e) => e.startsWith("Ajout")) ? 0 : nouvelles.length, erreurs };
}
