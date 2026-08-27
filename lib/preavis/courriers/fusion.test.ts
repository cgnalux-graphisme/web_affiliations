import { describe, expect, it } from "vitest";
import { genererConventionCommunAccord, genererNotificationDemission } from "./fusion";

describe("genererConventionCommunAccord", () => {
  it("garde les pointillés d'origine quand aucune coordonnée n'est fournie", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });

    expect(texte).toContain("Convention de rupture de contrat de commun accord");
    expect(texte).toContain("Entre l'employeur :");
    expect(texte).toContain("Et le travailleur :");
    expect(texte).not.toContain("{{");
  });

  it("interpole la date de fin de contrat au format JJ/MM/AAAA", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });
    expect(texte).toContain("Cette rupture prendra effet à la date du 30/09/2026 et ce, sans préavis.");
  });

  it("pré-remplit les coordonnées, la fonction et la date de conclusion du contrat", () => {
    const texte = genererConventionCommunAccord({
      dateFinContratIso: "2026-09-30",
      nomTravailleur: "Jean Dupont",
      domicileTravailleur: "Rue de la Paix 1, 5000 Namur",
      nomEmployeur: "SPRL Bâtiment Wallon",
      siegeEmployeur: "Chaussée de Charleroi 10, 6000 Charleroi",
      dateEntreeServiceIso: "2018-03-01",
      fonction: "Ouvrier polyvalent",
      lieuSignature: "Namur",
    });

    expect(texte).toContain("SPRL Bâtiment Wallon");
    expect(texte).toContain("Chaussée de Charleroi 10, 6000 Charleroi");
    expect(texte).toContain("Jean Dupont");
    expect(texte).toContain("Rue de la Paix 1, 5000 Namur");
    expect(texte).toContain("conclu entre elles le 01/03/2018, pour la fonction de Ouvrier polyvalent.");
    expect(texte).toContain("Fait à Namur,");
  });

  it("garde les pointillés si la date de fin de contrat est une chaîne vide (au lieu d'afficher une date vide)", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "" });
    const pointilles = "...........................................";
    expect(texte).toContain(`à la date du ${pointilles} et ce, sans préavis.`);
    expect(texte).not.toContain("à la date du ,");
  });

  it("interpole la date de signature fournie", () => {
    const texte = genererConventionCommunAccord({
      dateFinContratIso: "2026-09-30",
      lieuSignature: "Namur",
      dateSignatureIso: "2026-08-21",
    });
    expect(texte).toContain("Fait à Namur, le 21/08/2026.");
  });
});

describe("genererNotificationDemission", () => {
  it("garde les pointillés d'origine quand aucune coordonnée n'est fournie", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
    });

    expect(texte).toContain("Concerne : rupture de contrat de travail à l'initiative du travailleur - démission");
    expect(texte).toContain("Courrier recommandé");
    expect(texte).not.toContain("{{");
  });

  it("affiche la durée en chiffres ET en toutes lettres (91 jours = 13 semaines = « treize »)", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
    });
    expect(texte).toContain("d'une durée de 13 (en toutes lettres : treize) semaines");
  });

  it("arrondit à la semaine la plus proche quand ce n'est pas un multiple de 7 (44 jours -> 6 semaines)", () => {
    const texte = genererNotificationDemission({
      dureeJours: 44,
      dateDebutPreavisIso: "2026-10-19",
    });
    expect(texte).toContain("d'une durée de 6 (en toutes lettres : six) semaines");
  });

  it("interpole la date de signature fournie, sinon garde les pointillés", () => {
    const avecDate = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateSignatureIso: "2026-08-21",
    });
    expect(avecDate).toContain("le 21/08/2026");

    const sansDate = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
    });
    const pointilles = "...........................................";
    expect(sansDate).toContain(`${pointilles}, le ${pointilles}`);
  });

  it("interpole la date de début de préavis au format JJ/MM/AAAA", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
    });

    expect(texte).toContain("débutera le lundi 07/09/2026.");
  });

  it("pré-remplit le lieu de signature fourni", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      lieuSignature: "Namur",
    });

    expect(texte).toContain("Namur, le");
  });
});
