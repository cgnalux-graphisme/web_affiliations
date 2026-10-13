/** Fiches de suivi des permanents : types et listes fixes. Aucune dépendance : importables côté navigateur. */

export type TypeFiche = "usine" | "sectoriel";
export type StatutFiche = "brouillon" | "terminee";

export const TYPES_FICHE: { code: TypeFiche; libelle: string; description: string }[] = [
  { code: "usine", libelle: "Événement en usine", description: "Un conflit, une négociation ou une action dans une entreprise." },
  { code: "sectoriel", libelle: "Événement sectoriel", description: "Une action ou une négociation qui touche tout un secteur." },
];

export const libelleType = (t: TypeFiche) => TYPES_FICHE.find((x) => x.code === t)?.libelle ?? t;
export const libelleStatut = (s: StatutFiche) => (s === "terminee" ? "Terminée" : "Brouillon");

/** Les 7 questions du suivi : réponses courtes, aucune obligatoire. */
export const QUESTIONS = [
  { cle: "origine", libelle: "Origine", question: "D'où vient le conflit ou la démarche ?", aide: "Le déclencheur : annonce de la direction, revendication, incident…" },
  { cle: "duree", libelle: "Durée de l'action", question: "Combien de temps a-t-elle duré ?", aide: "Exemple : 3 jours de grève, 6 semaines de négociation." },
  { cle: "echanges_direction", libelle: "Échanges avec la direction", question: "Quelles réunions, quels échanges avec la direction ?", aide: "Dates, instances (CE, CPPT, conciliation…), positions de chacun." },
  { cle: "courriers", libelle: "Courriers envoyés", question: "Quels courriers avez-vous envoyés ?", aide: "Préavis, mises en demeure, courriers à l'inspection…" },
  { cle: "evenements", libelle: "Événements particuliers", question: "Y a-t-il eu des événements particuliers ?", aide: "Piquet, huissier, médias, front commun, intervention politique…" },
  { cle: "resolution", libelle: "Résolution", question: "Comment la situation s'est-elle résolue ?", aide: "Accord, protocole, conciliation, abandon…" },
  { cle: "resultat", libelle: "Résultat", question: "Quel résultat pour les travailleurs ?", aide: "Ce qui a été obtenu, ou ce qui reste à faire." },
] as const;
export type CleQuestion = (typeof QUESTIONS)[number]["cle"];

export const NATURES = [
  { code: "courrier_envoye", libelle: "Courrier envoyé" },
  { code: "courrier_recu", libelle: "Courrier reçu" },
  { code: "pv", libelle: "PV de réunion" },
  { code: "preavis", libelle: "Préavis de grève" },
  { code: "accord", libelle: "Accord / CCT" },
  { code: "tract", libelle: "Tract" },
  { code: "presse", libelle: "Article de presse" },
  { code: "autre", libelle: "Autre" },
] as const;
export type Nature = (typeof NATURES)[number]["code"];

export function libelleNature(nature: string | null, autre?: string | null): string {
  if (nature === "autre") return autre?.trim() || "Autre";
  return NATURES.find((n) => n.code === nature)?.libelle ?? "Document";
}

export type FicheSuivi = {
  id: string; type: TypeFiche; titre: string | null; date_debut: string | null; date_fin: string | null;
  entreprise_id: string | null; site_id: string | null; secteur_id: string | null;
  origine: string | null; duree: string | null; echanges_direction: string | null; courriers: string | null;
  evenements: string | null; resolution: string | null; resultat: string | null;
  texte: string | null; texte_genere_le: string | null; statut: StatutFiche; auteur_id: string;
  created_at: string; updated_at: string;
};

export type FichierFiche = {
  id: string; fiche_id: string; genre: "document" | "photo"; chemin: string; nom_origine: string; taille: number | null;
  type_mime: string | null; nature: Nature | null; nature_autre: string | null; legende: string | null; ordre: number; created_at: string;
};

export const COLONNES_FICHE =
  "id, type, titre, date_debut, date_fin, entreprise_id, site_id, secteur_id, origine, duree, echanges_direction, courriers, evenements, resolution, resultat, texte, texte_genere_le, statut, auteur_id, created_at, updated_at";
export const COLONNES_FICHIER = "id, fiche_id, genre, chemin, nom_origine, taille, type_mime, nature, nature_autre, legende, ordre, created_at";

/** Fiche prête à afficher (noms résolus, liens signés des fichiers). */
export type FicheAffichee = FicheSuivi & {
  entreprise: string | null; entrepriseCle: string | null; site: string | null; secteur: string | null; auteur: string | null;
  documents: (FichierFiche & { url: string | null })[];
  photos: (FichierFiche & { url: string | null })[];
};

/** Ligne d'une liste de fiches. */
export type LigneFiche = {
  id: string; type: TypeFiche; titre: string | null; date_debut: string | null; date_fin: string | null; statut: StatutFiche;
  entreprise: string | null; entrepriseId: string | null; secteur: string | null; secteurId: string | null;
  auteur: string | null; auteurId: string; modifiable: boolean; updated_at: string;
};

export const DOCUMENTS_MAX = 20;
export const PHOTOS_MAX = 12;
/** Taille maximale d'un document (le bucket refuse au-delà de 25 Mo). */
export const DOCUMENT_TAILLE_MAX = 25 * 1024 * 1024;
export const TYPES_DOCUMENT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "image/jpeg",
  "image/png",
  "text/plain",
];
export const MESSAGE_DOCUMENT_REFUSE = "PDF, Word, Excel, OpenDocument, image JPEG / PNG ou texte, 25 Mo maximum";
