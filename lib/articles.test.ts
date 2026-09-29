import { describe, expect, it } from "vitest";
import {
  cheminActualites,
  cheminImageDepuisUrl,
  filtreDepuisParam,
  dateArticle,
  lignes,
  lignesSourcesInvalides,
  lireSource,
  lireSources,
  slugifier,
  slugValide,
  tempsLecture,
} from "./articles";

describe("slugifier", () => {
  it("retire accents, ponctuation et majuscules", () => {
    expect(slugifier("Grève du 14/10 : on y va !")).toBe("greve-du-14-10-on-y-va");
    expect(slugifier("  Œuvre   sociale  ")).toBe("oeuvre-sociale");
  });
  it("limite la longueur sans tiret final", () => {
    const s = slugifier("a ".repeat(100));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
  });
  it("produit un slug valide", () => {
    expect(slugValide(slugifier("L'index : ça bouge ?"))).toBe(true);
    expect(slugValide("Pas-Valide")).toBe(false);
    expect(slugValide("double--tiret")).toBe(false);
  });
});

describe("lignes", () => {
  it("ignore les lignes vides et retire les puces", () => {
    expect(lignes("- Un\n\n• Deux\r\n2) Trois\n  Quatre ")).toEqual(["Un", "Deux", "Trois", "Quatre"]);
  });
});

describe("sources", () => {
  it("lit un lien seul ou précédé d'un libellé", () => {
    expect(lireSource("https://www.rtbf.be/article/x")).toEqual({ url: "https://www.rtbf.be/article/x", libelle: "rtbf.be" });
    expect(lireSource("Le Soir – https://www.lesoir.be/a.")).toEqual({ url: "https://www.lesoir.be/a", libelle: "Le Soir" });
  });
  it("refuse une ligne sans lien", () => {
    expect(lireSource("www.lesoir.be")).toBeNull();
    expect(lignesSourcesInvalides("https://a.be\n\nlesoir\nhttp://b.be")).toEqual([3]);
    expect(lireSources("https://a.be\npas un lien")).toHaveLength(1);
  });
});

describe("tempsLecture", () => {
  it("compte au moins une minute", () => {
    expect(tempsLecture("<p>Court.</p>")).toBe(1);
  });
  it("arrondit à la minute sur le texte sans balises", () => {
    const html = `<p>${"mot ".repeat(660)}</p>`;
    expect(tempsLecture(html)).toBe(3);
  });
});

describe("dateArticle", () => {
  it("affiche la date à l'heure de Bruxelles", () => {
    expect(dateArticle("2026-09-27T23:30:00Z")).toBe("28/09/2026");
    expect(dateArticle(null)).toBe("");
  });
});

describe("cheminImageDepuisUrl", () => {
  it("retrouve le chemin dans le bucket", () => {
    expect(
      cheminImageDepuisUrl("https://x.supabase.co/storage/v1/object/public/blog-images/abc/couverture-1.jpg")
    ).toBe("abc/couverture-1.jpg");
    expect(cheminImageDepuisUrl("https://ailleurs.be/a.jpg")).toBeNull();
  });
});

describe("filtres de la page unifiée", () => {
  it("lit le paramètre ?rubrique=", () => {
    expect(filtreDepuisParam("actualites")).toBe("article");
    expect(filtreDepuisParam("on-vous-explique")).toBe("explication");
    expect(filtreDepuisParam(null)).toBe("tout");
    expect(filtreDepuisParam("n-importe-quoi")).toBe("tout");
  });
  it("compose l'adresse filtrée", () => {
    expect(cheminActualites()).toBe("/actualites");
    expect(cheminActualites("article")).toBe("/actualites?rubrique=actualites");
    expect(cheminActualites("explication")).toBe("/actualites?rubrique=on-vous-explique");
  });
});
