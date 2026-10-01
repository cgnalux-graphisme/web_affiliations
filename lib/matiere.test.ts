import { describe, expect, it } from "vitest";
import { compterMots, evaluerMatiere, type SourceMatiere } from "./matiere";

const src = (nom: string, extra: Partial<SourceMatiere> = {}): SourceMatiere => ({
  nom,
  resumeMots: 30,
  lisible: "non",
  lire: false,
  texteMots: 0,
  ...extra,
});

describe("evaluerMatiere", () => {
  it("résumés seuls = maigre, avec un conseil sur la source la plus détaillée", () => {
    const m = evaluerMatiere([src("RTL", { resumeMots: 20 }), src("L'Avenir", { resumeMots: 80 })], 0);
    expect(m.niveau).toBe("maigre");
    expect(m.conseil).toMatch(/Ouvrez L'Avenir/);
    expect(m.coutCentimes).toBe(2);
  });

  it("propose d'abord la lecture par l'IA d'une source lisible", () => {
    const m = evaluerMatiere([src("RTL"), src("RTBF", { lisible: "oui", resumeMots: 10 })], 0);
    expect(m.conseil).toMatch(/Faites lire RTBF/);
  });

  it("une lecture demandée compte, et coûte", () => {
    const m = evaluerMatiere([src("RTBF", { lisible: "oui", lire: true })], 0);
    expect(m.niveau).toBe("solide");
    expect(m.conseil).toBeNull();
    expect(m.lectures).toBe(1);
    expect(m.coutCentimes).toBe(10);
  });

  it("une lecture demandée sur un site qui l'interdit ne compte pas", () => {
    const m = evaluerMatiere([src("RTL", { lisible: "non", lire: true })], 0);
    expect(m.lectures).toBe(0);
    expect(m.niveau).toBe("maigre");
  });

  it("un texte collé fait monter la jauge ; plus de conseil de lecture au-delà de la limite", () => {
    const m = evaluerMatiere([src("L'Avenir", { texteMots: 300 })], 0);
    expect(m.niveau).toBe("correcte");
    const limite = evaluerMatiere(
      [src("A", { lisible: "oui", lire: true }), src("B", { lisible: "oui", lire: true }), src("C", { lisible: "oui" })],
      0
    );
    expect(limite.lectures).toBe(2);
    expect(limite.remplissage).toBe(1);
  });

  it("compte les mots", () => {
    expect(compterMots("  un  deux\ntrois ")).toBe(3);
    expect(compterMots("")).toBe(0);
  });
});
