import { describe, expect, it } from "vitest";
import { contenuOnemSanctions } from "./contenu-onem-sanctions";

describe("contenuOnemSanctions", () => {
  it("a une date de dernière vérification", () => {
    expect(contenuOnemSanctions.derniereVerification).toBe("2026-08-27");
  });

  it("a au moins une section", () => {
    expect(contenuOnemSanctions.sections.length).toBeGreaterThan(0);
  });

  it("chaque section a des phrases courtes (moins de 25 mots)", () => {
    for (const section of contenuOnemSanctions.sections) {
      for (const phrase of section.phrases) {
        const nombreMots = phrase.trim().split(/\s+/).length;
        expect(nombreMots).toBeLessThan(25);
      }
    }
  });

  it("mentionne la réforme du 1er mars 2026 et la condition d'ancienneté", () => {
    const texteComplet = contenuOnemSanctions.sections.flatMap((s) => s.phrases).join(" ");
    expect(texteComplet).toContain("1er mars 2026");
    expect(texteComplet).toContain("10 ans");
  });

  it("mentionne la suspension pouvant atteindre 1 an (support interne Récap démission)", () => {
    const texteComplet = contenuOnemSanctions.sections.flatMap((s) => s.phrases).join(" ");
    expect(texteComplet).toContain("jusqu'à 1 an");
  });

  it("mentionne les 3 stratégies d'évitement (réembauche 13 semaines, motif légitime, ruling)", () => {
    const texteComplet = contenuOnemSanctions.sections.flatMap((s) => s.phrases).join(" ");
    expect(texteComplet).toContain("13 semaines");
    expect(texteComplet).toContain("harcèlement");
    expect(texteComplet).toContain("ruling");
  });

  it("recommande de contacter le secrétariat FGTB avant de démissionner", () => {
    const texte = [...contenuOnemSanctions.pointsCles, contenuOnemSanctions.avertissement].join(" ");
    expect(texte).toContain("secrétariat FGTB");
    expect(texte).toContain("avant de démissionner");
  });

  it("a un avertissement non vide", () => {
    expect(contenuOnemSanctions.avertissement.length).toBeGreaterThan(0);
  });
});
