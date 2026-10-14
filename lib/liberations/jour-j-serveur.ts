import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseService } from "../supabase-service";
import { isoToDateFr } from "../dates";
import { BUCKET_LIBERATIONS } from "./donnees-serveur";
import { adresseLieu, lignesAdresse, tauxAuJour } from "./regles";
import { distanceVoiture } from "./google-km";
import { kmAllerRetour, libelleMode, montantKm, trajetAMesurer } from "./jour-j";
import type { StatutLiberation } from "./types";

/**
 * Jour J (lot 3) côté serveur : dossier retrouvé par le jeton du QR (page publique, données minimales), calcul des
 * kilomètres, vue des présences pour la fiche du dossier. SERVEUR UNIQUEMENT (service_role).
 */

const DUREE_LIEN = 60 * 60;

export type DossierPublic = {
  id: string; numero: number; objet: string; lieu: string | null; statut: StatutLiberation;
  dates: { id: string; jour: string }[];
  participants: { id: string; prenom: string | null; nom: string }[];
};

/** Ce que la page publique peut savoir : objet, nom du lieu, dates, noms des participants. Jamais d'adresse ni de n°. */
export async function dossierParJeton(jeton: string): Promise<DossierPublic | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const { data: d } = await db.from("site_liberations").select("id, numero, objet, lieu_nom, statut").eq("qr_jeton", jeton).maybeSingle();
  if (!d) return null;
  const [{ data: dates }, { data: parts }] = await Promise.all([
    db.from("site_liberation_dates").select("id, jour").eq("liberation_id", d.id).order("jour"),
    db.from("site_liberation_participants").select("id, prenom, nom").eq("liberation_id", d.id).order("nom"),
  ]);
  return {
    id: d.id as string, numero: d.numero as number, objet: (d.objet as string | null) ?? "", lieu: (d.lieu_nom as string | null) ?? null,
    statut: d.statut as StatutLiberation,
    dates: (dates ?? []) as { id: string; jour: string }[],
    participants: (parts ?? []) as { id: string; prenom: string | null; nom: string }[],
  };
}

type Domicile = { adresse_rue: string | null; adresse_numero: string | null; adresse_boite: string | null; adresse_code_postal: string | null; adresse_localite: string | null; adresse_pays: string | null };

export function adresseDomicile(d: Domicile | null | undefined): string | null {
  if (!d?.adresse_rue || !d.adresse_localite) return null;
  const lignes = lignesAdresse({ rue: d.adresse_rue, numero: d.adresse_numero, boite: null, code_postal: d.adresse_code_postal, localite: d.adresse_localite });
  return [...lignes, d.adresse_pays || "Belgique"].join(", ");
}

/**
 * Calcule (ou recalcule) les kilomètres d'un trajet : départ (domicile du délégué ou autre adresse) → lieu, point de
 * rendez-vous ou gare, aller-retour. Ne touche pas un trajet corrigé à la main (sauf `forcer`).
 */
export async function calculerKmTrajet(db: SupabaseClient, trajetId: string, forcer = false): Promise<{ ok: boolean; message: string }> {
  const { data: t } = await db.from("site_liberation_trajets")
    .select("id, liberation_id, presence_id, mode, depart_domicile, depart_adresse, etape_adresse, km_manuel").eq("id", trajetId).maybeSingle();
  if (!t) return { ok: false, message: "Trajet introuvable." };
  if (t.km_manuel && !forcer) return { ok: true, message: "Kilomètres corrigés à la main : inchangés." };
  const [{ data: dossier }, { data: presence }] = await Promise.all([
    db.from("site_liberations").select("lieu_complement, lieu_rue, lieu_numero, lieu_boite, lieu_code_postal, lieu_localite").eq("id", t.liberation_id).maybeSingle(),
    db.from("site_liberation_presences").select("participant_id").eq("id", t.presence_id).maybeSingle(),
  ]);
  let depart: string | null = t.depart_domicile ? null : (t.depart_adresse as string | null);
  if (t.depart_domicile && presence?.participant_id) {
    const { data: p } = await db.from("site_liberation_participants").select("delegue_id").eq("id", presence.participant_id).maybeSingle();
    if (p?.delegue_id) {
      const { data: del } = await db.from("site_delegues")
        .select("adresse_rue, adresse_numero, adresse_boite, adresse_code_postal, adresse_localite, adresse_pays").eq("id", p.delegue_id).maybeSingle();
      depart = adresseDomicile(del as Domicile | null);
    }
  }
  const lieu = dossier ? adresseLieu(dossier as Parameters<typeof adresseLieu>[0]) || null : null;
  const aMesurer = trajetAMesurer(t.mode as string, depart, lieu ? `${lieu}, Belgique` : null, t.etape_adresse as string | null);
  const maj = (champs: Record<string, unknown>) => db.from("site_liberation_trajets").update({ ...champs, km_calcule_le: new Date().toISOString() }).eq("id", trajetId);
  if (!aMesurer) {
    const sansKm = ["covoit_passager", "train"].includes(t.mode as string);
    await maj({ km: sansKm ? 0 : null, km_manuel: false, km_erreur: sansKm ? null : "Adresse de départ inconnue : complétez le domicile du délégué." });
    return { ok: sansKm, message: sansKm ? "Pas de kilomètres remboursés pour ce trajet." : "Adresse de départ inconnue." };
  }
  const r = await distanceVoiture(aMesurer.de, aMesurer.vers);
  if (!r.ok) {
    await maj({ km_erreur: r.erreur });
    return { ok: false, message: r.erreur };
  }
  await maj({ km: kmAllerRetour(r.metres), km_manuel: false, km_erreur: null });
  return { ok: true, message: `${kmAllerRetour(r.metres).toString().replace(".", ",")} km aller-retour.` };
}

