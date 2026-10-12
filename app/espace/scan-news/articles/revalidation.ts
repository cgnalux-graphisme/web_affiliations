"use server";

import { revalidatePath } from "next/cache";
import { CHEMIN_ACTUALITES, RUBRIQUES } from "../../../../lib/articles";
import { aApp } from "../../../../lib/espace/acces";

/**
 * Rafraîchit les pages publiques du blog et de « On vous explique » (liste unifiée /actualites comprise) après une modification (sinon
 * elles se mettent à jour d'elles-mêmes en moins d'une minute). Réservé aux super admins.
 * Les deux rubriques sont rafraîchies : un changement de rubrique ne laisse pas d'ancienne page en cache.
 */
export async function rafraichirBlog(slugs: string[] = []) {
  if (!(await aApp("scan-news"))) return;
  revalidatePath("/");
  revalidatePath(CHEMIN_ACTUALITES);
  for (const rubrique of Object.values(RUBRIQUES)) {
    revalidatePath(rubrique.chemin);
    for (const slug of slugs) if (slug) revalidatePath(`${rubrique.chemin}/${slug}`);
  }
}
