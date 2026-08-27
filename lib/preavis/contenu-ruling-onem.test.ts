import { describe, expect, it } from "vitest";
import { contenuRulingOnem } from "./contenu-ruling-onem";

describe("contenuRulingOnem", () => {
  it("a une date de dernière vérification", () => {
    expect(contenuRulingOnem.derniereVerification).toBe("2026-08-27");
  });

  it("a au moins une section", () => {
    expect(contenuRulingOnem.sections.length).toBeGreaterThan(0);
  });

  it("chaque section a des phrases courtes (moins de 25 mots)", () => {
    for (const section of contenuRulingOnem.sections) {
      for (const phrase of section.phrases) {
        const nombreMots = phrase.trim().split(/\s+/).length;
        expect(nombreMots).toBeLessThan(25);
      }
    }
  });

  it("explique qu'il faut demander le ruling avant de démissionner", () => {
    const texte = [...contenuRulingOnem.pointsCles, ...contenuRulingOnem.sections.flatMap((s) => s.phrases)].join(
      " ",
    );
    expect(texte).toContain("avant");
  });

  it("recommande de contacter le secrétariat FGTB", () => {
    const texte = [...contenuRulingOnem.pointsCles, contenuRulingOnem.avertissement].join(" ");
    expect(texte).toContain("secrétariat FGTB");
  });

  it("a un avertissement non vide", () => {
    expect(contenuRulingOnem.avertissement.length).toBeGreaterThan(0);
  });

  it("propose le lien vers le formulaire officiel ONEM dans la section « Comment faire une demande »", () => {
    const section = contenuRulingOnem.sections.find((s) => s.titre === "Comment faire une demande de ruling ?");
    expect(section?.lien?.url).toBe(
      "https://www.onem.be/file/cc73d96153bbd5448a56f19d925d05b1379c7f21/70cf8f4ba22c569dc65c187710f4a40e95891570/20260604-ruling-fr.pdf",
    );
    expect(section?.lien?.texte.length).toBeGreaterThan(0);
  });
});
