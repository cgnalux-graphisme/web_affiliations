import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUCKET_PHOTOS,
  cheminDepuisUrl,
  cheminPhoto,
  preparerPhoto,
  rangDepuisChemin,
} from "./photos";

/** Photo déjà enregistrée (ligne de site_photos). */
export type PhotoEnregistree = { id: string; url: string; legende: string | null };

/** Photo telle qu'éditée dans le formulaire : déjà enregistrée, ou nouvelle (fichier local). */
export type PhotoEdition =
  | { cle: string; legende: string; id: string; url: string; file?: undefined; apercu?: undefined }
  | { cle: string; legende: string; file: File; apercu: string; id?: undefined; url?: undefined };

export type BilanPhotos = { ajoutees: number; erreurs: string[] };

function nomPhoto(p: { legende?: string | null; file?: File }, rang: number): string {
  return p.file?.name ?? (p.legende?.trim() || `photo n°${rang + 1}`);
}

/**
 * Aligne les photos d'une action sur la liste éditée :
 *  1. supprime les photos retirées (fichier du bucket PUIS ligne de site_photos) ;
 *  2. applique l'ordre : le rang est dans le nom du fichier, une photo qui change de
 *     place est renommée (move) et son URL mise à jour ;
 *  3. envoie les nouvelles photos (réduites en JPEG) et les rattache à l'action ;
 *  4. enregistre les légendes modifiées.
 * Chaque échec est listé sans interrompre le reste.
 */
export async function synchroniserPhotos(
  supabase: SupabaseClient,
  actionId: string,
  liste: PhotoEdition[],
  originales: PhotoEnregistree[],
  onProgression: (message: string) => void = () => {}
): Promise<BilanPhotos> {
  const stockage = supabase.storage.from(BUCKET_PHOTOS);
  const urlPublique = (chemin: string) => stockage.getPublicUrl(chemin).data.publicUrl;
  const erreurs: string[] = [];
  let ajoutees = 0;

  // 1) Suppressions
  const gardees = new Set(liste.flatMap((p) => (p.id ? [p.id] : [])));
  const aSupprimer = originales.filter((o) => !gardees.has(o.id));
  for (const [i, o] of aSupprimer.entries()) {
    onProgression(`Suppression des photos ${i + 1}/${aSupprimer.length}…`);
    const chemin = cheminDepuisUrl(o.url);
    if (chemin) {
      const { data, error } = await stockage.remove([chemin]);
      // Sans droit suffisant, Storage ne renvoie pas d'erreur mais une liste vide.
      if (error || !data?.length) {
        console.error("remove", chemin, error);
        erreurs.push(`Suppression impossible : ${nomPhoto(o, i)}`);
        continue;
      }
    }
    const { error } = await supabase.from("site_photos").delete().eq("id", o.id);
    if (error) {
      console.error(error);
      erreurs.push(`Suppression incomplète : ${nomPhoto(o, i)}`);
    }
  }

  // 2) à 4) Ordre, ajouts, légendes
  for (const [rang, p] of liste.entries()) {
    const legende = p.legende.trim() || null;

    if (p.file) {
      onProgression(`Envoi des photos ${rang + 1}/${liste.length}…`);
      const chemin = cheminPhoto(actionId, rang, crypto.randomUUID());
      try {
        const jpeg = await preparerPhoto(p.file);
        const { error: errEnvoi } = await stockage.upload(chemin, jpeg, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        });
        if (errEnvoi) throw errEnvoi;
        const { error: errLigne } = await supabase
          .from("site_photos")
          .insert({ action_id: actionId, url: urlPublique(chemin), legende });
        if (errLigne) {
          // Fichier envoyé mais non référencé : on le retire du bucket.
          await stockage.remove([chemin]);
          throw errLigne;
        }
        ajoutees++;
      } catch (err) {
        console.error(err);
        erreurs.push(`Envoi impossible : ${nomPhoto(p, rang)}`);
      }
      continue;
    }

    const originale = originales.find((o) => o.id === p.id);
    const maj: { url?: string; legende?: string | null } = {};
    if (legende !== (originale?.legende?.trim() || null)) maj.legende = legende;

    const chemin = cheminDepuisUrl(p.url);
    let deplacement: { de: string; vers: string } | null = null;
    if (chemin && rangDepuisChemin(chemin) !== rang) {
      onProgression("Mise à jour de l'ordre des photos…");
      const vers = cheminPhoto(actionId, rang, crypto.randomUUID());
      const { error } = await stockage.move(chemin, vers);
      if (error) {
        console.error("move", chemin, error);
        erreurs.push(`Ordre non modifié : ${nomPhoto(p, rang)}`);
      } else {
        deplacement = { de: chemin, vers };
        maj.url = urlPublique(vers);
      }
    }

    if (Object.keys(maj).length) {
      const { error } = await supabase.from("site_photos").update(maj).eq("id", p.id);
      if (error) {
        console.error(error);
        // L'URL enregistrée pointe encore vers l'ancien chemin : on y remet le fichier.
        if (deplacement) await stockage.move(deplacement.vers, deplacement.de);
        erreurs.push(`Mise à jour impossible : ${nomPhoto(p, rang)}`);
      }
    }
  }

  return { ajoutees, erreurs };
}
