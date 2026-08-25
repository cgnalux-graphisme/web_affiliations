export type Statut = "ouvrier" | "employe";

export type QuiRompt = "employeur" | "travailleur";

/** Date au format ISO AAAA-MM-JJ (voir lib/dates.ts). */
export type DateISO = string;

export interface DureePreavis {
  jours: number;
  semaines: number;
}

export interface ResultatPreavisOuvrier {
  statut: "ouvrier";
  quiRompt: QuiRompt;
  cp: string;
  cpCouverte: boolean;
  regimeApplique: "cp-specifique" | "cct75-supletif";
  javantPart1: DureePreavis;
  japresPart2: DureePreavis;
  total: DureePreavis;
  indemniteCompensatoire: DureePreavis | null;
}

export interface ResultatPreavisEmploye {
  statut: "employe";
  quiRompt: QuiRompt;
  seuilDepasse: boolean;
  part1: DureePreavis;
  part2: DureePreavis;
  total: DureePreavis;
  part1DemissionIncertaine: boolean;
}

export type ResultatPreavis = ResultatPreavisOuvrier | ResultatPreavisEmploye;
