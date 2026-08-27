import { isoToDateFr } from "../../dates";
import { nombreEnLettresFr } from "../nombre-lettres";
import type { DateISO } from "../types";
import { TEMPLATE_COMMUN_ACCORD, TEMPLATE_NOTIFICATION_DEMISSION } from "./templates";

/** Pointillés de remplacement pour un champ non renseigné (fidèle à la mise en page des documents originaux). */
const POINTILLES = "...........................................";

type Champs = Record<string, string>;

function fusionner(template: string, champs: Champs): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_correspondance, jeton: string) => champs[jeton] ?? POINTILLES);
}

/** Coordonnées d'identité communes aux deux courriers, toutes optionnelles (design spec §3). */
export interface DonneesIdentite {
  nomTravailleur?: string;
  domicileTravailleur?: string;
  nomEmployeur?: string;
  lieuSignature?: string;
  dateSignatureIso?: DateISO;
}

export interface DonneesConventionCommunAccord extends DonneesIdentite {
  siegeEmployeur?: string;
  /** Date à laquelle le contrat rompu avait été conclu (Annexe B : "conclu entre elles le ..."). */
  dateEntreeServiceIso?: DateISO;
  /** Fonction occupée par le travailleur (Annexe B : "pour la fonction de ..."). */
  fonction?: string;
  dateFinContratIso: DateISO;
}

export function genererConventionCommunAccord(donnees: DonneesConventionCommunAccord): string {
  const champs: Champs = {
    NOM_TRAVAILLEUR: donnees.nomTravailleur ?? POINTILLES,
    DOMICILE_TRAVAILLEUR: donnees.domicileTravailleur ?? POINTILLES,
    NOM_EMPLOYEUR: donnees.nomEmployeur ?? POINTILLES,
    SIEGE_EMPLOYEUR: donnees.siegeEmployeur ?? POINTILLES,
    DATE_ENTREE_SERVICE: donnees.dateEntreeServiceIso ? isoToDateFr(donnees.dateEntreeServiceIso) : POINTILLES,
    FONCTION: donnees.fonction ?? POINTILLES,
    // Un appelant peut présenter ce courrier avant que la date ne soit
    // renseignée (ex. bascule vers "commun accord" depuis un contexte
    // démission) — repli sur les pointillés plutôt que d'afficher une date vide.
    DATE_FIN_CONTRAT: donnees.dateFinContratIso ? isoToDateFr(donnees.dateFinContratIso) : POINTILLES,
    LIEU_SIGNATURE: donnees.lieuSignature ?? POINTILLES,
    DATE_SIGNATURE: donnees.dateSignatureIso ? isoToDateFr(donnees.dateSignatureIso) : POINTILLES,
  };
  return fusionner(TEMPLATE_COMMUN_ACCORD, champs);
}

export interface DonneesNotificationDemission {
  dureeJours: number;
  dateDebutPreavisIso: DateISO;
  /** Ligne "Lieu, le Date" en tête du courrier (Annexe A) — l'adresse de l'expéditeur/destinataire est gérée par le composant PDF, pas par ce texte. */
  lieuSignature?: string;
  dateSignatureIso?: DateISO;
}

/**
 * "13 semaines" — exprimé uniquement en semaines (arrondi à la semaine la
 * plus proche), pour rester compréhensible sans connaissance du détail légal
 * en jours. Le nombre de jours exact reste la donnée de référence utilisée
 * pour tous les calculs de dates ; seul l'affichage est simplifié.
 */
export function formaterDureePreavis(jours: number): string {
  const semaines = Math.round(jours / 7);
  return semaines <= 1 ? "1 semaine" : `${semaines} semaines`;
}

/** Nombre de semaines entier le plus proche, utilisé à la fois pour l'affichage et l'écriture en toutes lettres. */
function semainesArrondies(jours: number): number {
  return Math.max(1, Math.round(jours / 7));
}

export function genererNotificationDemission(donnees: DonneesNotificationDemission): string {
  const semaines = semainesArrondies(donnees.dureeJours);
  const champs: Champs = {
    DUREE_SEMAINES: String(semaines),
    DUREE_SEMAINES_LETTRES: nombreEnLettresFr(semaines, { feminin: true }),
    DATE_DEBUT_PREAVIS: isoToDateFr(donnees.dateDebutPreavisIso),
    LIEU_SIGNATURE: donnees.lieuSignature ?? POINTILLES,
    DATE_SIGNATURE: donnees.dateSignatureIso ? isoToDateFr(donnees.dateSignatureIso) : POINTILLES,
  };
  return fusionner(TEMPLATE_NOTIFICATION_DEMISSION, champs);
}
