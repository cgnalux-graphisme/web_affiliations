import { describe, expect, it } from "vitest";
import { companiesDuPermanent, emailsEgaux, fichesDuPerimetre, secteurDepuisCgLink } from "./perimetre";

describe("emailsEgaux", () => {
  it("ignore la casse et les espaces", () => {
    expect(emailsEgaux(" Martin.Pierrard@accg.be ", "martin.pierrard@accg.be")).toBe(true);
  });
  it("refuse une valeur vide", () => {
    expect(emailsEgaux("", "")).toBe(false);
    expect(emailsEgaux(null, "a@b.be")).toBe(false);
  });
});

describe("companiesDuPermanent", () => {
  const companies = [
    { id: "c1", permanent_email: "magali.houba@accg.be" },
    { id: "c2", permanent_email: "Magali.Houba@accg.be" },
    { id: "c3", permanent_email: "jonathan.hubert@accg.be" },
    { id: "c4", permanent_email: null },
  ];
  it("garde les entreprises dont le permanent est la personne", () => {
    expect([...companiesDuPermanent(companies, "magali.houba@accg.be")]).toEqual(["c1", "c2"]);
  });
  it("aucune entreprise sans e-mail", () => {
    expect(companiesDuPermanent(companies, "").size).toBe(0);
  });
});

describe("fichesDuPerimetre", () => {
  const fiches = [
    { id: "f1", company_id: "c1", autres_company_ids: [] },
    { id: "f2", company_id: "c9", autres_company_ids: ["c2"] }, // regroupe c2 (ex. XLG HOME dans TRIXXO)
    { id: "f3", company_id: null, autres_company_ids: [] }, // hors CG Link : sans permanent
    { id: "f4", company_id: "c3", autres_company_ids: null },
  ];
  it("fiche reliée ou fiche qui regroupe une entreprise du permanent", () => {
    expect([...fichesDuPerimetre(fiches, new Set(["c1", "c2"]))].sort()).toEqual(["f1", "f2"]);
  });
});

describe("secteurDepuisCgLink", () => {
  const secteurs = [
    { id: "s1", nom: "Construction" },
    { id: "s2", nom: "Bois / ameublement" },
    { id: "s3", nom: "Entreprises de travail adapté (ETA)" },
    { id: "s4", nom: "Carrières & matériaux" },
    { id: "s5", nom: "Titres-services" },
  ];
  it("traduit les libellés de CG Link", () => {
    expect(secteurDepuisCgLink("Construction", secteurs)).toBe("s1");
    expect(secteurDepuisCgLink("Bois", secteurs)).toBe("s2");
    expect(secteurDepuisCgLink("ETA", secteurs)).toBe("s3");
    expect(secteurDepuisCgLink("Carrière", secteurs)).toBe("s4");
    expect(secteurDepuisCgLink("Titres-Services", secteurs)).toBe("s5");
  });
  it("rien pour un libellé sans équivalent", () => {
    expect(secteurDepuisCgLink("CP100", secteurs)).toBeNull();
    expect(secteurDepuisCgLink(null, secteurs)).toBeNull();
  });
});
