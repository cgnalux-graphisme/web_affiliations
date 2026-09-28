"use server";

import { revalidatePath } from "next/cache";
import { getSuperAdmin } from "../../../lib/supabase-server";

/**
 * Rafraîchit les pages publiques du blog après une modification (sinon elles se
 * mettent à jour d'elles-mêmes en moins d'une minute). Réservé aux super admins.
 */
export async function rafraichirBlog(slugs: string[] = []) {
  if (!(await getSuperAdmin())) return;
  revalidatePath("/blog");
  revalidatePath("/");
  for (const slug of slugs) if (slug) revalidatePath(`/blog/${slug}`);
}
