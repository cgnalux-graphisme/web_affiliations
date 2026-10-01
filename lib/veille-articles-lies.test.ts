import { describe, expect, it } from "vitest";
import { articlesLiesAuxSujets } from "./veille-articles-lies";

const sujet = (liens: string[]) => ({
  rang: "S" as const, sujet: "x", pourquoi: "", angle: "", format: "article" as const,
  articles: liens.map((lien, i) => ({ id: `v${i}`, titre: "t", source: "RTBF", lien, date: null })),
});

describe("articlesLiesAuxSujets", () => {
  it("reconnaît l'article à ses sources (sans www ni paramètres) et prend le plus récent", () => {
    const lies = articlesLiesAuxSujets(
      [sujet(["https://www.rtbf.be/article/energie-1"]), sujet(["https://www.lesoir.be/x"])],
      [
        { id: "recent", titre: "Énergie", statut: "brouillon", sources: "RTBF Info – https://rtbf.be/article/energie-1?utm=a\nhttps://autre.be" },
        { id: "ancien", titre: "Énergie (vieux)", statut: "publie", sources: "https://www.rtbf.be/article/energie-1" },
      ]
    );
    expect(lies[0]).toEqual({ id: "recent", titre: "Énergie", statut: "brouillon" });
    expect(lies[1]).toBeUndefined();
  });

  it("utilise aussi le lien d'origine du fil (alerte Google)", () => {
    const lies = articlesLiesAuxSujets(
      [sujet(["https://www.dhnet.be/a"])],
      [{ id: "g", titre: "t", statut: "brouillon", sources: "https://news.google.com/rss/articles/ABC" }],
      { v0: "https://news.google.com/rss/articles/ABC?oc=5" }
    );
    expect(lies[0]?.id).toBe("g");
  });
});
