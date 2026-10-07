/**
 * Commissions paritaires couvertes par la Centrale Générale FGTB Namur-Luxembourg (« nos secteurs »),
 * plus « Je ne sais pas » (999) et « Autre » (000). Liste du formulaire d'affiliation, partagée avec
 * le formulaire « Signaler un changement » (détection d'un transfert vers une autre centrale).
 * Fichier sans dépendance (importé par des composants client).
 */
export type CommissionParitaire = { id: string; label: string };

export const COMMISSIONS_PARITAIRES: readonly CommissionParitaire[] = [
  { id: "100",    label: "100 - Auxiliaire pour ouvriers" },
  { id: "101",    label: "101 - Mines" },
  { id: "102",    label: "102 - Carrières" },
  { id: "106",    label: "106 - Ciment" },
  { id: "109",    label: "109 - Industrie de l'habillement et de la confection (ouvriers)" },
  { id: "110",    label: "110 - Blanchisserie - Entretien du Textiles" },
  { id: "113",    label: "113 - Industrie de la céramique" },
  { id: "114",    label: "114 - Industrie de la brique" },
  { id: "115",    label: "115 - Verre (ouvriers)" },
  { id: "116",    label: "116 - Chimie (ouvriers)" },
  { id: "117",    label: "117 - Pétrole" },
  { id: "120",    label: "120 - Industrie textile & bonneterie" },
  { id: "121",    label: "121 - Nettoyage et Désinfection" },
  { id: "124",    label: "124 - Construction" },
  { id: "125",    label: "125 - Bois – Industrie" },
  { id: "126",    label: "126 - Ameublement - industrie transformatrice du bois" },
  { id: "129",    label: "129 - Production du papier" },
  { id: "136",    label: "136 - Transformation papier & carton (ouvriers)" },
  { id: "142",    label: "142 - Entreprises de valo. de matières premières de récupération" },
  { id: "146",    label: "146 - Entreprises forestières" },
  { id: "200",    label: "200 - Auxiliaire pour employés" },
  { id: "207",    label: "207 - Chimie (employés)" },
  { id: "214",    label: "214 - Textile (employés)" },
  { id: "215",    label: "215 - Industrie de l'habillement et de la confection (employés)" },
  { id: "222",    label: "222 - Transformation papier & carton (employés)" },
  { id: "314",    label: "314 - Coiffure - Soins de beauté – Fitness" },
  { id: "317",    label: "317 - Gardiennage" },
  { id: "322",    label: "322 - Intérim" },
  { id: "322.01", label: "322.01 - Titres-Services" },
  { id: "327",    label: "327 - ETA (Entreprises de Travail Adapté)" },
  { id: "999",    label: "Je ne sais pas" },
  { id: "000",    label: "000 - Autre" },
];

/** « Je ne sais pas » */
export const CP_INCONNUE = "999";
/** « Autre » : secteur hors de la Centrale générale. */
export const CP_AUTRE = "000";

/** Libellé d'une CP (« 124 - Construction »), ou le code tel quel s'il est inconnu. */
export function libelleCommission(id: string | null | undefined): string {
  if (!id) return "";
  return COMMISSIONS_PARITAIRES.find((c) => c.id === id)?.label ?? id;
}
