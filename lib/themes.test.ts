import { describe, expect, it } from "vitest";
import { decouperMotsCles, motsClesTrouves, normaliser, preparerCorrespondance } from "./themes";

describe("normaliser", () => {
  it("retire accents, majuscules et ligatures", () => {
    expect(normaliser("  GRÈVE   Générale ")).toBe("greve generale");
    expect(normaliser("Œuvre d’art")).toBe("oeuvre d'art");
  });
});

describe("correspondance", () => {
  const c = preparerCorrespondance(["grève", "Salaire", "CP", "front commun", "index", "emploi", "grève"]);

  it("ignore casse et accents, accepte les fins de mots", () => {
    expect(c.test("Les GREVES reprennent")).toEqual(["grève"]);
    expect(c.test("Hausse des salaires minimums")).toEqual(["Salaire"]);
    expect(c.test("L'indexation automatique")).toEqual(["index"]);
  });

  it("exige un début de mot", () => {
    expect(c.test("Une capacité réduite")).toEqual([]);
    expect(c.test("Le réemploi des matériaux")).toEqual([]);
    expect(c.test("La CP 124 négocie")).toEqual(["CP"]);
  });

  it("gère les expressions de plusieurs mots", () => {
    expect(c.test("Un front  commun syndical")).toEqual(["front commun"]);
  });

  it("cherche dans le titre et le résumé, sans doublon", () => {
    expect(motsClesTrouves({ titre: "Grève à Namur", resume: "Nouvelle grève, les salaires en jeu" }, c)).toEqual([
      "grève",
      "Salaire",
    ]);
    expect(motsClesTrouves({ titre: "Météo", resume: null }, c)).toEqual([]);
  });

  it("ne retient rien sans mot-clé", () => {
    expect(preparerCorrespondance([]).test("grève")).toEqual([]);
  });
});

describe("decouperMotsCles", () => {
  it("découpe sur virgules, points-virgules et lignes, sans doublon", () => {
    expect(decouperMotsCles("grève, Grève ; index\n  front   commun ,")).toEqual(["grève", "index", "front commun"]);
  });
});
