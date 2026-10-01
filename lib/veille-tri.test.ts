import { describe, expect, it } from "vitest";
import { dansLaMemoire, limiteMemoire } from "./veille";
import { heureBruxelles, ramassageRecent } from "./veille-tri";
import { construireResultat, fusionnerDoublons, messageTri, type ArticleFil } from "./veille-tri-ia";
import { idsDuSujet } from "./veille-tri";

const article = (n: number, extra: Partial<ArticleFil> = {}): ArticleFil => ({
  id: `id-${n}`,
  titre: `Titre ${n}`,
  resume: `Résumé ${n}`,
  lien: `https://ex.be/${n}`,
  source_nom: "RTBF",
  date_publication: "2026-10-01T06:00:00Z",
  created_at: "2026-10-01T06:05:00Z",
  statut: "nouveau",
  ...extra,
});
const ARTICLES = [1, 2, 3, 4, 5].map((n) => article(n));

describe("mémoire du fil (3 jours)", () => {
  const maintenant = new Date("2026-10-01T08:00:00Z");
  it("garde un article récent ou sans date, écarte un article de plus de 3 jours", () => {
    expect(dansLaMemoire("2026-09-29T08:00:00Z", maintenant)).toBe(true);
    expect(dansLaMemoire(null, maintenant)).toBe(true);
    expect(dansLaMemoire("2026-09-28T07:59:00Z", maintenant)).toBe(false);
  });
  it("limite = maintenant moins 3 jours", () => {
    expect(limiteMemoire(maintenant)).toBe("2026-09-28T08:00:00.000Z");
  });
});

describe("ramassageRecent", () => {
  const t = Date.parse("2026-10-01T08:00:00Z");
  it("actif moins de 2 h après le ramassage", () => {
    expect(ramassageRecent("2026-10-01T06:30:00Z", t)).toBe(true);
    expect(ramassageRecent("2026-10-01T05:59:00Z", t)).toBe(false);
    expect(ramassageRecent(null, t)).toBe(false);
    expect(ramassageRecent("n'importe quoi", t)).toBe(false);
  });
});

describe("heureBruxelles", () => {
  it("8 h à Bruxelles = 6 h UTC en été, 7 h UTC en hiver", () => {
    expect(heureBruxelles(new Date("2026-07-01T06:30:00Z"))).toBe(8);
    expect(heureBruxelles(new Date("2026-12-01T07:30:00Z"))).toBe(8);
    expect(heureBruxelles(new Date("2026-12-01T06:30:00Z"))).toBe(7);
  });
});

describe("messageTri", () => {
  it("numérote les articles a1, a2… sans identifiant de la base et signale les déjà traités", () => {
    const m = messageTri([article(1), article(2, { statut: "traite" })], ["Index : ce qui change"], "01/10/2026");
    expect(m).toContain("[a1] RTBF");
    expect(m).toContain("[a2] RTBF · 01/10/2026 08:00 · [déjà traité]");
    expect(m).not.toContain("id-1");
    expect(m).toContain("– Index : ce qui change");
  });
});

describe("construireResultat", () => {
  it("écarte les références inventées et les sujets sans article valide", () => {
    const r = construireResultat(
      {
        sujets: [
          { rang: "S", sujet: "Index", refs: ["a1", "a99"], pourquoi: "p", angle: "a", format: "article" },
          { rang: "A", sujet: "Fantôme", refs: ["a42"], pourquoi: "p", angle: "a", format: "article" },
        ],
      },
      ARTICLES
    );
    expect(r.sujets).toHaveLength(1);
    expect(r.sujets[0].articles.map((a) => a.id)).toEqual(["id-1"]);
    expect(r.non_retenus).toBe(4);
  });

  it("un article n'apparaît que dans le sujet le mieux classé, même si l'IA les donne dans le désordre", () => {
    const r = construireResultat(
      {
        sujets: [
          { rang: "B", sujet: "Post", refs: ["a2", "a3"], pourquoi: "", angle: "", format: "post" },
          { rang: "S", sujet: "Une", refs: ["a2", "[A1]", "a1"], pourquoi: "", angle: "", format: "article" },
        ],
      },
      ARTICLES
    );
    expect(r.sujets.map((s) => s.rang)).toEqual(["S", "B"]);
    expect(r.sujets[0].articles.map((a) => a.id)).toEqual(["id-2", "id-1"]);
    expect(r.sujets[1].articles.map((a) => a.id)).toEqual(["id-3"]);
  });

  it("met le format en cohérence avec le rang, vide l'angle de C et X, retire les liens", () => {
    const r = construireResultat(
      {
        sujets: [
          { rang: "B", sujet: "x", refs: ["a1"], pourquoi: "voir https://pirate.example", angle: "a", format: "article" },
          { rang: "C", sujet: "y", refs: ["a2"], pourquoi: "", angle: "à retirer", format: "article" },
          { rang: "X", sujet: "z", refs: ["a3"], pourquoi: "", angle: "à retirer", format: "post" },
          { rang: "A", sujet: "w", refs: ["a4"], pourquoi: "", angle: "", format: "surveiller" },
        ],
        synthese: "Synthèse",
      },
      ARTICLES
    );
    const par = Object.fromEntries(r.sujets.map((s) => [s.rang, s]));
    expect(par.B.format).toBe("post");
    expect(par.B.pourquoi).toBe("voir");
    expect(par.C.format).toBe("surveiller");
    expect(par.C.angle).toBe("");
    expect(par.X.format).toBe("aucun");
    expect(par.X.angle).toBe("");
    expect(par.A.format).toBe("article");
    expect(r.synthese).toBe("Synthèse");
  });

  it("ignore un rang inconnu et plafonne le nombre de sujets S", () => {
    const sujets = Array.from({ length: 5 }, (_, i) => ({
      rang: "S" as const, sujet: `s${i}`, refs: [`a${i + 1}`], pourquoi: "", angle: "", format: "article" as const,
    }));
    const many = Array.from({ length: 8 }, (_, i) => article(i + 1));
    const r = construireResultat({ sujets: [...sujets, ...sujets.map((s, i) => ({ ...s, refs: [`a${i + 6}`] })).slice(0, 3)] }, many);
    expect(r.sujets.filter((s) => s.rang === "S")).toHaveLength(5);
    // @ts-expect-error rang hors schéma
    expect(construireResultat({ sujets: [{ rang: "Z", sujet: "q", refs: ["a1"] }] }, ARTICLES).sujets).toHaveLength(0);
  });
});

describe("fusionnerDoublons", () => {
  it("garde l'article du média et y rattache l'alerte Google qui le reprend", () => {
    const articles = [
      { id: "g", titre: "Face aux prix élevés, la FGTB passe à l'action ce vendredi - L'Avenir", source: "Google FGTB", lien: "https://www.lavenir.net/actu/pompes?utm=x", date: null, alerte: true },
      { id: "m", titre: "Face aux prix élevés, la FGTB passe à l'action ce vendredi", source: "L'Avenir", lien: "https://www.lavenir.net/actu/pompes", date: null },
      { id: "r", titre: "L'inflation remonte", source: "RTBF", lien: "https://www.rtbf.be/i", date: null },
    ];
    const f = fusionnerDoublons(articles);
    expect(f.map((a) => a.id)).toEqual(["m", "r"]);
    expect(f[0].doublons).toEqual(["g"]);
    const sujet = { rang: "S" as const, sujet: "x", pourquoi: "", angle: "", format: "article" as const, articles: f };
    expect(idsDuSujet(sujet).sort()).toEqual(["g", "m", "r"]);
  });
});
