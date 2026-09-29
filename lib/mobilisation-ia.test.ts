import { describe, expect, it } from "vitest";
import { construireAnalyse, type ReponseAnalyse } from "./mobilisation-ia";

const TEXTES = `Grève générale le 14 octobre 2026. Rendez-vous à 10h30 à la gare du Nord à Bruxelles.
La réforme porte l'âge de la pension à 67 ans pour tous les travailleurs du pays sans exception.
Inscriptions : https://www.fgtb.be/inscription-greve`;

const BASE: ReponseAnalyse = {
  titre: "Grève générale pour nos pensions",
  date: "14/10/2026",
  heure: "10:30",
  lieu: "Bruxelles, gare du Nord",
  chapo: "Tous ensemble le 14/10/2026.",
  pourquoi: "La pension à 67 ans nous concerne tous.\n\nOn ne lâche rien.",
  revendications: ["Pas touche à nos pensions"],
  infos_pratiques: ["Rendez-vous : 10 h 30, gare du Nord"],
  lien_inscription: "https://www.fgtb.be/inscription-greve",
  avertissement: "",
};

describe("analyse de textes collés", () => {
  it("garde les champs valides", () => {
    const a = construireAnalyse(BASE, TEXTES);
    expect(a.date).toBe("14/10/2026");
    expect(a.heure).toBe("10:30");
    expect(a.lien_inscription).toBe("https://www.fgtb.be/inscription-greve");
    expect(a.revendications).toBe("Pas touche à nos pensions");
    expect(a.avertissements).toEqual([]);
  });
  it("écrit les dates en chiffres sans fausse alerte sur les chiffres", () => {
    const a = construireAnalyse({ ...BASE, chapo: "Tous dans la rue le 14 octobre." }, TEXTES);
    expect(a.chapo).toBe("Tous dans la rue le 14/10/2026.");
    expect(a.avertissements).toEqual([]);
  });
  it("écarte un lien absent des textes et une date invalide", () => {
    const a = construireAnalyse({ ...BASE, lien_inscription: "https://inventé.be/form", date: "31/02/2026" }, TEXTES);
    expect(a.lien_inscription).toBe("");
    expect(a.date).toBe("");
    expect(a.heure).toBe("");
    expect(a.avertissements.join(" ")).toMatch(/lien d'inscription/);
    expect(a.avertissements.join(" ")).toMatch(/Date proposée/);
  });
  it("signale les chiffres inventés et les reprises mot pour mot", () => {
    const a = construireAnalyse(
      {
        ...BASE,
        pourquoi:
          "La réforme porte l'âge de la pension à 67 ans pour tous les travailleurs du pays sans exception. Soit 300 euros de moins.",
      },
      TEXTES
    );
    expect(a.avertissements.join(" ")).toMatch(/300/);
    expect(a.avertissements.join(" ")).toMatch(/mot pour mot de vos textes \(pourquoi\)/);
  });
});
