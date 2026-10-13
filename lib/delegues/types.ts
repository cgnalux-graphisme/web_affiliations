/** Types de l'app Gestion délégués CG Link. Aucune dépendance. */

export const ORGANES = ["ds", "ce", "cppt", "cee", "instances_cg", "autre"] as const;
export type Organe = (typeof ORGANES)[number];
export type Qualite = "effectif" | "suppleant";
export type Mandat = { id: string; delegue_id: string; site_id: string | null; organe: Organe; qualite: Qualite | null;
  libelle: string | null; fonction: string | null; debut: string | null; fin: string | null; a_verifier: string | null };
export type Delegue = { id: string; entreprise_id: string; cglink_user_id: string | null; unite_id: string | null;
  prenom: string | null; nom: string; email: string | null; telephone: string | null; notes: string | null; a_verifier: string | null;
  adresse_rue: string | null; adresse_numero: string | null; adresse_boite: string | null; adresse_code_postal: string | null;
  adresse_localite: string | null; adresse_pays: string | null };
export type DelegueCgLink = { id: string; name?: string | null; email?: string | null; phone?: string | null;
  isActive?: boolean; invitedAt?: number; mandateDs?: string | null; mandateCe?: string | null; mandateCppt?: string | null; mandateOther?: string | null };
export type EtatCompte = "actif" | "invite" | "bloque" | "sans_compte" | "introuvable";
export const COLONNES_DELEGUE = "id, entreprise_id, cglink_user_id, unite_id, prenom, nom, email, telephone, notes, a_verifier, adresse_rue, adresse_numero, adresse_boite, adresse_code_postal, adresse_localite, adresse_pays";
export const COLONNES_MANDAT = "id, delegue_id, site_id, organe, qualite, libelle, fonction, debut, fin, a_verifier";
