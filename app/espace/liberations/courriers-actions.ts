"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseService } from "../../../lib/supabase-service";
import { getResendClient, sendIsolatedEmail } from "../../../lib/resend-mail";
import { formaterTelephone } from "../../../lib/telephone";
import { ROLES_EQUIPE } from "../../../lib/espace/roles";
import { contexteLiberations, type ContexteLiberations } from "../../../lib/liberations/donnees-serveur";
import {
  contexteCourrier, documentAttestationPerte, documentCourrier, nomParticipant, preparerCourriers, type PreparationCourriers,
} from "../../../lib/liberations/courriers-serveur";
import {
  MODELES, emailCourrier, modeleParCode, nomFichierCourrier, texteEnHtml, variablesInconnues, type GenreCourrier,
} from "../../../lib/liberations/courriers";
import { validerMontants } from "../../../lib/liberations/montants";
import { pdfAttestationPerte, pdfCourrier } from "../../../lib/liberations/pdf/rendu";
import type { ParticipantAffiche } from "../../../lib/liberations/donnees-serveur";
import { STATUTS_COURRIERS } from "../../../lib/liberations/statuts";

/**
 * Courriers des libérations (lot 2) : réservé aux admins (ADMIN_OP, SUPER_ADMIN). Droit revérifié à chaque action,
 * écriture en service_role. Les PDF sont fabriqués ici, sur le serveur, à partir des données relues en base (jamais
 * à partir de ce qu'envoie le navigateur).
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };

const REFUS = "Réservé aux admins (ADMIN_OP, SUPER_ADMIN). Reconnectez-vous si besoin.";
const ECHEC = "Enregistrement impossible. Rechargez la page puis réessayez.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENRES: GenreCourrier[] = ["lettre_employeur", "convocation", "attestation_presence"];

type Ctx = ContexteLiberations & { db: SupabaseClient };

async function ctxAdmin(): Promise<Ctx | null> {
  const c = await contexteLiberations();
  const db = getSupabaseService();
  return c?.admin && db ? { ...c, db } : null;
}

/** Le participant et la préparation de son dossier, si le dossier en est à l'étape des courriers. */
async function participant(c: Ctx, participantId: string): Promise<{ prep: PreparationCourriers; p: ParticipantAffiche } | { erreur: string }> {
  if (!UUID.test(participantId)) return { erreur: ECHEC };
  const { data } = await c.db.from("site_liberation_participants").select("liberation_id").eq("id", participantId).maybeSingle();
  if (!data) return { erreur: "Participant introuvable. Rechargez la page." };
  const prep = await preparerCourriers(data.liberation_id as string, c);
  const p = prep?.dossier.participants.find((x) => x.id === participantId);
  if (!prep || !p) return { erreur: "Participant introuvable. Rechargez la page." };
  if (!STATUTS_COURRIERS.includes(prep.dossier.statut)) return { erreur: "Les courriers se préparent une fois le dossier pris en charge." };
  return { prep, p };
}

function rafraichir(id: string) {
  revalidatePath(`/espace/liberations/${id}`);
  revalidatePath("/espace/liberations/dossiers");
}

async function noter(c: Ctx, prep: PreparationCourriers, participantId: string, genre: GenreCourrier, champs: Record<string, unknown>) {
  const { error } = await c.db.from("site_liberation_courriers").upsert(
    { liberation_id: prep.dossier.id, participant_id: participantId, genre, ...champs },
    { onConflict: "participant_id,genre" }
  );
  if (error) console.error("[liberations] courrier :", error.code);
  return !error;
}

const cgFederale = (prep: PreparationCourriers) => prep.dossier.perte_salaire === true && prep.dossier.perte_salaire_charge === "cg_federale";

/** Destinataire de l'e-mail : l'employeur (lettre) ou le délégué (convocation). */
async function destinataireEmail(p: ParticipantAffiche, genre: "lettre_employeur" | "convocation"): Promise<string | null> {
  return (genre === "lettre_employeur" ? p.employeurEmail : p.fiche?.email) ?? null;
}

