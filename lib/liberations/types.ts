/** App « Libérations » : types et listes fixes. Aucune dépendance : importables côté navigateur. */

export const TYPES_LIBERATION = [
  { code: "conge_education", libelle: "Congé-éducation", description: "Congé-éducation payé pour une formation reconnue." },
  { code: "mission_syndicale", libelle: "Mission syndicale extérieure", description: "Réunion ou mission syndicale en dehors de l'entreprise." },
  { code: "credit_heures", libelle: "Crédit d'heures syndicales", description: "Heures prises sur le crédit d'heures de la délégation." },
  { code: "formation_syndicale", libelle: "Heures de formation syndicale", description: "Formation syndicale prévue par la convention collective." },
] as const;
export type TypeLiberation = (typeof TYPES_LIBERATION)[number]["code"];

export const STATUTS = [
  { code: "brouillon", libelle: "Brouillon" },
  { code: "demande", libelle: "Demande" },
  { code: "en_traitement", libelle: "En traitement" },
  { code: "liberation_envoyee", libelle: "Libération envoyée" },
  { code: "jour_j", libelle: "Jour J" },
  { code: "frais", libelle: "Frais" },
  { code: "cloture", libelle: "Clôturé" },
  { code: "annule", libelle: "Annulé" },
  { code: "archive", libelle: "Archivé" },
] as const;
export type StatutLiberation = (typeof STATUTS)[number]["code"];

export const DUREES = [
  { code: "journee", libelle: "Journée entière" },
  { code: "matin", libelle: "Demi-journée (matin)" },
  { code: "apres_midi", libelle: "Demi-journée (après-midi)" },
] as const;
export type Duree = (typeof DUREES)[number]["code"];

export const CHARGES = [
  { code: "employeur", libelle: "L'employeur" },
  { code: "cg_federale", libelle: "La CG fédérale" },
] as const;
export type Charge = (typeof CHARGES)[number]["code"];

/** N° de régime de paiement proposé quand la dépense n'est pas introduite à la CG fédérale. */
export const REGIME_PAIEMENT_DEFAUT = "63.000.35.26.001";

export const libelleType = (t: string) => TYPES_LIBERATION.find((x) => x.code === t)?.libelle ?? t;
export const libelleStatut = (s: string) => STATUTS.find((x) => x.code === s)?.libelle ?? s;
export const libelleDuree = (d: string) => DUREES.find((x) => x.code === d)?.libelle ?? d;
export const libelleCharge = (c: string | null) => CHARGES.find((x) => x.code === c)?.libelle ?? "";

export type Dossier = {
  id: string; numero: number; type: TypeLiberation; objet: string | null;
  lieu_id: string | null; lieu_autre: boolean; lieu_nom: string | null; lieu_complement: string | null; lieu_rue: string | null;
  lieu_numero: string | null; lieu_boite: string | null; lieu_code_postal: string | null; lieu_localite: string | null;
  salle: string | null; ordre_du_jour: string | null;
  perte_salaire: boolean | null; perte_salaire_charge: Charge | null; introduire_cg_federale: boolean | null;
  regime_paiement: string | null; lunch: boolean | null;
  secteur_id: string | null; commission_paritaire: string | null; entreprise_specifique: boolean; entreprise_id: string | null;
  statut: StatutLiberation; demandeur_id: string; traite_par: string | null;
  soumis_le: string | null; archive_le: string | null; created_at: string; updated_at: string;
};

export const COLONNES_DOSSIER =
  "id, numero, type, objet, lieu_id, lieu_autre, lieu_nom, lieu_complement, lieu_rue, lieu_numero, lieu_boite, lieu_code_postal, lieu_localite, salle, ordre_du_jour, perte_salaire, perte_salaire_charge, introduire_cg_federale, regime_paiement, lunch, secteur_id, commission_paritaire, entreprise_specifique, entreprise_id, statut, demandeur_id, traite_par, soumis_le, archive_le, created_at, updated_at";

export type DateDossier = { id?: string; jour: string; duree: Duree; heure_debut: string | null };
export const COLONNES_DATE = "id, liberation_id, jour, duree, heure_debut";

export type Participant = {
  id: string; liberation_id: string; delegue_id: string | null; prenom: string | null; nom: string; entreprise_id: string | null; created_at: string;
};
export const COLONNES_PARTICIPANT = "id, liberation_id, delegue_id, prenom, nom, entreprise_id, created_at";

export type FichierDossier = {
  id: string; liberation_id: string; chemin: string; nom_origine: string; taille: number | null; type_mime: string | null; created_at: string;
};
export const COLONNES_FICHIER = "id, liberation_id, chemin, nom_origine, taille, type_mime, created_at";

export type Lieu = {
  id: string; nom: string; complement: string | null; rue: string | null; numero: string | null; boite: string | null;
  code_postal: string | null; localite: string | null; actif: boolean; ordre: number;
};
export const COLONNES_LIEU = "id, nom, complement, rue, numero, boite, code_postal, localite, actif, ordre";

export type TauxKm = { id: string; valable_du: string; taux: number };

/** Pièces jointes : PDF ou image, 10 par dossier, 25 Mo par fichier (limite du bucket). */
export const FICHIERS_MAX = 10;
export const FICHIER_TAILLE_MAX = 25 * 1024 * 1024;
export const TYPES_FICHIER = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MESSAGE_FICHIER_REFUSE = "PDF ou image (JPEG, PNG, WebP, HEIC), 25 Mo maximum";

/** Ce qui manque pour un participant ou son employeur (affiché sur le dossier avant l'envoi). */
export type Manque = "domicile" | "genre" | "registre_national" | "adresse_employeur" | "email_employeur";
export const LIBELLES_MANQUE: Record<Manque, { un: string; plusieurs: string }> = {
  domicile: { un: "délégué sans domicile", plusieurs: "délégués sans domicile" },
  genre: { un: "délégué sans genre", plusieurs: "délégués sans genre" },
  registre_national: { un: "délégué sans registre national", plusieurs: "délégués sans registre national" },
  adresse_employeur: { un: "employeur sans adresse complète", plusieurs: "employeurs sans adresse complète" },
  email_employeur: { un: "employeur sans e-mail", plusieurs: "employeurs sans e-mail" },
};
