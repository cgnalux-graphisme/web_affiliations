import { describe, expect, it } from "vitest";
import { debutPreavisDepuisEnvoi, finPreavis, finPreavisJours, dateLimiteEnvoiRecommande } from "./dates-preavis";

describe("debutPreavisDepuisEnvoi", () => {
  it("calcule le début de préavis pour un envoi un vendredi", () => {
    // Envoi vendredi 2026-08-21 -> 3e jour ouvrable = mardi 2026-08-25 -> premier lundi qui suit = 2026-08-31
    expect(debutPreavisDepuisEnvoi("2026-08-21")).toBe("2026-08-31");
  });
});

describe("finPreavis", () => {
  it("ajoute N semaines complètes au début du préavis", () => {
    expect(finPreavis("2026-08-31", 4)).toBe("2026-09-27");
  });
});

describe("finPreavisJours", () => {
  it("donne le même résultat que finPreavis pour un nombre de jours multiple de 7", () => {
    expect(finPreavisJours("2026-08-31", 28)).toBe(finPreavis("2026-08-31", 4));
    expect(finPreavisJours("2026-08-31", 28)).toBe("2026-09-27");
  });

  it("calcule correctement un total qui n'est pas un multiple de 7 (exemple ACCG CP124 : 217 jours)", () => {
    expect(finPreavisJours("2026-09-07", 217)).toBe("2027-04-11");
  });

  it("calcule correctement le plafond démission (91 jours)", () => {
    expect(finPreavisJours("2026-09-07", 91)).toBe("2026-12-06");
  });
});

describe("dateLimiteEnvoiRecommande", () => {
  it("est l'inverse exact de debutPreavisDepuisEnvoi pour une date de début tombant un lundi", () => {
    const envoi = "2026-08-21";
    const debut = debutPreavisDepuisEnvoi(envoi);
    const limite = dateLimiteEnvoiRecommande(debut);
    // La date limite trouvée doit elle-même produire ce même début si on l'utilise comme date d'envoi.
    expect(debutPreavisDepuisEnvoi(limite)).toBe(debut);
  });
});
