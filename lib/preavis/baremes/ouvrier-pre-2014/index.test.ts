import { describe, expect, it } from "vitest";
import { tableCP, joursParEraDate, preavisCct75Employeur, REGISTRE } from "./index";
import type { EraJours } from "./types";

function estTrieCroissant(eras: EraJours[]): boolean {
  for (let i = 1; i < eras.length; i++) {
    if (eras[i].depuis < eras[i - 1].depuis) return false;
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

  it("couvre bien les 6 CP prioritaires", () => {
    expect(entries.length).toBe(6);
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
