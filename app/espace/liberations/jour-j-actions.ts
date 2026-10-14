"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseService } from "../../../lib/supabase-service";
import { BUCKET_LIBERATIONS, contexteLiberations, type ContexteLiberations } from "../../../lib/liberations/donnees-serveur";
import { calculerKmTrajet } from "../../../lib/liberations/jour-j-serveur";
import { nouveauJetonQr } from "../../../lib/liberations/jeton-serveur";
import { lireMontant } from "../../../lib/liberations/montants";
import { STATUTS_QR } from "../../../lib/liberations/statuts";

/**
 * Jour J côté Espace (lot 3). QR code : admin ou permanent demandeur. Présences, kilomètres et tickets : admins.
 * Droit revérifié à chaque action, écriture en service_role.
 */

export type Resultat = { ok: true; message?: string } | { ok: false; erreur: string };

const REFUS = "Accès refusé. Reconnectez-vous.";
const ADMINS = "Réservé aux admins (ADMIN_OP, SUPER_ADMIN).";
const ECHEC = "Enregistrement impossible. Rechargez la page puis réessayez.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = ContexteLiberations & { db: SupabaseClient };

async function ctx(): Promise<Ctx | null> {
  const c = await contexteLiberations();
  const db = getSupabaseService();
  return c && db ? { ...c, db } : null;
}

const rafraichir = (id: string) => {
  revalidatePath(`/espace/liberations/${id}`);
  revalidatePath(`/espace/liberations/${id}/qr`);
};

/** Crée le QR code du dossier, ou le remplace (l'ancien ne fonctionne plus). Admin ou permanent demandeur. */
export async function genererQr(dossierId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c || !UUID.test(dossierId)) return { ok: false, erreur: REFUS };
  const { data: d } = await c.db.from("site_liberations").select("id, statut, demandeur_id").eq("id", dossierId).maybeSingle();
  if (!d || !(c.admin || d.demandeur_id === c.user.id)) return { ok: false, erreur: "Dossier introuvable." };
  if (!STATUTS_QR.includes(d.statut)) return { ok: false, erreur: "Le QR code se crée une fois le dossier pris en charge, et jusqu'au jour J." };
  const { error } = await c.db.from("site_liberations").update({ qr_jeton: nouveauJetonQr(), qr_cree_le: new Date().toISOString() }).eq("id", dossierId);
  if (error) return { ok: false, erreur: error.code === "42703" ? "Les tables du jour J ne sont pas encore créées (migration 20261014120000)." : ECHEC };
  rafraichir(dossierId);
  return { ok: true, message: "QR code prêt." };
}

async function presenceAdmin(c: Ctx, presenceId: string) {
  if (!c.admin || !UUID.test(presenceId)) return null;
  const { data } = await c.db.from("site_liberation_presences").select("id, liberation_id, signature_chemin").eq("id", presenceId).maybeSingle();
  return data as { id: string; liberation_id: string; signature_chemin: string | null } | null;
}

/** Présence « à vérifier » (hors liste, ou carte sans n° de registre national) confirmée par un admin. */
export async function validerPresence(presenceId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const p = await presenceAdmin(c, presenceId);
  if (!p) return { ok: false, erreur: ADMINS };
  const { error } = await c.db.from("site_liberation_presences").update({ a_verifier: false, verifie_le: new Date().toISOString(), verifie_par: c.user.id }).eq("id", presenceId);
  if (error) return { ok: false, erreur: ECHEC };
  rafraichir(p.liberation_id);
  return { ok: true, message: "Présence confirmée." };
}

/** Supprime une présence (erreur, doublon) avec sa signature, son trajet et ses tickets. */
export async function supprimerPresence(presenceId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const p = await presenceAdmin(c, presenceId);
  if (!p) return { ok: false, erreur: ADMINS };
  const { data: tickets } = await c.db.from("site_liberation_tickets").select("chemin").eq("presence_id", presenceId);
  const { error } = await c.db.from("site_liberation_presences").delete().eq("id", presenceId);
  if (error) return { ok: false, erreur: ECHEC };
  const chemins = [p.signature_chemin, ...((tickets ?? []) as { chemin: string }[]).map((t) => t.chemin)].filter((x): x is string => Boolean(x));
  if (chemins.length) await c.db.storage.from(BUCKET_LIBERATIONS).remove(chemins);
  rafraichir(p.liberation_id);
  return { ok: true, message: "Présence supprimée." };
}

async function trajetAdmin(c: Ctx, trajetId: string) {
  if (!c.admin || !UUID.test(trajetId)) return null;
  const { data } = await c.db.from("site_liberation_trajets").select("id, liberation_id").eq("id", trajetId).maybeSingle();
  return data as { id: string; liberation_id: string } | null;
}

/** Recalcule les kilomètres avec Google Maps (même s'ils avaient été corrigés à la main). */
export async function recalculerKm(trajetId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const t = await trajetAdmin(c, trajetId);
  if (!t) return { ok: false, erreur: ADMINS };
  const r = await calculerKmTrajet(c.db, trajetId, true);
  rafraichir(t.liberation_id);
  return r.ok ? { ok: true, message: r.message } : { ok: false, erreur: r.message };
}

/** Kilomètres saisis à la main (aller-retour). */
export async function corrigerKm(trajetId: string, saisie: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const t = await trajetAdmin(c, trajetId);
  if (!t) return { ok: false, erreur: ADMINS };
  const km = lireMontant(saisie);
  if (km === undefined || km === null || km > 2000) return { ok: false, erreur: "Kilomètres invalides. Exemple : 64,8" };
  const { error } = await c.db.from("site_liberation_trajets").update({ km: Math.round(km * 10) / 10, km_manuel: true, km_erreur: null }).eq("id", trajetId);
  if (error) return { ok: false, erreur: ECHEC };
  rafraichir(t.liberation_id);
  return { ok: true, message: "Kilomètres corrigés." };
}

/** Tickets de train : montant total et « vérifiés ». */
export async function enregistrerTickets(trajetId: string, montant: string, verifies: boolean): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const t = await trajetAdmin(c, trajetId);
  if (!t) return { ok: false, erreur: ADMINS };
  const m = lireMontant(montant);
  if (m === undefined) return { ok: false, erreur: "Montant invalide. Exemple : 18,40" };
  const { error } = await c.db.from("site_liberation_trajets").update({
    montant_tickets: m, tickets_verifies_le: verifies ? new Date().toISOString() : null, tickets_verifies_par: verifies ? c.user.id : null,
  }).eq("id", trajetId);
  if (error) return { ok: false, erreur: ECHEC };
  rafraichir(t.liberation_id);
  return { ok: true, message: "Tickets enregistrés." };
}
