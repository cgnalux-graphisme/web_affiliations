import { describe, expect, it } from "vitest";
import { preavisGeneralEmployeur, preavisGeneralDemission } from "./general-2014";

describe("preavisGeneralEmployeur", () => {
  it("donne 1 semaine sous 3 mois", () => {
    expect(preavisGeneralEmployeur(0)).toBe(1);
    expect(preavisGeneralEmployeur(2)).toBe(1);
  });

  it("suit la progression mensuelle jusqu'à 2 ans", () => {
    expect(preavisGeneralEmployeur(3)).toBe(3);
    expect(preavisGeneralEmployeur(6)).toBe(6);
    expect(preavisGeneralEmployeur(12)).toBe(8);
    expect(preavisGeneralEmployeur(24)).toBe(12);
  });

  it("donne 62 semaines à 20 ans (240 mois) et 66 à 24 ans (exemple ACCG)", () => {
    expect(preavisGeneralEmployeur(240)).toBe(62);
    expect(preavisGeneralEmployeur(288)).toBe(66);
  });

  it("continue de croître d'1 semaine/an après 20 ans", () => {
    expect(preavisGeneralEmployeur(612)).toBe(93);
  });
});

describe("preavisGeneralDemission", () => {
  it("donne 1 semaine sous 3 mois", () => {
    expect(preavisGeneralDemission(0)).toBe(1);
  });

  it("plafonne à 13 semaines dès 8 ans (96 mois)", () => {
    expect(preavisGeneralDemission(96)).toBe(13);
    expect(preavisGeneralDemission(300)).toBe(13);
  });

  it("donne 91 jours (13 sem) pour l'exemple ACCG CP124 démission (358 mois d'ancienneté totale, 107 depuis 2014)", () => {
    expect(preavisGeneralDemission(107)).toBe(13);
  });
});