// ── Vue des présences et des frais (fiche du dossier) ───────────────────────

export type VueTrajet = {
  id: string; mode: string; libelleMode: string; depart: string; etape: string | null; conducteur: string | null;
  km: number | null; kmManuel: boolean; kmErreur: string | null; taux: number | null; montantKm: number | null;
  montantTickets: number | null; ticketsVerifies: boolean; tickets: { id: string; url: string | null }[];
};
export type VuePresence = {
  id: string; participantId: string | null; nom: string; horsListe: boolean; entrepriseSaisie: string | null; aVerifier: boolean;
  signeLe: string; signatureUrl: string | null; trajet: VueTrajet | null;
};
export type VueJourJ = {
  dossierId: string;
  qr: { lien: string; creeLe: string | null } | null;
  qrActif: boolean;
  dates: { id: string; libelle: string; presences: VuePresence[]; absents: string[] }[];
  /** Totaux des frais par participant (km remboursés, montant, tickets). */
  totaux: { nom: string; km: number; montantKm: number; tickets: number }[];
  tauxManquant: boolean;
};

export async function chargerJourJ(dossierId: string, origine: string, qrActif: boolean): Promise<VueJourJ | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const [{ data: d }, { data: dates }, { data: parts }, { data: presences, error }, { data: trajets }, { data: tickets }, { data: taux }] = await Promise.all([
    db.from("site_liberations").select("id, qr_jeton, qr_cree_le").eq("id", dossierId).maybeSingle(),
    db.from("site_liberation_dates").select("id, jour, duree").eq("liberation_id", dossierId).order("jour"),
    db.from("site_liberation_participants").select("id, prenom, nom").eq("liberation_id", dossierId).order("nom"),
    db.from("site_liberation_presences").select("id, date_id, participant_id, hors_liste, prenom_saisi, nom_saisi, entreprise_saisie, a_verifier, signature_chemin, created_at").eq("liberation_id", dossierId).order("created_at"),
    db.from("site_liberation_trajets").select("id, presence_id, mode, depart_domicile, depart_adresse, etape_adresse, conducteur_nom, km, km_manuel, km_erreur, montant_tickets, tickets_verifies_le").eq("liberation_id", dossierId),
    db.from("site_liberation_tickets").select("id, presence_id, chemin").eq("liberation_id", dossierId).order("created_at"),
    db.from("site_liberations_taux_km").select("valable_du, taux"),
  ]);
  if (!d || error) {
    if (error) console.error("[liberations] jour J :", error.code);
    return null;
  }
  const chemins = [
    ...((presences ?? []) as { signature_chemin: string | null }[]).map((p) => p.signature_chemin).filter((x): x is string => Boolean(x)),
    ...((tickets ?? []) as { chemin: string }[]).map((t) => t.chemin),
  ];
  const liens = chemins.length ? (await db.storage.from(BUCKET_LIBERATIONS).createSignedUrls(chemins, DUREE_LIEN)).data ?? [] : [];
  const url = new Map(liens.map((l) => [l.path, l.signedUrl]));
  const listeTaux = ((taux ?? []) as { valable_du: string; taux: number | string }[]).map((t) => ({ valable_du: t.valable_du, taux: Number(t.taux) }));
  const nomPart = new Map(((parts ?? []) as { id: string; prenom: string | null; nom: string }[]).map((p) => [p.id, [p.prenom, p.nom].filter(Boolean).join(" ")]));
  type T = { id: string; presence_id: string; mode: string; depart_domicile: boolean; depart_adresse: string | null; etape_adresse: string | null;
    conducteur_nom: string | null; km: number | string | null; km_manuel: boolean; km_erreur: string | null; montant_tickets: number | string | null; tickets_verifies_le: string | null };
  const trajetDe = new Map(((trajets ?? []) as T[]).map((t) => [t.presence_id, t]));
  const ticketsDe = (pid: string) => ((tickets ?? []) as { id: string; presence_id: string; chemin: string }[]).filter((t) => t.presence_id === pid).map((t) => ({ id: t.id, url: url.get(t.chemin) ?? null }));
  const totaux = new Map<string, { nom: string; km: number; montantKm: number; tickets: number }>();
  let tauxManquant = false;

  const vueDates = ((dates ?? []) as { id: string; jour: string; duree: string }[]).map((x) => {
    const taux = tauxAuJour(listeTaux, x.jour)?.taux ?? null;
    const ici = ((presences ?? []) as { id: string; date_id: string; participant_id: string | null; hors_liste: boolean; prenom_saisi: string | null; nom_saisi: string | null;
      entreprise_saisie: string | null; a_verifier: boolean; signature_chemin: string | null; created_at: string }[]).filter((p) => p.date_id === x.id);
    const vues: VuePresence[] = ici.map((p) => {
      const t = trajetDe.get(p.id);
      const nom = p.participant_id ? nomPart.get(p.participant_id) ?? "" : [p.prenom_saisi, p.nom_saisi].filter(Boolean).join(" ");
      const km = t?.km === null || t?.km === undefined ? null : Number(t.km);
      const mKm = montantKm(km, taux);
      if (t && km && taux === null) tauxManquant = true;
      if (t) {
        const cle = p.participant_id ?? `hors-${p.id}`;
        const tot = totaux.get(cle) ?? { nom, km: 0, montantKm: 0, tickets: 0 };
        tot.km = Math.round((tot.km + (km ?? 0)) * 10) / 10;
        tot.montantKm = Math.round((tot.montantKm + (mKm ?? 0)) * 100) / 100;
        tot.tickets = Math.round((tot.tickets + Number(t.montant_tickets ?? 0)) * 100) / 100;
        totaux.set(cle, tot);
      }
      return {
        id: p.id, participantId: p.participant_id, nom, horsListe: p.hors_liste, entrepriseSaisie: p.entreprise_saisie, aVerifier: p.a_verifier,
        signeLe: p.created_at, signatureUrl: p.signature_chemin ? url.get(p.signature_chemin) ?? null : null,
        trajet: t ? {
          id: t.id, mode: t.mode, libelleMode: libelleMode(t.mode),
          depart: t.depart_domicile ? "Domicile" : t.depart_adresse ?? "", etape: t.etape_adresse, conducteur: t.conducteur_nom,
          km, kmManuel: t.km_manuel, kmErreur: t.km_erreur, taux, montantKm: mKm,
          montantTickets: t.montant_tickets === null ? null : Number(t.montant_tickets), ticketsVerifies: Boolean(t.tickets_verifies_le),
          tickets: ticketsDe(p.id),
        } : null,
      };
    });
    const signes = new Set(ici.map((p) => p.participant_id));
    return {
      id: x.id,
      libelle: `${isoToDateFr(x.jour)} (${x.duree === "journee" ? "journée" : x.duree === "matin" ? "matin" : "après-midi"})`,
      presences: vues,
      absents: ((parts ?? []) as { id: string }[]).filter((p) => !signes.has(p.id)).map((p) => nomPart.get(p.id) ?? ""),
    };
  });

  return {
    dossierId,
    qr: d.qr_jeton ? { lien: `${origine}/presence/${d.qr_jeton}`, creeLe: d.qr_cree_le as string | null } : null,
    qrActif,
    dates: vueDates,
    totaux: [...totaux.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    tauxManquant,
  };
}
