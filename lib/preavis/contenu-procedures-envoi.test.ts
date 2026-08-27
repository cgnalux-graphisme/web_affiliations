import { describe, expect, it } from "vitest";
import { contenuProceduresEnvoi } from "./contenu-procedures-envoi";

describe("contenuProceduresEnvoi — travailleur (démission)", () => {
  const contenu = contenuProceduresEnvoi("travailleur");

  it("propose la remise en main propre et le recommandé", () => {
    const texte = contenu.sections.flatMap((s) => s.phrases).join(" ");
    expect(texte).toContain("remise en main propre");
    expect(texte).toContain("recommandé");
  });

  it("prévient que la lettre simple n'est pas valable", () => {
    const texte = contenu.sections.flatMap((s) => s.phrases).join(" ");
    expect(texte).toContain("lettre simple");
    expect(texte).toContain("n'est pas valable");
  });

  it("chaque phrase reste courte (moins de 30 mots)", () => {
    for (const section of contenu.sections) {
      for (const phrase of section.phrases) {
        const nombreMots = phrase.trim().split(/\s+/).length;
        expect(nombreMots).toBeLessThan(30);
      }
    }
  });
});

describe("contenuProceduresEnvoi — employeur (licenciement)", () => {
  const contenu = contenuProceduresEnvoi("employeur");

  it("ne propose PAS la remise en main propre pour l'employeur", () => {
    const texte = contenu.sections.flatMap((s) => s.phrases).join(" ");
    expect(texte).toContain("ne peut plus vous remettre la lettre");
  });

  it("propose le recommandé et l'exploit d'huissier", () => {
    const texte = contenu.sections.flatMap((s) => s.phrases).join(" ");
    expect(texte).toContain("recommandé");
    expect(texte).toContain("huissier");
  });
});

describe("contenuProceduresEnvoi — les deux variantes", () => {
  it("ont chacune une date de vérification et un avertissement", () => {
    for (const qui of ["travailleur", "employeur"] as const) {
      const contenu = contenuProceduresEnvoi(qui);
      expect(contenu.derniereVerification).toBe("2026-08-25");
      expect(contenu.avertissement.length).toBeGreaterThan(0);
      expect(contenu.pointsCles.length).toBeGreaterThan(0);
    }
  });
});
