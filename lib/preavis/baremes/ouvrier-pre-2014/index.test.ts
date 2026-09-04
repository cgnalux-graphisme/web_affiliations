import { describe, expect, it } from "vitest";
import {
  tableCP,
  joursParEraDate,
  preavisCct75Employeur,
  REGISTRE,
  REGISTRE_ANCIENNETE,
  tableCPAnciennete,
  regimeParDateEmbauche,
  joursParPalierAnciennete,
} from "./index";
import type { EraJours, PalierAnciennete } from "./types";

function estTrieCroissant(eras: EraJours[]): boolean {
  for (let i = 1; i < eras.length; i++) {
    if (eras[i].depuis < eras[i - 1].depuis) return false;
  }
  return true;
}

function estTrieParMoisMin(paliers: PalierAnciennete[]): boolean {
  for (let i = 1; i < paliers.length; i++) {
    if (paliers[i].moisMin <= paliers[i - 1].moisMin) return false;
  }
  return true;
}

describe("tableCP", () => {
  it("retrouve la table CP124", () => {
    expect(tableCP("124.00")?.nom).toBe("Construction");
  });

  it("retourne null pour une CP non couverte", () => {
    expect(tableCP("999.99")).toBeNull();
  });
});

describe("joursParEraDate — exemple ACCG CP124 employeur (embauche 1998-02-02 -> 28 jours)", () => {
  it("retourne 28 jours", () => {
    const cp124 = tableCP("124.00")!;
    expect(joursParEraDate(cp124.employeur, "1998-02-02")).toBe(28);
  });
});

describe("joursParEraDate — exemple ACCG CP124 démission (embauche 1993-02-02 -> 28 jours)", () => {
  it("retourne 28 jours", () => {
    const cp124 = tableCP("124.00")!;
    expect(joursParEraDate(cp124.demission, "1993-02-02")).toBe(28);
  });
});

describe("intégrité du registre REGISTRE", () => {
  const entries = Object.entries(REGISTRE);

  it("couvre les 6 CP prioritaires + les 49 CP supplémentaires extraites du classeur ACCG", () => {
    expect(entries.length).toBe(55);
  });

  it.each(entries)("%s : le champ cp de la table correspond à la clé du registre", (cle, table) => {
    expect(table.cp).toBe(cle);
  });

  it.each(entries)("%s : les eras employeur sont triées par date croissante", (_cle, table) => {
    expect(estTrieCroissant(table.employeur)).toBe(true);
  });

  it.each(entries)("%s : les eras démission sont triées par date croissante", (_cle, table) => {
    expect(estTrieCroissant(table.demission)).toBe(true);
  });
});

describe("preavisCct75Employeur", () => {
  it("retourne null sous 6 mois (non sourcé)", () => {
    expect(preavisCct75Employeur(3)).toBeNull();
  });

  it("retourne 35 jours entre 6 mois et 5 ans", () => {
    expect(preavisCct75Employeur(6)).toBe(35);
    expect(preavisCct75Employeur(59)).toBe(35);
  });

  it("retourne 112 jours à partir de 20 ans", () => {
    expect(preavisCct75Employeur(240)).toBe(112);
  });
});

describe("intégrité du registre REGISTRE_ANCIENNETE", () => {
  const entries = Object.entries(REGISTRE_ANCIENNETE);

  it("couvre 16 CP (secteurs hors Centrale Générale + compléments CG manquants)", () => {
    expect(entries.length).toBe(16);
  });

  it.each(entries)("%s : le champ cp de la table correspond à la clé du registre", (cle, table) => {
    expect(table.cp).toBe(cle);
  });

  it.each(entries)("%s : les régimes sont triés par date d'embauche croissante", (_cle, table) => {
    for (let i = 1; i < table.regimes.length; i++) {
      expect(table.regimes[i].depuisEmbauche >= table.regimes[i - 1].depuisEmbauche).toBe(true);
    }
  });

  it.each(entries)("%s : les paliers employeur sont triés par ancienneté croissante", (_cle, table) => {
    for (const regime of table.regimes) {
      expect(estTrieParMoisMin(regime.paliersEmployeur)).toBe(true);
    }
  });

  it.each(entries)("%s : les paliers démission (si sourcés) sont triés par ancienneté croissante", (_cle, table) => {
    for (const regime of table.regimes) {
      if (regime.paliersDemission !== null) {
        expect(estTrieParMoisMin(regime.paliersDemission)).toBe(true);
      }
    }
  });
});

describe("tableCPAnciennete", () => {
  it("retrouve la table CP105", () => {
    expect(tableCPAnciennete("105.00")?.nom).toBe("Métaux non-ferreux");
  });

  it("retourne null pour une CP non couverte", () => {
    expect(tableCPAnciennete("999.99")).toBeNull();
  });
});

describe("regimeParDateEmbauche — exemple CP140.04 (deux régimes par date d'embauche)", () => {
  it("retourne le régime A pour un contrat débuté avant 2012", () => {
    const table = tableCPAnciennete("140.04")!;
    expect(regimeParDateEmbauche(table.regimes, "2010-01-01").depuisEmbauche).toBe("1900-01-01");
  });

  it("retourne le régime B pour un contrat débuté à partir de 2012", () => {
    const table = tableCPAnciennete("140.04")!;
    expect(regimeParDateEmbauche(table.regimes, "2013-01-01").depuisEmbauche).toBe("2012-01-01");
  });
});

describe("joursParPalierAnciennete", () => {
  const paliers: PalierAnciennete[] = [
    { moisMin: 36, jours: 60 },
    { moisMin: 60, jours: 90 },
    { moisMin: 120, jours: 120 },
  ];

  it("retourne le palier correspondant", () => {
    expect(joursParPalierAnciennete(paliers, 47)).toBe(60);
    expect(joursParPalierAnciennete(paliers, 60)).toBe(90);
    expect(joursParPalierAnciennete(paliers, 300)).toBe(120);
  });

  it("retourne null sous le premier palier documenté (pas de valeur devinée)", () => {
    expect(joursParPalierAnciennete(paliers, 30)).toBeNull();
  });

  it("retourne null si la liste de paliers est null (régime non sourcé)", () => {
    expect(joursParPalierAnciennete(null, 100)).toBeNull();
  });
});