/** Envoie un courrier par e-mail, PDF joint (et l'attestation de perte de salaire avec la lettre si la CG fédérale paie). */
async function envoyer(c: Ctx, prep: PreparationCourriers, p: ParticipantAffiche, genre: "lettre_employeur" | "convocation"): Promise<Resultat> {
  const dest = await destinataireEmail(p, genre);
  if (!dest) return { ok: false, erreur: genre === "lettre_employeur" ? "L'employeur n'a pas d'e-mail : complétez-le dans l'app Entreprises, ou imprimez la lettre." : "Le délégué n'a pas d'e-mail : imprimez la convocation." };
  const nom = nomParticipant(p);
  let pieces: { filename: string; content: Buffer }[];
  try {
    pieces = [{ filename: nomFichierCourrier(genre, nom), content: await pdfCourrier(documentCourrier(prep, p, genre)) }];
    if (genre === "lettre_employeur" && cgFederale(prep)) {
      pieces.push({ filename: nomFichierCourrier("attestation_perte_salaire", nom), content: await pdfAttestationPerte(documentAttestationPerte(prep, p)) });
    }
  } catch (err) {
    console.error("[liberations] PDF :", err instanceof Error ? err.message : "erreur");
    return { ok: false, erreur: "Le PDF n'a pas pu être fabriqué. Réessayez, ou signalez-le si cela se répète." };
  }
  const mail = emailCourrier(genre, contexteCourrier(prep, p));
  let erreur: string | null = null;
  let resendId: string | null = null;
  try {
    const r = await sendIsolatedEmail(getResendClient(), {
      recipients: [dest], subject: mail.objet, html: texteEnHtml(mail.texte), attachments: pieces, replyTo: prep.correspondant?.email ?? undefined,
    });
    resendId = r.envois[0]?.id ?? null;
    erreur = r.envois[0]?.erreur ?? (r.error ? "Échec de l'envoi" : null);
  } catch (err) {
    erreur = err instanceof Error ? err.message : "Échec de l'envoi";
  }
  await noter(c, prep, p.id, genre, {
    statut: erreur ? "echec" : "envoye", mode: "email", destinataire: dest, resend_id: resendId, erreur,
    envoye_le: new Date().toISOString(), envoye_par: c.user.id,
  });
  if (erreur) return { ok: false, erreur: `L'e-mail à ${dest} n'est pas parti (${erreur}). Réessayez plus tard, ou imprimez le courrier.` };
  return { ok: true, message: `Envoyé à ${dest}.` };
}

export async function envoyerCourrier(participantId: string, genre: "lettre_employeur" | "convocation"): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  if (genre !== "lettre_employeur" && genre !== "convocation") return { ok: false, erreur: ECHEC };
  const x = await participant(c, participantId);
  if ("erreur" in x) return { ok: false, erreur: x.erreur };
  const r = await envoyer(c, x.prep, x.p, genre);
  rafraichir(x.prep.dossier.id);
  return r;
}

