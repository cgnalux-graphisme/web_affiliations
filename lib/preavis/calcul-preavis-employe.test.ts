import { describe, expect, it } from "vitest";
import { calculerPreavisEmploye } from "./calcul-preavis-employe";

describe("calculerPreavisEmploye — ancienneté entièrement post-2014", () => {
  it("applique uniquement le barème général (identique à l'ouvrier sur cette période)", () => {
    const resultat = calculerPreavisEmploye({
      dateEmbauche: "2015-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "employeur",
      remunerationAnnuelle: 40000,
    });

    // moisEntre("2015-01-01","2020-01-01") = 60 mois -> preavisGeneralEmployeur(60) = 18 semaines = 126 jours.
    expect(resultat.part1.jours).toBe(0);
    expect(resultat.part2.jours).toBe(126);
    expect(resultat.total.jours).toBe(126);
    expect(resultat.seuilDepasse).toBe(true);
    expect(resultat.part1DemissionIncertaine).toBe(false);
  });
});

describe("calculerPreavisEmploye — pré-2014, sous le seuil, licenciement", () => {
  it("combine la règle des tranches de 5 ans et le barème général", () => {
    const resultat = calculerPreavisEmploye({
      dateEmbauche: "2005-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "employeur",
      remunerationAnnuelle: 25000,
    });

    // moisEntre("2005-01-01","2013-12-31") = 107 mois = 8,9166 ans -> 2 tranches de 5 ans -> 6 mois -> 183 jours (arrondi).
    expect(resultat.part1.jours).toBe(183);
    // moisEntre("2014-01-01","2020-01-01") = 72 mois -> preavisGeneralEmployeur(72) = 21 semaines = 147 jours.
    expect(resultat.part2.jours).toBe(147);
    expect(resultat.total.jours).toBe(330);
    expect(resultat.seuilDepasse).toBe(false);
    expect(resultat.part1DemissionIncertaine).toBe(false);
  });
});

describe("calculerPreavisEmploye — pré-2014, au-dessus du seuil, démission plafonnée", () => {
  it("plafonne le total à 91 jours (13 semaines) et signale l'incertitude de la partie 1", () => {
    const resultat = calculerPreavisEmploye({
      dateEmbauche: "1990-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "travailleur",
      remunerationAnnuelle: 45000,
    });

    // moisEntre("1990-01-01","2013-12-31") = 287 mois = 23,9166 ans -> moisLicenciement = 24,
    // démission = min(round(24/2), 3) = 3 mois -> 91 jours (arrondi), incertain = true.
    expect(resultat.part1.jours).toBe(91);
    expect(resultat.part1DemissionIncertaine).toBe(true);
    // Sans le plafond, le total (91 + 70 = 161 jours) dépasserait largement les 13 semaines légales.
    expect(resultat.total.jours).toBe(91);
    expect(resultat.total.semaines).toBe(13);
    expect(resultat.seuilDepasse).toBe(true);
  });
});
