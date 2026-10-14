import type { StatutLiberation } from "./types";

/**
 * Parcours d'un dossier de libération : qui peut faire quoi, à quel moment. Pur (testé).
 * Lot 1 : soumettre, remettre en brouillon, prendre en charge, annuler, archiver. Lot 2 : libération envoyée. Lot 3 : jour J
 * (automatique à la première signature), passer aux frais. Lot 4 : clôturer, désarchiver.
 */

export type Qui = { admin: boolean; demandeur: boolean };

export type CodeAction =
  | "soumettre" | "remettre_brouillon" | "prendre_en_charge" | "marquer_envoyee" | "passer_aux_frais" | "cloturer"
  | "annuler" | "archiver" | "desarchiver";

export const ACTIONS: Record<CodeAction, {
  libelle: string; confirmation?: string; vers: StatutLiberation; depuis: StatutLiberation[]; adminSeulement: boolean;
}> = {
  soumettre: { libelle: "Envoyer la demande", vers: "demande", depuis: ["brouillon"], adminSeulement: false },
  remettre_brouillon: {
    libelle: "Repasser en brouillon", vers: "brouillon", depuis: ["demande"], adminSeulement: false,
    confirmation: "Repasser la demande en brouillon ? Elle ne sera plus visible comme « à traiter ».",
  },
  prendre_en_charge: { libelle: "Prendre en charge", vers: "en_traitement", depuis: ["demande"], adminSeulement: true },
  // Lot 2 : toutes les lettres et convocations envoyées ou imprimées (vérifié côté serveur).
  marquer_envoyee: {
    libelle: "Marquer la libération envoyée", vers: "liberation_envoyee", depuis: ["en_traitement"], adminSeulement: true,
    confirmation: "Employeurs et délégués sont prévenus ? Le dossier passe à « Libération envoyée ».",
  },
  // Lot 3 : la réunion est passée, on vérifie les trajets et les tickets. (« Jour J » arrive tout seul à la
  // première signature par le QR code.)
  passer_aux_frais: {
    libelle: "Passer aux frais", vers: "frais", depuis: ["liberation_envoyee", "jour_j"], adminSeulement: true,
    confirmation: "La réunion est terminée ? Le QR code ne fonctionnera plus ; vous vérifiez ensuite trajets et tickets.",
  },
  // Lot 4 : ce qui manque est listé dans la confirmation ; l'admin peut clôturer quand même (décision de Fred).
  cloturer: {
    libelle: "Clôturer le dossier", vers: "cloture", depuis: ["frais"], adminSeulement: true,
    confirmation: "Clôturer ce dossier ? Plus rien ne pourra y être modifié ; il pourra ensuite être archivé.",
  },
  annuler: {
    libelle: "Annuler le dossier", vers: "annule", adminSeulement: false,
    depuis: ["brouillon", "demande", "en_traitement", "liberation_envoyee", "jour_j", "frais"],
    confirmation: "Annuler ce dossier ? Il reste consultable, mais plus rien ne pourra y être modifié.",
  },
  archiver: {
    libelle: "Archiver", vers: "archive", depuis: ["cloture", "annule"], adminSeulement: true,
    confirmation: "Archiver ce dossier ? Il sort de la liste active et reste consultable dans les archives.",
  },
  // Lot 4 : le dossier reprend son statut d'avant l'archive (clôturé ou annulé), lu dans l'historique.
  desarchiver: {
    libelle: "Désarchiver", vers: "cloture", depuis: ["archive"], adminSeulement: true,
    confirmation: "Désarchiver ce dossier ? Il revient dans la liste active, avec son statut d'avant l'archive.",
  },
};

/** Statuts où le demandeur (sans être admin) peut encore agir sur son dossier. */
const STATUTS_DEMANDEUR: StatutLiberation[] = ["brouillon", "demande"];
/** Statuts où un admin peut encore modifier le dossier. */
const STATUTS_MODIFIABLES: StatutLiberation[] = ["brouillon", "demande", "en_traitement", "liberation_envoyee", "jour_j", "frais"];

export function peutLire(qui: Qui): boolean {
  return qui.admin || qui.demandeur;
}

/** Modifier les informations, les dates, les participants et les pièces jointes. */
export function peutModifier(statut: StatutLiberation, qui: Qui): boolean {
  if (qui.admin) return STATUTS_MODIFIABLES.includes(statut);
  return qui.demandeur && STATUTS_DEMANDEUR.includes(statut);
}

/** Supprimer définitivement : un brouillon seulement (demandeur ou admin). */
export function peutSupprimer(statut: StatutLiberation, qui: Qui): boolean {
  return statut === "brouillon" && (qui.admin || qui.demandeur);
}

export function actionPermise(code: CodeAction, statut: StatutLiberation, qui: Qui): boolean {
  const a = ACTIONS[code];
  if (!a.depuis.includes(statut)) return false;
  if (qui.admin) return true;
  if (a.adminSeulement || !qui.demandeur) return false;
  // Le demandeur n'agit plus sur un dossier pris en charge.
  return STATUTS_DEMANDEUR.includes(statut);
}

/** Actions proposées à la personne, dans l'ordre d'affichage. */
export function actionsPossibles(statut: StatutLiberation, qui: Qui): CodeAction[] {
  return (Object.keys(ACTIONS) as CodeAction[]).filter((c) => actionPermise(c, statut, qui));
}

export const estArchive = (statut: StatutLiberation) => statut === "archive";

/** Ton de la pastille de statut (toujours doublée d'une icône et d'un texte). */
export function tonStatut(statut: StatutLiberation): "ok" | "attente" | "info" | "erreur" | undefined {
  if (statut === "demande") return "attente";
  if (statut === "annule") return "erreur";
  if (statut === "cloture" || statut === "archive") return "ok";
  if (statut === "brouillon") return undefined;
  return "info";
}

/** Statuts où les courriers (lot 2) se préparent et s'envoient : du dossier pris en charge jusqu'aux frais. */
export const STATUTS_COURRIERS: StatutLiberation[] = ["en_traitement", "liberation_envoyee", "jour_j", "frais"];

/** Statuts où le QR code du jour J fonctionne (lot 3). */
export const STATUTS_QR: StatutLiberation[] = ["en_traitement", "liberation_envoyee", "jour_j"];
/** Statuts où le panneau « Jour J » s'affiche (présences, trajets, frais). */
export const STATUTS_JOUR_J: StatutLiberation[] = ["en_traitement", "liberation_envoyee", "jour_j", "frais", "cloture", "archive"];
