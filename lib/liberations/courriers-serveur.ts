import { getSupabaseService } from "../supabase-service";
import { isoToDateFr } from "../dates";
import { formaterIban } from "../iban";
import { formaterNiss } from "../modification";
import { lignesAdresse } from "./regles";
import {
  donneesCourrier, textesModeles, type CodeModele, type ContexteCourrier, type DonneesCourrierPdf, type GenreCourrier,
} from "./courriers";
import { chargerDossier, type ContexteLiberations, type DossierAffiche, type DroitsDossier, type ParticipantAffiche } from "./donnees-serveur";
import type { DonneesAttestationPerte } from "./pdf/AttestationPertePdf";
import type { DonneesFichePaiement } from "./pdf/FichePaiementPdf";
import type { Montants } from "./montants";

/**
 * Préparation des courriers d'un dossier (lot 2) : textes (modifiés ou proposés), signataire (le permanent
 * demandeur et sa fonction), correspondant (l'admin qui traite le dossier), destinataires, état des envois et
 * montants. SERVEUR UNIQUEMENT (service_role), après vérification du droit.
 */

export type StatutCourrier = "a_envoyer" | "envoye" | "imprime" | "echec";
export type LigneCourrier = {
  id: string; participant_id: string; genre: GenreCourrier; corps: string | null; statut: StatutCourrier; mode: "email" | "impression" | null;
  destinataire: string | null; erreur: string | null; envoye_le: string | null;
};
export type LigneMontant = Partial<Montants> & { participant_id: string; date_id: string };

export type Personne = { id: string; nom: string; email: string | null; fonction: string | null; telephone: string | null };

export type PreparationCourriers = {
  dossier: DossierAffiche;
  droits: DroitsDossier;
  textes: Record<CodeModele, { objet: string; texte: string; modifie: boolean }>;
  signataire: Personne;
  correspondant: Personne | null;
  courriers: LigneCourrier[];
  montants: LigneMontant[];
};

const nomPropre = (p: { name: string | null; email: string | null }) => (p.name ?? p.email ?? "").replace(/\s*\((Permanent|OP)\)\s*$/i, "");

export async function textesActuels() {
  const db = getSupabaseService();
  if (!db) return textesModeles([]);
  const { data, error } = await db.from("site_liberations_modeles").select("code, objet, texte");
  if (error) console.error("[liberations] modèles :", error.code);
  return textesModeles((data ?? []) as { code: string; objet: string | null; texte: string }[]);
}

/** Nom, e-mail, fonction et téléphone de membres de l'équipe. */
export async function personnes(ids: (string | null)[]): Promise<Map<string, Personne>> {
  const db = getSupabaseService();
  const uniques = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!db || !uniques.length) return new Map();
  const [{ data: profils }, { data: equipe }] = await Promise.all([
    db.from("profiles").select("id, name, email").in("id", uniques),
    db.from("site_equipe_profils").select("user_id, fonction, telephone").in("user_id", uniques),
  ]);
  const extra = new Map(((equipe ?? []) as { user_id: string; fonction: string | null; telephone: string | null }[]).map((e) => [e.user_id, e]));
  return new Map(((profils ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [p.id, {
    id: p.id, nom: nomPropre(p), email: p.email, fonction: extra.get(p.id)?.fonction ?? null, telephone: extra.get(p.id)?.telephone ?? null,
  }]));
}

