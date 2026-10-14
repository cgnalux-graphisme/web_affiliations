"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseService } from "../../../lib/supabase-service";
import { nissValide } from "../../../lib/modification";
import { BUCKET_LIBERATIONS } from "../../../lib/liberations/donnees-serveur";
import { calculerKmTrajet, dossierParJeton, type DossierPublic } from "../../../lib/liberations/jour-j-serveur";
import { JETON_QR, empreinteAppareil, lirePasse, signerPasse } from "../../../lib/liberations/jeton-serveur";
import { TICKETS_MAX, essaisEpuises, fenetreQr, modeTrajet, validerTrajet, type SaisieTrajet } from "../../../lib/liberations/jour-j";
import { STATUTS_QR } from "../../../lib/liberations/statuts";

/**
 * Page publique du QR code (lot 3), SANS COMPTE. Toute écriture passe ici, en service_role, après vérification :
 * jeton du QR, statut du dossier, horaire (08h00-18h00 un jour du dossier), n° de registre national comparé à celui
 * de la carte du délégué, limite des essais. Rien n'est jamais renvoyé au navigateur hormis des oui / non.
 */

export type Retour<T = undefined> = { ok: true; donnees?: T } | { ok: false; erreur: string };

const FERME = "Ce QR code ne fonctionne pas maintenant : il est valable de 08h00 à 18h00, les jours de la réunion.";
const INVALIDE = "Ce QR code n'est plus valable. Demande le nouveau au formateur.";
const ECHEC = "L'enregistrement a échoué. Réessaie dans un instant.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ouvert = { db: SupabaseClient; dossier: DossierPublic; dateId: string; empreinte: string };

async function ouvrir(jeton: string): Promise<Ouvert | { erreur: string }> {
  const db = getSupabaseService();
  if (!db || !JETON_QR.test(jeton)) return { erreur: INVALIDE };
  const dossier = await dossierParJeton(jeton);
  if (!dossier || !STATUTS_QR.includes(dossier.statut)) return { erreur: INVALIDE };
  const f = fenetreQr(dossier.dates, new Date());
  if (!f.ouvert) return { erreur: FERME };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  return { db, dossier, dateId: f.date.id, empreinte: empreinteAppareil(ip) };
}

async function tentatives(o: Ouvert) {
  const { data } = await o.db.from("site_liberation_tentatives").select("empreinte, participant_id, reussie, created_at")
    .eq("liberation_id", o.dossier.id).gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
  return (data ?? []) as { empreinte: string; participant_id: string | null; reussie: boolean; created_at: string }[];
}

async function noterTentative(o: Ouvert, participantId: string | null, reussie: boolean) {
  await o.db.from("site_liberation_tentatives").insert({ liberation_id: o.dossier.id, empreinte: o.empreinte, participant_id: participantId, reussie });
}

const TROP = "Trop d'essais. Attends quelques minutes, ou adresse-toi au formateur.";

/**
 * Étape 2 : le participant donne son n° de registre national. S'il correspond à celui de sa carte, il reçoit un
 * « passe » de 30 minutes. Si sa carte n'a pas encore de numéro, la présence sera « à vérifier » par un admin.
 */
export async function verifierIdentite(jeton: string, participantId: string, registre: string): Promise<Retour<{
  passe: string; dejaSigne: boolean; manque: { domicile: boolean; genre: boolean };
}>> {
  const o = await ouvrir(jeton);
  if ("erreur" in o) return { ok: false, erreur: o.erreur };
  if (!UUID.test(participantId) || !o.dossier.participants.some((p) => p.id === participantId)) return { ok: false, erreur: "Choisis ton nom dans la liste." };
  if (essaisEpuises(await tentatives(o), o.empreinte, participantId, new Date())) return { ok: false, erreur: TROP };
  const chiffres = registre.replace(/\D/g, "");
  if (!nissValide(chiffres)) {
    await noterTentative(o, participantId, false);
    return { ok: false, erreur: "Ce numéro n'est pas un n° de registre national valable : vérifie les 11 chiffres au dos de ta carte d'identité." };
  }
  const { data: p } = await o.db.from("site_liberation_participants").select("delegue_id").eq("id", participantId).maybeSingle();
  const { data: del } = p?.delegue_id
    ? await o.db.from("site_delegues").select("registre_national, genre, adresse_rue, adresse_code_postal, adresse_localite").eq("id", p.delegue_id).maybeSingle()
    : { data: null };
  // Carte sans numéro : on ne peut pas comparer ; la présence sera à vérifier.
  if (del?.registre_national && del.registre_national !== chiffres) {
    await noterTentative(o, participantId, false);
    return { ok: false, erreur: "Ce numéro ne correspond pas à celui enregistré pour ce nom. Vérifie ton nom et ton numéro." };
  }
  await noterTentative(o, participantId, true);
  const { count } = await o.db.from("site_liberation_presences").select("id", { count: "exact", head: true }).eq("date_id", o.dateId).eq("participant_id", participantId);
  return {
    ok: true,
    donnees: {
      passe: signerPasse({ dossier: o.dossier.id, date: o.dateId, participant: participantId, ...(del?.registre_national ? {} : { presence: "a_verifier" }) }),
      dejaSigne: Boolean(count),
      manque: { domicile: !(del?.adresse_rue && del.adresse_code_postal && del.adresse_localite), genre: !del?.genre },
    },
  };
}

