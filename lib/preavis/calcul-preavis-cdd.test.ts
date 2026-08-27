import { describe, expect, it } from "vitest";
import { calculerRuptureCdd } from "./calcul-preavis-cdd";

describe("calculerRuptureCdd", () => {
  it("commun accord : valide, sans préavis", () => {
    const resultat = calculerRuptureCdd({ cas: "commun-accord" });
    expect(resultat).toEqual({
      cas: "commun-accord",
      valide: true,
      motifInvalide: null,
      dureePreavis: null,
      dateLimitePremiereMoitie: null,
    });
  });

  it("engagement en CDI ailleurs : valide, préavis d'1 semaine", () => {
    const resultat = calculerRuptureCdd({ cas: "engagement-cdi-ailleurs" });
    expect(resultat.valide).toBe(true);
    expect(resultat.dureePreavis).toEqual({ jours: 7, semaines: 1 });
  });

  it("aucun cas prévu : invalide, avertissement sur l'indemnité", () => {
    const resultat = calculerRuptureCdd({ cas: "aucun" });
    expect(resultat.valide).toBe(false);
    expect(resultat.dureePreavis).toBeNull();
    expect(resultat.motifInvalide).toContain("indemnité");
  });

  describe("1ère moitié du 1er CDD (max 6 mois)", () => {
    it("refuse si ce n'est pas le premier CDD chez cet employeur", () => {
      const resultat = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-01-01",
        dateFinCdd: "2026-06-30",
        dateRupture: "2026-02-01",
        premierCdd: false,
      });
      expect(resultat.valide).toBe(false);
      expect(resultat.motifInvalide).toContain("premier CDD");
    });

    it("CDD de 6 mois : valide dans la 1ère moitié (limite = milieu du contrat, 2026-04-01)", () => {
      const resultat = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-01-01",
        dateFinCdd: "2026-06-30",
        dateRupture: "2026-03-15",
        premierCdd: true,
      });
      expect(resultat.valide).toBe(true);
      expect(resultat.dateLimitePremiereMoitie).toBe("2026-04-01");
    });

    it("CDD de 6 mois : invalide après la 1ère moitié", () => {
      const resultat = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-01-01",
        dateFinCdd: "2026-06-30",
        dateRupture: "2026-05-01",
        premierCdd: true,
      });
      expect(resultat.valide).toBe(false);
      expect(resultat.motifInvalide).toContain("indemnité");
    });

    it("CDD long (18 mois) : la limite est plafonnée à 6 mois, pas à la moitié réelle (2026-09-30)", () => {
      const dansLaLimite = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-01-01",
        dateFinCdd: "2027-06-30",
        dateRupture: "2026-06-15",
        premierCdd: true,
      });
      expect(dansLaLimite.valide).toBe(true);
      expect(dansLaLimite.dateLimitePremiereMoitie).toBe("2026-07-01");

      const horsLimite = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-01-01",
        dateFinCdd: "2027-06-30",
        dateRupture: "2026-08-01",
        premierCdd: true,
      });
      expect(horsLimite.valide).toBe(false);
    });

    // Le préavis suit le barème démission ordinaire (art. 37/2) sur
    // l'ancienneté acquise depuis le début du CDD — PAS un flat "2 semaines".
    // Voir calcul-preavis-cdd.ts pour les sources (Securex, Semafor, PeoplePay, Elegis).
    it("CDD antérieur au 1/8/2026, ancienneté < 3 mois : 1 semaine (ancien barème démission)", () => {
      const resultat = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-01-01",
        dateFinCdd: "2027-01-01",
        dateRupture: "2026-02-15", // 1 mois d'ancienneté
        premierCdd: true,
      });
      expect(resultat.dureePreavis).toEqual({ jours: 7, semaines: 1 });
    });

    it("CDD antérieur au 1/8/2026, ancienneté 3-5 mois : 2 semaines (ancien barème démission)", () => {
      const resultat = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-01-01",
        dateFinCdd: "2027-01-01",
        dateRupture: "2026-04-15", // 3 mois d'ancienneté
        premierCdd: true,
      });
      expect(resultat.dureePreavis).toEqual({ jours: 14, semaines: 2 });
    });

    it("CDD débutant à partir du 1/8/2026 : 1 semaine flat durant les 6 premiers mois (réforme du 3/6/2026)", () => {
      const resultat = calculerRuptureCdd({
        cas: "premiere-moitie",
        dateDebutCdd: "2026-09-01",
        dateFinCdd: "2027-09-01",
        dateRupture: "2027-01-15", // 4 mois d'ancienneté : aurait donné 2 semaines sous l'ancien barème
        premierCdd: true,
      });
      expect(resultat.valide).toBe(true);
      expect(resultat.dureePreavis).toEqual({ jours: 7, semaines: 1 });
    });
  });
});
