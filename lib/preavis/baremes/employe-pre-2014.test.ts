import { describe, expect, it } from "vitest";
import { preavisEmployePre2014 } from "./employe-pre-2014";

describe("preavisEmployePre2014", () => {
  it("applique 3 mois par tranche de 5 ans entamée sous le seuil (licenciement)", () => {
    // 7 ans d'ancienneté au 31/12/2013 = 2 tranches de 5 ans entamées -> 6 mois
    expect(preavisEmployePre2014({ anneesAnciennete: 7, remunerationAnnuelle: 30000, quiRompt: "employeur" })).toEqual({
      mois: 6,
      incertain: false,
    });
  });

  it("applique 1 mois/an (min 3) au-dessus du seuil (licenciement)", () => {
    expect(preavisEmployePre2014({ anneesAnciennete: 10, remunerationAnnuelle: 50000, quiRompt: "employeur" })).toEqual({
      mois: 10,
      incertain: false,
    });
  });

  it("applique le minimum de 3 mois au-dessus du seuil même à faible ancienneté", () => {
    expect(preavisEmployePre2014({ anneesAnciennete: 1, remunerationAnnuelle: 50000, quiRompt: "employeur" })).toEqual({
      mois: 3,
      incertain: false,
    });
  });

  it("marque le résultat comme incertain pour une démission au-dessus du seuil", () => {
    const resultat = preavisEmployePre2014({ anneesAnciennete: 10, remunerationAnnuelle: 50000, quiRompt: "travailleur" });
    expect(resultat.incertain).toBe(true);
    expect(resultat.mois).toBe(5); // moitié de 10 mois, règle non confirmée sur source primaire
  });

  it("n'est pas incertain pour une démission sous le seuil (règle légale claire)", () => {
    const resultat = preavisEmployePre2014({ anneesAnciennete: 7, remunerationAnnuelle: 30000, quiRompt: "travailleur" });
    expect(resultat.incertain).toBe(false);
    expect(resultat.mois).toBe(6);
  });
});
