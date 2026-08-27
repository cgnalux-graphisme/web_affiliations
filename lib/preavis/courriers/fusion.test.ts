import { describe, expect, it } from "vitest";
import { genererConventionCommunAccord, genererNotificationDemission } from "./fusion";
import { MENTION_PRESTATION_AVEC, MENTION_PRESTATION_SANS, MENTION_PRESTATION_NON_RESOLUE } from "./templates";

describe("genererConventionCommunAccord", () => {
  it("garde les pointillés d'origine quand aucune coordonnée n'est fournie", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });

    expect(texte).toContain("CONVENTION DE RUPTURE DE COMMUN ACCORD");
    expect(texte).toContain("D'une part, le travailleur : ...");
    expect(texte).toContain("l'employeur / la société : ...");
    expect(texte).not.toContain("{{");
  });

  it("interpole la date de fin de contrat au format JJ/MM/AAAA", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });
    expect(texte).toContain("à la date du 30/09/2026,");
  });

  it("pré-remplit les coordonnées fournies", () => {
    const texte = genererConventionCommunAccord({
      dateFinContratIso: "2026-09-30",
      nomTravailleur: "Jean Dupont",
      domicileTravailleur: "Rue de la Paix 1, 5000 Namur",
      nomEmployeur: "SPRL Bâtiment Wallon",
      siegeEmployeur: "Chaussée de Charleroi 10, 6000 Charleroi",
      lieuSignature: "Namur",
    });

    expect(texte).toContain("le travailleur : Jean Dupont");
    expect(texte).toContain("domicilié(e) à : Rue de la Paix 1, 5000 Namur");
    expect(texte).toContain("la société : SPRL Bâtiment Wallon");
    expect(texte).toContain("son siège à : Chaussée de Charleroi 10, 6000 Charleroi");
    expect(texte).toContain("Fait en deux exemplaires à Namur,");
    // Champ non collecté par le wizard (design spec §3) : reste en pointillés.
    expect(texte).toContain("représenté(e) par : ...");
  });

  it("laisse les deux options + la note « biffer » si avecPrestation n'est pas précisé", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });
    expect(texte).toContain(MENTION_PRESTATION_NON_RESOLUE);
  });

  it("résout la mention sur « après l'exécution de la journée de travail » si avecPrestation=true", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30", avecPrestation: true });
    expect(texte).toContain(`la date du 30/09/2026, ${MENTION_PRESTATION_AVEC}.`);
    expect(texte).not.toContain("biffer");
  });

  it("résout la mention sur « sans prestation ce jour-là » si avecPrestation=false", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30", avecPrestation: false });
    expect(texte).toContain(`la date du 30/09/2026, ${MENTION_PRESTATION_SANS}.`);
    expect(texte).not.toContain("biffer");
  });
});

describe("genererNotificationDemission", () => {
  it("garde les pointillés d'origine quand aucune coordonnée n'est fournie", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
    });

    expect(texte).toContain("NOTIFICATION DE PRÉAVIS PAR LE TRAVAILLEUR");
    expect(texte).toContain("Je soussigné(e) : ...");
    expect(texte).not.toContain("{{");
  });

  it("affiche la durée en jours et semaines quand le nombre de jours est un multiple de 7", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
    });
    expect(texte).toContain("91 jours (13 semaines)");
  });

  it("affiche la durée en jours seulement quand ce n'est pas un multiple de 7", () => {
    const texte = genererNotificationDemission({
      dureeJours: 44,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-10-20",
    });
    expect(texte).toContain("44 jours");
    expect(texte).not.toContain("semaines)");
  });

  it("interpole les dates au format JJ/MM/AAAA et répète correctement la date de début (×2)", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
    });

    expect(texte).toContain("débutera le : 07/09/2026.");
    expect(texte).toContain("Il couvrira la période du 07/09/2026 au 15/11/2026 inclus.");
  });

  it("pré-remplit les coordonnées fournies", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
      nomTravailleur: "Jean Dupont",
      domicileTravailleur: "Rue de la Paix 1, 5000 Namur",
      nomEmployeur: "SPRL Bâtiment Wallon",
      lieuSignature: "Namur",
    });

    expect(texte).toContain("Je soussigné(e) : Jean Dupont");
    expect(texte).toContain("domicilié(e) à : Rue de la Paix 1, 5000 Namur");
    expect(texte).toContain("mon employeur, SPRL Bâtiment Wallon");
    expect(texte).toContain("Fait à Namur,");
  });
});
