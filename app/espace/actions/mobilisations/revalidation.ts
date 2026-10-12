"use server";

import { revalidatePath } from "next/cache";
import { aApp } from "../../../../lib/espace/acces";

/**
 * Rafraîchit tout le site public après un changement de mobilisation ou de l'interrupteur de l'accueil :
 * le bandeau d'alerte est dans le layout, donc sur toutes les pages (sinon mise à jour en moins d'une minute).
 * Réservé aux super admins.
 */
export async function rafraichirMobilisation() {
  if (!(await aApp("actions"))) return;
  revalidatePath("/", "layout");
}