export async function preparerCourriers(id: string, c: ContexteLiberations): Promise<PreparationCourriers | null> {
  const db = getSupabaseService();
  const lu = await chargerDossier(id, c);
  if (!db || !lu) return null;
  const d = lu.dossier;
  const [textes, gens, { data: courriers }, { data: montants }] = await Promise.all([
    textesActuels(),
    personnes([d.demandeur_id, d.traite_par]),
    db.from("site_liberation_courriers").select("id, participant_id, genre, corps, statut, mode, destinataire, erreur, envoye_le").eq("liberation_id", id),
    db.from("site_liberation_montants").select("participant_id, date_id, salaire_brut, deplacements, indemnites, petits_frais, cheques_repas").eq("liberation_id", id),
  ]);
  const signataire = gens.get(d.demandeur_id) ?? { id: d.demandeur_id, nom: d.demandeur, email: null, fonction: null, telephone: null };
  return {
    dossier: d,
    droits: lu.droits,
    textes,
    signataire,
    correspondant: d.traite_par ? gens.get(d.traite_par) ?? null : null,
    courriers: (courriers ?? []) as LigneCourrier[],
    montants: ((montants ?? []) as (LigneMontant & Record<string, unknown>)[]).map((m) => ({
      ...m,
      salaire_brut: num(m.salaire_brut), deplacements: num(m.deplacements), indemnites: num(m.indemnites),
      petits_frais: num(m.petits_frais), cheques_repas: num(m.cheques_repas),
    })),
  };
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function aujourdhuiBruxelles(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
}

export function contexteCourrier(prep: PreparationCourriers, p: ParticipantAffiche): ContexteCourrier {
  const d = prep.dossier;
  return {
    dossier: d,
    dates: d.dates,
    participant: { prenom: p.prenom, nom: p.nom, genre: p.fiche?.genre ?? null },
    employeur: p.employeurNom,
    signataire: { nom: prep.signataire.nom, fonction: prep.signataire.fonction },
    correspondant: prep.correspondant ? { nom: prep.correspondant.nom, telephone: prep.correspondant.telephone, email: prep.correspondant.email } : null,
    textes: prep.textes,
  };
}

export function domicile(p: ParticipantAffiche): string[] {
  const f = p.fiche;
  if (!f) return [];
  const pays = f.adresse_pays && !/^belgique$/i.test(f.adresse_pays) ? f.adresse_pays : null;
  return [...lignesAdresse({ rue: f.adresse_rue, numero: f.adresse_numero, boite: f.adresse_boite, code_postal: f.adresse_code_postal, localite: f.adresse_localite }),
    ...(pays ? [pays] : [])];
}

export const nomParticipant = (p: ParticipantAffiche) => [p.prenom, p.nom].filter(Boolean).join(" ");

export function courrierDe(prep: PreparationCourriers, participantId: string, genre: GenreCourrier): LigneCourrier | undefined {
  return prep.courriers.find((x) => x.participant_id === participantId && x.genre === genre);
}

/** Courrier d'un participant prêt à dessiner (texte retouché s'il existe). */
export function documentCourrier(prep: PreparationCourriers, p: ParticipantAffiche, genre: GenreCourrier): DonneesCourrierPdf {
  const destinataire = genre === "lettre_employeur" ? p.employeurAdresse : [nomParticipant(p), ...domicile(p)];
  return donneesCourrier(genre, prep.dossier.type, contexteCourrier(prep, p), destinataire, aujourdhuiBruxelles(), courrierDe(prep, p.id, genre)?.corps);
}

export function documentAttestationPerte(prep: PreparationCourriers, p: ParticipantAffiche): DonneesAttestationPerte {
  const d = prep.dossier;
  return {
    reunion: d.objet ?? "",
    codePaiement: d.introduire_cg_federale === false ? d.regime_paiement : null,
    employeur: { nom: p.employeurNom ?? p.entreprise, adresse: p.employeurAdresseSeule, numero: p.employeurNumero },
    travailleur: { nom: nomParticipant(p), domicile: domicile(p) },
    dates: d.dates.map((x) => `${isoToDateFr(x.jour)} (${x.duree === "journee" ? "journée" : x.duree === "matin" ? "matin" : "après-midi"})`),
  };
}

export function documentFichePaiement(prep: PreparationCourriers, p: ParticipantAffiche): DonneesFichePaiement {
  const d = prep.dossier;
  return {
    conseil: d.conseil,
    participant: {
      nom: nomParticipant(p),
      registreNational: p.fiche?.registre_national ? formaterNiss(p.fiche.registre_national) : null,
      adresse: domicile(p),
      iban: p.fiche?.iban ? formaterIban(p.fiche.iban) : null,
    },
    entreprise: { numero: p.employeurNumero, nom: p.employeurNom ?? p.entreprise, cp: d.commission || null },
    lignes: d.dates.map((x) => ({
      date: isoToDateFr(x.jour),
      montants: prep.montants.find((m) => m.participant_id === p.id && m.date_id === x.id) ?? {},
    })),
    remarques: p.remarques_paiement,
  };
}

/** Courriers d'un dossier encore à faire avant « Libération envoyée » (lettres et convocations). */
export function courriersEnAttente(prep: PreparationCourriers): number {
  const faits = (pid: string, g: GenreCourrier) => ["envoye", "imprime"].includes(courrierDe(prep, pid, g)?.statut ?? "");
  return prep.dossier.participants.reduce((n, p) => n + (faits(p.id, "lettre_employeur") ? 0 : 1) + (faits(p.id, "convocation") ? 0 : 1), 0);
}

// ── Vue des courriers pour l'écran du dossier (données sérialisables) ───────

export type VueCourrier = {
  genre: GenreCourrier; statut: StatutCourrier; mode: "email" | "impression" | null; destinataire: string | null;
  envoye_le: string | null; erreur: string | null;
  /** Texte actuel (retouché, sinon celui du modèle) ; retouche = texte propre à ce participant. */
  texte: string; retouche: boolean;
  /** Adresse à laquelle « Envoyer » expédierait (null : impression seulement). */
  email: string | null;
};

export type VueParticipantCourriers = {
  id: string; nom: string; entreprise: string;
  courriers: Record<GenreCourrier, VueCourrier>;
  paiement: { recue: boolean; remarques: string; iban: boolean; montants: Record<string, Partial<Montants>> } | null;
};

export type VueCourriers = {
  dossierId: string;
  cgFederale: boolean;
  conseil: string;
  dates: { id: string; libelle: string }[];
  participants: VueParticipantCourriers[];
  /** Ce qui manque à la signature et au correspondant (Paramètres › Équipe). */
  alertes: string[];
  enAttente: number;
};

const GENRES: GenreCourrier[] = ["lettre_employeur", "convocation", "attestation_presence"];

export function vueCourriers(prep: PreparationCourriers): VueCourriers {
  const d = prep.dossier;
  const cg = d.perte_salaire === true && d.perte_salaire_charge === "cg_federale";
  const alertes: string[] = [];
  if (!prep.signataire.fonction) alertes.push(`La fonction de ${prep.signataire.nom || "la personne qui a fait la demande"} n'est pas renseignée : la signature n'aura que son nom (Paramètres › Équipe).`);
  if (!prep.correspondant) alertes.push("Aucun correspondant : le dossier n'a pas été pris en charge.");
  else if (!prep.correspondant.telephone) alertes.push(`Le téléphone de ${prep.correspondant.nom} n'est pas renseigné : il manquera dans « Votre correspondant » (Paramètres › Équipe).`);
  return {
    dossierId: d.id,
    cgFederale: cg,
    conseil: d.conseil ?? "",
    dates: d.dates.map((x) => ({ id: x.id, libelle: `${isoToDateFr(x.jour)} (${x.duree === "journee" ? "journée" : x.duree === "matin" ? "matin" : "après-midi"})` })),
    alertes,
    enAttente: courriersEnAttente(prep),
    participants: d.participants.map((p) => ({
      id: p.id,
      nom: nomParticipant(p),
      entreprise: p.employeurNom ?? p.entreprise,
      courriers: Object.fromEntries(GENRES.map((g) => {
        const ligne = courrierDe(prep, p.id, g);
        return [g, {
          genre: g, statut: ligne?.statut ?? "a_envoyer", mode: ligne?.mode ?? null, destinataire: ligne?.destinataire ?? null,
          envoye_le: ligne?.envoye_le ?? null, erreur: ligne?.erreur ?? null,
          texte: documentCourrier(prep, p, g).corps, retouche: Boolean(ligne?.corps),
          email: g === "lettre_employeur" ? p.employeurEmail : g === "convocation" ? p.fiche?.email ?? null : null,
        }];
      })) as Record<GenreCourrier, VueCourrier>,
      paiement: cg ? {
        recue: Boolean(p.attestation_recue_le),
        remarques: p.remarques_paiement ?? "",
        iban: Boolean(p.fiche?.iban),
        montants: Object.fromEntries(prep.montants.filter((m) => m.participant_id === p.id).map((m) => [m.date_id, m])),
      } : null,
    })),
  };
}

/** L'équipe (Paramètres › Équipe) : fonction pour la signature, téléphone pour « Votre correspondant ». */
export async function equipe(): Promise<{ id: string; nom: string; email: string; role: string; fonction: string; telephone: string }[] | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const [{ data: profils, error }, { data: extra }] = await Promise.all([
    db.from("profiles").select("id, name, email, role").in("role", ["SUPER_ADMIN", "ADMIN_OP", "PERMANENT"]).order("name"),
    db.from("site_equipe_profils").select("user_id, fonction, telephone"),
  ]);
  if (error) return null;
  const parId = new Map(((extra ?? []) as { user_id: string; fonction: string | null; telephone: string | null }[]).map((e) => [e.user_id, e]));
  return ((profils ?? []) as { id: string; name: string | null; email: string | null; role: string }[]).map((p) => ({
    id: p.id, nom: nomPropre(p), email: p.email ?? "", role: p.role,
    fonction: parId.get(p.id)?.fonction ?? "", telephone: parId.get(p.id)?.telephone ?? "",
  }));
}
