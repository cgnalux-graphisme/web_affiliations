import { describe, expect, it } from "vitest";
import { calculerPreavisOuvrier } from "./calcul-preavis";

describe("calculerPreavisOuvrier — exemple ACCG CP124 employeur", () => {
  it("reproduit exactement le résultat du classeur (217 jours + 245 jours d'indemnité)", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "1998-02-02",
      dateDebutPreavis: "2022-12-06",
      quiRompt: "employeur",
    });

    expect(resultat.javantPart1.jours).toBe(28);
    expect(resultat.japresPart2.jours).toBe(189);
    expect(resultat.total.jours).toBe(217);
    expect(resultat.indemniteCompensatoire?.jours).toBe(245);
    expect(resultat.regimeApplique).toBe("cp-specifique");
    expect(resultat.cpCouverte).toBe(true);
  });
});

describe("calculerPreavisOuvrier — exemple ACCG CP124 démission", () => {
  it("reproduit le plafond de 91 jours (13 semaines)", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "1993-02-02",
      dateDebutPreavis: "2022-12-06",
      quiRompt: "travailleur",
    });

    expect(resultat.javantPart1.jours).toBe(28);
    expect(resultat.total.jours).toBe(91);
    expect(resultat.total.semaines).toBe(13);
    expect(resultat.indemniteCompensatoire).toBeNull();
  });
});

describe("calculerPreavisOuvrier — ancienneté entièrement post-2014", () => {
  it("n'applique aucune partie 1 (sac à dos vide)", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "2015-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "employeur",
    });

    expect(resultat.javantPart1.jours).toBe(0);
    expect(resultat.total.semaines).toBe(resultat.japresPart2.semaines);
  });
});

describe("calculerPreavisOuvrier — CP non couverte", () => {
  it("bascule sur le régime supplétif CCT 75", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "999.99",
      dateEmbauche: "2005-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "employeur",
    });

    expect(resultat.cpCouverte).toBe(false);
    expect(resultat.regimeApplique).toBe("cct75-supletif");
    // moisEntre("2005-01-01", "2013-12-31") = 107 mois (8 ans et 11 mois) -> palier "5 à 10 ans" -> 42 jours.
    expect(resultat.javantPart1.jours).toBe(42);
    expect(resultat.avertissementNonSource).toBe(false);
  });
});

describe("calculerPreavisOuvrier — lacunes de source légale (design spec §12.2)", () => {
  it("signale un avertissement pour une démission avec CP non couverte et ancienneté pré-2014", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "999.99",
      dateEmbauche: "2005-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "travailleur",
    });

    expect(resultat.avertissementNonSource).toBe(true);
    expect(resultat.regimeApplique).toBe("non-source");
    expect(resultat.javantPart1.jours).toBe(0);
  });

  it("signale un avertissement pour un licenciement CCT75 sous 6 mois d'ancienneté au 31/12/2013", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "999.99",
      dateEmbauche: "2013-08-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "employeur",
    });

    // moisEntre("2013-08-01", "2013-12-31") = 4 mois -> non couvert par la CCT75 (min 6 mois).
    expect(resultat.avertissementNonSource).toBe(true);
    expect(resultat.regimeApplique).toBe("non-source");
    expect(resultat.javantPart1.jours).toBe(0);
  });
});

describe("calculerPreavisOuvrier — correctif 2026 (contrat entièrement post-réforme)", () => {
  it("applique le forfait d'1 semaine sous 6 mois pour un contrat commencé après le 31/7/2026", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "2026-08-01",
      dateDebutPreavis: "2026-12-15",
      quiRompt: "employeur",
    });

    // Ancienneté au début du préavis: 4 mois -> le barème général donnerait 4 semaines,
    // mais le correctif 2026 impose 1 semaine forfaitaire (contrat commencé après le 31/7/2026).
    expect(resultat.javantPart1.jours).toBe(0);
    expect(resultat.total.semaines).toBe(1);
  });

  it("plafonne à 52 semaines dès 17 ans pour un contrat commencé après le 31/5/2026", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "2026-06-01",
      dateDebutPreavis: "2043-06-01", // 17 ans pile plus tard
      quiRompt: "employeur",
    });

    expect(resultat.total.semaines).toBe(52);
    // Sans le plafond, le barème général donnerait 54 semaines à 204 mois (17 ans) pile — l'indemnité
    // compensatoire ne doit PAS se déclencher ici : la comparaison "nouvelle formule complète" doit elle
    // aussi être plafonnée, sinon on créerait artificiellement une fausse indemnité de 2 semaines (54-52).
    expect(resultat.indemniteCompensatoire).toBeNull();
  });
});