export type SaisiePresence = {
  /** Passe reçu à l'étape du n° de registre national (participant de la liste). */
  passe: string | null;
  /** « Je ne suis pas dans la liste ». */
  horsListe: { prenom: string; nom: string; entreprise: string; registre: string } | null;
  /** Signature dessinée : image PNG en data URL. */
  signature: string;
  trajet: SaisieTrajet;
  domicile: { rue: string; numero: string; boite: string; code_postal: string; localite: string } | null;
  genre: "M" | "F" | null;
};

const court = (v: string | undefined, max = 120) => (v ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;

/** Étapes 3 à 5 : signature, trajet, et (seulement s'ils manquent) domicile et genre. */
export async function enregistrerPresence(jeton: string, s: SaisiePresence): Promise<Retour<{ presenceId: string; passeTickets: string | null }>> {
  const o = await ouvrir(jeton);
  if ("erreur" in o) return { ok: false, erreur: o.erreur };

  // Qui signe ?
  let participantId: string | null = null;
  let aVerifier = false;
  let hors: { prenom: string | null; nom: string | null; entreprise: string | null; registre: string } | null = null;
  if (s.horsListe) {
    const essais = await tentatives(o);
    // Au plus 5 personnes « hors liste » par appareil et par heure (contre les envois en série).
    const horsDejaFaits = essais.filter((x) => x.reussie && !x.participant_id && x.empreinte === o.empreinte).length;
    if (essaisEpuises(essais, o.empreinte, null, new Date()) || horsDejaFaits >= 5) return { ok: false, erreur: TROP };
    const registre = s.horsListe.registre.replace(/\D/g, "");
    hors = { prenom: court(s.horsListe.prenom), nom: court(s.horsListe.nom), entreprise: court(s.horsListe.entreprise), registre };
    if (!hors.nom || !hors.prenom) return { ok: false, erreur: "Indique ton prénom et ton nom." };
    if (!nissValide(registre)) {
      await noterTentative(o, null, false);
      return { ok: false, erreur: "Ce numéro n'est pas un n° de registre national valable : vérifie les 11 chiffres." };
    }
    aVerifier = true;
  } else {
    const passe = lirePasse(s.passe);
    if (!passe || passe.dossier !== o.dossier.id || passe.date !== o.dateId || !passe.participant) {
      return { ok: false, erreur: "Ta vérification a expiré. Recommence en choisissant ton nom." };
    }
    participantId = passe.participant;
    aVerifier = passe.presence === "a_verifier";
  }

  // Signature : une image PNG raisonnable.
  const m = s.signature.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  const png = m ? Buffer.from(m[1], "base64") : null;
  if (!png || png.length < 200 || png.length > 400_000) return { ok: false, erreur: "Signe dans le cadre avec ton doigt, puis réessaie." };

  const t = validerTrajet(s.trajet);
  if (!t.ok) return t;

  // Une seule signature par jour pour un participant de la liste.
  if (participantId) {
    const { count } = await o.db.from("site_liberation_presences").select("id", { count: "exact", head: true }).eq("date_id", o.dateId).eq("participant_id", participantId);
    if (count) return { ok: false, erreur: "Ta présence est déjà enregistrée aujourd'hui. Merci !" };
  }

  const presenceId = randomUUID();
  const chemin = `${o.dossier.id}/presences/${presenceId}.png`;
  const { error: eUp } = await o.db.storage.from(BUCKET_LIBERATIONS).upload(chemin, png, { contentType: "image/png" });
  if (eUp) {
    console.error("[liberations] signature :", eUp.message);
    return { ok: false, erreur: ECHEC };
  }
  const { error: eP } = await o.db.from("site_liberation_presences").insert({
    id: presenceId, liberation_id: o.dossier.id, date_id: o.dateId, participant_id: participantId, hors_liste: Boolean(hors),
    prenom_saisi: hors?.prenom ?? null, nom_saisi: hors?.nom ?? null, entreprise_saisie: hors?.entreprise ?? null, registre_saisi: hors?.registre ?? null,
    signature_chemin: chemin, a_verifier: aVerifier,
  });
  if (eP) {
    await o.db.storage.from(BUCKET_LIBERATIONS).remove([chemin]);
    return { ok: false, erreur: eP.code === "23505" ? "Ta présence est déjà enregistrée aujourd'hui. Merci !" : ECHEC };
  }
  if (hors) await noterTentative(o, null, true);

  // Domicile et genre : seulement s'ils manquent sur la carte (jamais d'écrasement).
  let delegueId: string | null = null;
  if (participantId) {
    const { data: p } = await o.db.from("site_liberation_participants").select("delegue_id").eq("id", participantId).maybeSingle();
    delegueId = (p?.delegue_id as string | null) ?? null;
  }
  if (delegueId && (s.domicile || s.genre)) {
    const { data: del } = await o.db.from("site_delegues").select("entreprise_id, genre, adresse_rue, adresse_code_postal, adresse_localite").eq("id", delegueId).maybeSingle();
    const maj: Record<string, string | null> = {};
    if (s.genre && (s.genre === "M" || s.genre === "F") && !del?.genre) maj.genre = s.genre;
    const dom = s.domicile;
    if (dom && !(del?.adresse_rue && del.adresse_code_postal && del.adresse_localite) && court(dom.rue) && /^\d{4}$/.test(dom.code_postal.trim()) && court(dom.localite)) {
      Object.assign(maj, {
        adresse_rue: court(dom.rue), adresse_numero: court(dom.numero, 20), adresse_boite: court(dom.boite, 20),
        adresse_code_postal: dom.code_postal.trim(), adresse_localite: court(dom.localite), adresse_pays: "Belgique",
      });
    }
    if (Object.keys(maj).length) {
      await o.db.from("site_delegues").update(maj).eq("id", delegueId);
      await o.db.from("site_journal_delegues").insert({
        auteur_id: null, delegue_id: delegueId, entreprise_id: del?.entreprise_id ?? null, action: "modification",
        details: { champs: Object.keys(maj), source: "presence" },
      });
    }
  }

  const { data: trajet, error: eT } = await o.db.from("site_liberation_trajets")
    .insert({ liberation_id: o.dossier.id, presence_id: presenceId, ...t.valeurs }).select("id").single();
  if (eT) console.error("[liberations] trajet :", eT.code);
  else await calculerKmTrajet(o.db, trajet.id as string).catch(() => null);

  // Premier jour : « Libération envoyée » devient « Jour J ».
  if (o.dossier.statut === "liberation_envoyee") {
    const { data: passe } = await o.db.from("site_liberations").update({ statut: "jour_j" }).eq("id", o.dossier.id).eq("statut", "liberation_envoyee").select("id");
    if (passe?.length) await o.db.from("site_liberation_historique").insert({ liberation_id: o.dossier.id, statut_avant: "liberation_envoyee", statut_apres: "jour_j", auteur_id: null });
  }
  revalidatePath(`/espace/liberations/${o.dossier.id}`);
  const tickets = modeTrajet(t.valeurs.mode)?.tickets;
  return { ok: true, donnees: { presenceId, passeTickets: tickets ? signerPasse({ dossier: o.dossier.id, date: o.dateId, participant: participantId, presence: presenceId }) : null } };
}

const TYPES_TICKET = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Photo d'un ticket de train (après la présence), réduite dans le navigateur avant l'envoi. */
export async function ajouterTicket(jeton: string, passeTickets: string, donnees: FormData): Promise<Retour> {
  const o = await ouvrir(jeton);
  if ("erreur" in o) return { ok: false, erreur: o.erreur };
  const passe = lirePasse(passeTickets);
  if (!passe?.presence || passe.dossier !== o.dossier.id) return { ok: false, erreur: "Ta session a expiré. Donne tes tickets au formateur." };
  const fichier = donnees.get("ticket");
  if (!(fichier instanceof File) || !TYPES_TICKET.includes(fichier.type) || fichier.size === 0 || fichier.size > 3_500_000) {
    return { ok: false, erreur: "Photo refusée : JPEG, PNG ou PDF, 3,5 Mo maximum." };
  }
  const { count } = await o.db.from("site_liberation_tickets").select("id", { count: "exact", head: true }).eq("presence_id", passe.presence);
  if ((count ?? 0) >= TICKETS_MAX) return { ok: false, erreur: `${TICKETS_MAX} tickets maximum.` };
  const ext = fichier.type === "application/pdf" ? "pdf" : fichier.type === "image/png" ? "png" : fichier.type === "image/webp" ? "webp" : "jpg";
  const chemin = `${o.dossier.id}/tickets/${passe.presence}-${randomUUID()}.${ext}`;
  const { error } = await o.db.storage.from(BUCKET_LIBERATIONS).upload(chemin, Buffer.from(await fichier.arrayBuffer()), { contentType: fichier.type });
  if (error) return { ok: false, erreur: ECHEC };
  const { error: e2 } = await o.db.from("site_liberation_tickets").insert({ liberation_id: o.dossier.id, presence_id: passe.presence, chemin, taille: fichier.size });
  if (e2) {
    await o.db.storage.from(BUCKET_LIBERATIONS).remove([chemin]);
    return { ok: false, erreur: ECHEC };
  }
  revalidatePath(`/espace/liberations/${o.dossier.id}`);
  return { ok: true };
}