/** Envoie tous les courriers d'un genre pas encore envoyés, à ceux qui ont un e-mail (un à la fois). */
export async function envoyerTous(dossierId: string, genre: "lettre_employeur" | "convocation"): Promise<Resultat<{ envoyes: number; sansEmail: number; echecs: string[] }>> {
  const c = await ctxAdmin();
  if (!c || !UUID.test(dossierId)) return { ok: false, erreur: REFUS };
  const prep = await preparerCourriers(dossierId, c);
  if (!prep) return { ok: false, erreur: "Dossier introuvable." };
  if (!STATUTS_COURRIERS.includes(prep.dossier.statut)) return { ok: false, erreur: "Les courriers se préparent une fois le dossier pris en charge." };
  let envoyes = 0;
  let sansEmail = 0;
  const echecs: string[] = [];
  for (const p of prep.dossier.participants) {
    const deja = prep.courriers.find((x) => x.participant_id === p.id && x.genre === genre);
    if (deja && (deja.statut === "envoye" || deja.statut === "imprime")) continue;
    if (!(await destinataireEmail(p, genre))) {
      sansEmail++;
      continue;
    }
    const r = await envoyer(c, prep, p, genre);
    if (r.ok) envoyes++;
    else echecs.push(nomParticipant(p));
  }
  rafraichir(dossierId);
  const quoi = genre === "lettre_employeur" ? "lettre" : "convocation";
  const message = [
    `${envoyes} ${quoi}${envoyes > 1 ? "s envoyées" : " envoyée"}.`,
    sansEmail ? `${sansEmail} sans e-mail : à imprimer.` : "",
    echecs.length ? `Échec pour ${echecs.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
  return { ok: true, donnees: { envoyes, sansEmail, echecs }, message };
}

/** Courrier imprimé (et remis ou posté) : noté comme fait. `imprime = false` revient à « à envoyer ». */
export async function marquerImprime(participantId: string, genre: GenreCourrier, imprime: boolean): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  if (!GENRES.includes(genre)) return { ok: false, erreur: ECHEC };
  const x = await participant(c, participantId);
  if ("erreur" in x) return { ok: false, erreur: x.erreur };
  const ok = await noter(c, x.prep, participantId, genre, imprime
    ? { statut: "imprime", mode: "impression", envoye_le: new Date().toISOString(), envoye_par: c.user.id, erreur: null }
    : { statut: "a_envoyer", mode: null, envoye_le: null, envoye_par: null, erreur: null, destinataire: null, resend_id: null });
  rafraichir(x.prep.dossier.id);
  return ok ? { ok: true } : { ok: false, erreur: ECHEC };
}

/** Texte retouché pour ce participant (null ou vide = revenir au texte du modèle). */
export async function enregistrerTexte(participantId: string, genre: GenreCourrier, corps: string | null): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  if (!GENRES.includes(genre)) return { ok: false, erreur: ECHEC };
  const x = await participant(c, participantId);
  if ("erreur" in x) return { ok: false, erreur: x.erreur };
  const texte = (corps ?? "").replace(/\r\n/g, "\n").trim().slice(0, 10000) || null;
  const ok = await noter(c, x.prep, participantId, genre, { corps: texte });
  rafraichir(x.prep.dossier.id);
  return ok ? { ok: true, message: texte ? "Texte retouché enregistré." : "Le courrier reprend le texte du modèle." } : { ok: false, erreur: ECHEC };
}

/** Attestation reçue, montants par date et remarques (fiche de paiement). */
export async function enregistrerPaiement(
  participantId: string,
  saisie: { attestationRecue: boolean; remarques: string; lignes: Record<string, Record<string, string>> }
): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  const x = await participant(c, participantId);
  if ("erreur" in x) return { ok: false, erreur: x.erreur };
  const dates = new Set(x.prep.dossier.dates.map((d) => d.id));
  const lignes = [];
  for (const [dateId, champs] of Object.entries(saisie.lignes)) {
    if (!dates.has(dateId)) return { ok: false, erreur: "Une date n'existe plus. Rechargez la page." };
    const v = validerMontants(champs);
    if (!v.ok) return v;
    lignes.push({ liberation_id: x.prep.dossier.id, participant_id: participantId, date_id: dateId, ...v.valeurs, updated_at: new Date().toISOString() });
  }
  if (lignes.length) {
    const { error } = await c.db.from("site_liberation_montants").upsert(lignes, { onConflict: "participant_id,date_id" });
    if (error) return { ok: false, erreur: ECHEC };
  }
  const recue = saisie.attestationRecue ? x.p.attestation_recue_le ?? new Date().toISOString() : null;
  const { error } = await c.db.from("site_liberation_participants")
    .update({ attestation_recue_le: recue, remarques_paiement: saisie.remarques.trim().slice(0, 1000) || null }).eq("id", participantId);
  if (error) return { ok: false, erreur: ECHEC };
  rafraichir(x.prep.dossier.id);
  return { ok: true, message: "Paiement enregistré." };
}

// ── Paramètres : modèles et équipe ──────────────────────────────────────────

export async function enregistrerModele(code: string, objet: string, texte: string): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  const m = modeleParCode(code);
  if (!m) return { ok: false, erreur: "Modèle inconnu." };
  const t = texte.replace(/\r\n/g, "\n").trim().slice(0, 10000);
  const o = m.email ? objet.trim().slice(0, 200) : null;
  if (!t) return { ok: false, erreur: "Le texte ne peut pas être vide. Pour revenir au texte proposé, utilisez « Rétablir »." };
  if (m.email && !o) return { ok: false, erreur: "Indiquez l'objet de l'e-mail." };
  const inconnues = variablesInconnues(`${t} ${o ?? ""}`);
  if (inconnues.length) return { ok: false, erreur: `Variable inconnue : ${inconnues.map((v) => `{{${v}}}`).join(", ")}. Choisissez dans la liste des variables.` };
  const { error } = await c.db.from("site_liberations_modeles").upsert({ code, objet: o, texte: t, auteur_id: c.user.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, erreur: error.code === "42P01" || error.code === "PGRST205" ? "Les tables du lot 2 ne sont pas encore créées (migration 20261014090000)." : ECHEC };
  revalidatePath("/espace/liberations/parametres/modeles");
  return { ok: true, message: "Texte enregistré." };
}

export async function retablirModele(code: string): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  if (!MODELES.some((m) => m.code === code)) return { ok: false, erreur: "Modèle inconnu." };
  const { error } = await c.db.from("site_liberations_modeles").delete().eq("code", code);
  if (error) return { ok: false, erreur: ECHEC };
  revalidatePath("/espace/liberations/parametres/modeles");
  return { ok: true, message: "Texte proposé rétabli." };
}

/** Fonction (signature des courriers) et téléphone (correspondant) d'un membre de l'équipe. */
export async function enregistrerProfilEquipe(userId: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c || !UUID.test(userId)) return { ok: false, erreur: REFUS };
  const { data: p } = await c.db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!p || !(ROLES_EQUIPE as readonly string[]).includes(p.role as string)) return { ok: false, erreur: "Ce compte ne fait pas partie de l'équipe." };
  const fonction = (champs.fonction ?? "").trim().slice(0, 120) || null;
  const telephone = (champs.telephone ?? "").trim() ? formaterTelephone(champs.telephone) : null;
  const { error } = await c.db.from("site_equipe_profils").upsert({ user_id: userId, fonction, telephone, updated_at: new Date().toISOString() });
  if (error) return { ok: false, erreur: ECHEC };
  revalidatePath("/espace/liberations/parametres");
  return { ok: true, message: "Enregistré." };
}
