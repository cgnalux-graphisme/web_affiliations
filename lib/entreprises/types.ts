/** Types partagés de l'app Entreprises. Aucune dépendance : importables côté navigateur. */

export type Reference = { ref_nom: string | null; ref_fonction: string | null; ref_email: string | null; ref_telephone: string | null };
export type Entreprise = Reference & {
  id: string; company_id: string | null; nom: string | null; numero_bce: string | null; denomination_bce: string | null;
  siege_rue: string | null; siege_numero: string | null; siege_boite: string | null; siege_code_postal: string | null; siege_localite: string | null;
  bce_importe_le: string | null; notes: string | null;
  /** Autres entreprises CG Link regroupées dans cette fiche (affiliés additionnés). */
  autres_company_ids: string[];
};
export type Site = Reference & { id: string; entreprise_id: string; nom: string; principal: boolean; unite_postale_id: string | null; ordre: number };
export type Unite = { id: string; entreprise_id: string; site_id: string | null; numero_ue: string | null; denomination: string | null;
  rue: string | null; numero: string | null; boite: string | null; code_postal: string | null; localite: string | null;
  statut: "actif" | "arrete"; date_debut: string | null; origine: "bce" | "manuel" };
export type Onss = { id: string; entreprise_id: string; site_id: string | null; numero: string; libelle: string | null };
export type CompanyCgLink = { id: string; name: string; sector: string | null; onss: string | null;
  onss2: string | null; onss2_label: string | null; onss3: string | null; onss3_label: string | null; onss4: string | null; onss4_label: string | null };
export type MandatAffiche = { organe: string; qualite: string | null; libelle: string | null; fonction: string | null; site_id: string | null };
export type DelegueAffiche = { id: string; prenom: string | null; nom: string; email: string | null; telephone: string | null; mandats: MandatAffiche[] };
export const COLONNES_ENTREPRISE = "id, company_id, nom, numero_bce, denomination_bce, siege_rue, siege_numero, siege_boite, siege_code_postal, siege_localite, ref_nom, ref_fonction, ref_email, ref_telephone, bce_importe_le, notes, autres_company_ids";
export const COLONNES_SITE = "id, entreprise_id, nom, principal, unite_postale_id, ref_nom, ref_fonction, ref_email, ref_telephone, ordre";
export const COLONNES_UNITE = "id, entreprise_id, site_id, numero_ue, denomination, rue, numero, boite, code_postal, localite, statut, date_debut, origine";
export const COLONNES_ONSS = "id, entreprise_id, site_id, numero, libelle";
