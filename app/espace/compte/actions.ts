"use server";

import { revalidatePath } from "next/cache";
import { monProfil } from "../../../lib/espace/acces";
import { ROLES_EQUIPE } from "../../../lib/espace/roles";
import { getSupabaseService } from "../../../lib/supabase-service";
import { formaterTelephone } from "../../../lib/telephone";

type Resultat = { ok: true; message?: string } | { ok: false; erreur: string };

/**
 * Mon compte : chaque membre de l'équipe règle sa propre fonction (signature des courriers) et son téléphone
 * (« Votre correspondant »). La personne connectée n'écrit que sa propre ligne de site_equipe_profils, par le
 * serveur (aucune écriture possible depuis le navigateur sur cette table).
 */
export async function enregistrerMaSignature(champs: Record<string, string>): Promise<Resultat> {
  const profil = await monProfil();
  if (!profil) return { ok: false, erreur: "Session expirée. Reconnectez-vous." };
  if (!(ROLES_EQUIPE as readonly string[]).includes(profil.role))
    return { ok: false, erreur: "Seuls les membres de l'équipe ont une signature et un téléphone de correspondant." };
  const db = getSupabaseService();
  if (!db) return { ok: false, erreur: "La base n'est pas joignable. Réessayez plus tard." };
  const fonction = (champs.fonction ?? "").trim().slice(0, 120) || null;
  const telephone = (champs.telephone ?? "").trim() ? formaterTelephone(champs.telephone) : null;
  const { error } = await db
    .from("site_equipe_profils")
    .upsert({ user_id: profil.id, fonction, telephone, updated_at: new Date().toISOString() });
  if (error) return { ok: false, erreur: "Enregistrement impossible. Rechargez la page puis réessayez." };
  revalidatePath("/espace/compte");
  revalidatePath("/espace/liberations/parametres");
  return { ok: true, message: "Enregistré." };
}
