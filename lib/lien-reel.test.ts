import { describe, expect, it } from "vitest";
import { cleTitre, cleUrl, estLienGoogle, idGoogle, lireReponseGoogle, memeArticle } from "./lien-reel";

const GOOGLE = "https://news.google.com/rss/articles/CBMinAFBVV95cUxQ?oc=5";

describe("liens d'alerte Google", () => {
  it("reconnaît un lien Google Actualités et en extrait l'identifiant", () => {
    expect(estLienGoogle(GOOGLE)).toBe(true);
    expect(estLienGoogle("https://www.lavenir.net/actu/x")).toBe(false);
    expect(idGoogle(GOOGLE)).toBe("CBMinAFBVV95cUxQ");
  });

  it("lit l'adresse réelle dans la réponse de Google", () => {
    const reponse = `)]}'\n\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.bruxellestoday.be/actualite/x.html\\",1]",null,null,null,"generic"],["di",10]]`;
    expect(lireReponseGoogle(reponse)).toBe("https://www.bruxellestoday.be/actualite/x.html");
    expect(lireReponseGoogle(`)]}'\n\n[["wrb.fr","Fbv4je",null,null,null,[3],"generic"]]`)).toBeNull();
    expect(lireReponseGoogle("n'importe quoi")).toBeNull();
  });
});

describe("doublons", () => {
  it("compare les adresses sans www, paramètres ni barre finale", () => {
    expect(cleUrl("https://www.lavenir.net/actu/a/?utm=1#x")).toBe(cleUrl("http://lavenir.net/actu/a"));
  });

  it("retire le nom du média du titre d'une alerte Google", () => {
    expect(cleTitre("Face aux prix élevés, la FGTB passe à l'action - L'Avenir", true)).toBe(
      cleTitre("Face aux prix élevés, la FGTB passe à l’action")
    );
  });

  it("repère l'article d'un média repris par une alerte Google", () => {
    const media = { lien: "https://www.lavenir.net/actu/pompes", titre: "Face aux prix élevés, la FGTB passe à l'action ce vendredi" };
    const alerte = { lien: GOOGLE, titre: "Face aux prix élevés, la FGTB passe à l'action ce vendredi - L'Avenir", alerte: true };
    expect(memeArticle(media, alerte)).toBe(true);
    expect(memeArticle(media, { ...alerte, titre: "Grève dans les pompes - DH" })).toBe(false);
  });
});
