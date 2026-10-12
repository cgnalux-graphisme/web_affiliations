import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyserAdresse, analyserEntite, analyserUnites, dateTexteVersIso } from "./analyse";

const fixture = (f: string) => readFileSync(join(__dirname, "__fixtures__", f), "utf8");

describe("dateTexteVersIso", () => {
  it("convertit les dates en toutes lettres", () => {
    expect(dateTexteVersIso("1 janvier 2008")).toBe("2008-01-01");
    expect(dateTexteVersIso("25 octobre 1982")).toBe("1982-10-25");
    expect(dateTexteVersIso("1er février 2022")).toBe("2022-02-01");
    expect(dateTexteVersIso("19 août 2003")).toBe("2003-08-19");
    expect(dateTexteVersIso("3 décembre 1999")).toBe("1999-12-03");
  });
  it("renvoie null sinon", () => {
    expect(dateTexteVersIso("Pas de données")).toBeNull();
    expect(dateTexteVersIso("31 février 2022")).toBeNull();
  });
});

describe("analyserAdresse", () => {
  it("sépare rue et numéro", () => {
    expect(analyserAdresse("Rue Dewez&nbsp;\n 40/42<br/>5000&nbsp;\n Namur<br/>Depuis le 1 janvier 2008")).toEqual({
      rue: "Rue Dewez", numero: "40/42", boite: null, code_postal: "5000", localite: "Namur",
    });
  });
  it("retire la localité collée devant la rue", () => {
    expect(analyserAdresse("Libramont,Rue Fonteny Maroy&nbsp;13<br/>6800&nbsp;Libramont-Chevigny")).toMatchObject({
      rue: "Rue Fonteny Maroy", numero: "13", localite: "Libramont-Chevigny",
    });
    expect(analyserAdresse("Marche, Rue des Brasseurs&nbsp;13<br/>6900&nbsp;Marche-en-Famenne").rue).toBe("Rue des Brasseurs");
  });
  it("garde une virgule qui n'est pas une localité", () => {
    expect(analyserAdresse("Zoning Nord, Allée 3&nbsp;5<br/>6700&nbsp;Arlon").rue).toBe("Zoning Nord, Allée 3");
  });
  it("lit la boîte et ignore une boîte vide « . »", () => {
    expect(analyserAdresse("Edingensesteenweg&nbsp;\n196&nbsp;\nBoîte&nbsp;.<br/>1500&nbsp;Halle").boite).toBeNull();
    expect(analyserAdresse("Rue X&nbsp;5&nbsp;Boîte&nbsp;B2<br/>5000&nbsp;Namur").boite).toBe("B2");
  });
  it("supporte une rue sans numéro", () => {
    expect(analyserAdresse("Zoning industriel<br/>6900&nbsp;Marche-en-Famenne")).toMatchObject({ rue: "Zoning industriel", numero: null });
  });
});

describe("analyserEntite", () => {
  it("lit la dénomination et le siège", () => {
    expect(analyserEntite(fixture("accg-entite.html"))).toEqual({
      denomination: "CENTRALE GENERALE FGTB Namur-Luxembourg",
      siege: { rue: "Rue Fonteny Maroy", numero: "13", boite: null, code_postal: "6800", localite: "Libramont-Chevigny" },
    });
  });
  it("reconnaît un numéro inexistant", () => {
    expect(analyserEntite(fixture("inconnu-entite.html"))).toBe("inconnu");
  });
  it("renvoie null pour une page méconnaissable", () => {
    expect(analyserEntite("<html><body>Maintenance</body></html>")).toBeNull();
  });
});

describe("analyserUnites", () => {
  it("lit les 4 unités de l'ACCG", () => {
    const r = analyserUnites(fixture("accg-unites.html"))!;
    expect(r.total).toBe(4);
    expect(r.unites).toHaveLength(4);
    expect(r.unites[0]).toEqual({
      numero_ue: "2235300266", statut: "actif", date_debut: "2008-01-01",
      denomination: "CENTRALE GENERALE FGTB Namur-Luxembourg SASPJ",
      rue: "Rue Dewez", numero: "40/42", boite: null, code_postal: "5000", localite: "Namur",
    });
    expect(r.unites[3]).toMatchObject({ numero_ue: "2344397156", localite: "Arlon", rue: "Rue des Martyrs", numero: "80" });
  });
  it("lit une liste paginée", () => {
    const p1 = analyserUnites(fixture("colruyt-unites-p1.html"))!;
    const p2 = analyserUnites(fixture("colruyt-unites-p2.html"))!;
    expect(p1.total).toBe(38);
    expect(p1.parPage).toBe(20);
    expect(p1.unites).toHaveLength(20);
    expect(p2.unites).toHaveLength(18);
    expect(p1.unites[0]).toMatchObject({ numero_ue: "2102363449", rue: "Edingensesteenweg", numero: "196", boite: null, code_postal: "1500", localite: "Halle" });
  });
  it("renvoie null pour une page méconnaissable", () => {
    expect(analyserUnites("<html></html>")).toBeNull();
  });
});
