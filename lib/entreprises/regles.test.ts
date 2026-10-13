import { describe, expect, it } from "vitest";
import type { CompanyCgLink, Entreprise, Onss, Site, Unite } from "./types";
import {
  blocAdresse, cleDe, construireListe, correspond, ecartsOnss, lireCle, nomAffiche,
  nomManquant, onssACreer, onssDeCompany, planSuppressionSite, REF_DEFAUT,
} from "./regles";

const E: Entreprise = {
  id: "e1", company_id: "c1", nom: null, numero_bce: "0850076920", denomination_bce: "ACME SA",
  siege_rue: "Rue Dewez", siege_numero: "40", siege_boite: "2", siege_code_postal: "5000", siege_localite: "Namur",
  ref_nom: null, ref_fonction: null, ref_email: null, ref_telephone: null, bce_importe_le: null, notes: null,
  autres_company_ids: [],
};
const S: Site = { id: "s2", entreprise_id: "e1", nom: "Usine", principal: false, unite_postale_id: "u1",
  ref_nom: "Mme Martin", ref_fonction: "DRH", ref_email: null, ref_telephone: null, ordre: 1 };
const U: Unite = { id: "u1", entreprise_id: "e1", site_id: "s2", numero_ue: "2000000001", denomination: null,
  rue: "Zoning Nord", numero: "5", boite: null, code_postal: "6700", localite: "Arlon", statut: "actif", date_debut: null, origine: "bce" };
const C: CompanyCgLink = { id: "c1", name: "Acme", sector: "Construction", onss: "123-4567-89", onss2: "222", onss2_label: "Site B",
  onss3: null, onss3_label: null, onss4: "", onss4_label: null };

describe("blocAdresse", () => {
  it("utilise le service RH et le siège par défaut", () => {
    expect(blocAdresse(E, "Acme")).toEqual({
      lignes: [`À l'attention de ${REF_DEFAUT}`, "ACME SA", "Rue Dewez 40 bte 2", "5000 Namur"],
      incomplet: false,
    });
  });
  it("ajoute la fonction quand un nom est donné", () => {
    expect(blocAdresse({ ...E, ref_nom: "M. Dupont", ref_fonction: "Directeur" }, null).lignes.slice(0, 2))
      .toEqual(["À l'attention de M. Dupont", "Directeur"]);
  });
  it("prend la personne et l'adresse postale du site", () => {
    expect(blocAdresse(E, "Acme", S, [U]).lignes).toEqual(["À l'attention de Mme Martin", "DRH", "ACME SA", "Zoning Nord 5", "6700 Arlon"]);
  });
  it("retombe sur l'entreprise si le site n'a rien de propre", () => {
    const vide = { ...S, ref_nom: null, ref_fonction: null, unite_postale_id: null };
    expect(blocAdresse(E, "Acme", vide, [U]).lignes[0]).toBe(`À l'attention de ${REF_DEFAUT}`);
    expect(blocAdresse(E, "Acme", vide, [U]).lignes.at(-1)).toBe("5000 Namur");
  });
  it("signale une adresse incomplète sans inventer de texte", () => {
    const r = blocAdresse({ ...E, siege_rue: null, denomination_bce: null }, "Acme");
    expect(r.incomplet).toBe(true);
    expect(r.lignes).toEqual([`À l'attention de ${REF_DEFAUT}`, "Acme", "5000 Namur"]);
  });
});

describe("noms et clés", () => {
  it("affiche le nom usuel, sinon celui de CG Link", () => {
    expect(nomAffiche({ nom: "Perso" }, { name: "CG" })).toBe("Perso");
    expect(nomAffiche({ nom: null }, { name: "CG" })).toBe("CG");
    expect(nomAffiche(null, null)).toBe("Sans nom");
  });
  it("lit et construit les clés de fiche", () => {
    expect(lireCle("c-3f2a1e4b-0000-4000-8000-000000000001")).toEqual({ type: "company", id: "3f2a1e4b-0000-4000-8000-000000000001" });
    expect(lireCle("3f2a1e4b-0000-4000-8000-000000000001")).toEqual({ type: "fiche", id: "3f2a1e4b-0000-4000-8000-000000000001" });
    expect(lireCle("n'importe quoi")).toBeNull();
    expect(cleDe(null, "abc")).toBe("c-abc");
    expect(cleDe("f1", "abc")).toBe("f1");
  });
});

describe("ONSS", () => {
  it("reprend les numéros de CG Link, chiffres seuls, sans vides", () => {
    expect(onssDeCompany(C)).toEqual([{ numero: "123456789", libelle: null }, { numero: "222", libelle: "Site B" }]);
  });
  it("ne recrée pas un numéro existant (double ouverture simultanée)", () => {
    expect(onssACreer(onssDeCompany(C), [{ numero: "123456789" }])).toEqual([{ numero: "222", libelle: "Site B" }]);
  });
  it("calcule les écarts en tenant compte des valeurs ignorées", () => {
    const ici: Onss[] = [{ id: "o1", entreprise_id: "e1", site_id: null, numero: "999", libelle: null }];
    const r = ecartsOnss(onssDeCompany(C), ici, ["222"]);
    expect(r.manquantsIci).toEqual([{ numero: "123456789", libelle: null }]);
    expect(r.absentsCgLink.map((o) => o.numero)).toEqual(["999"]);
  });
});

describe("planSuppressionSite", () => {
  const P: Site = { ...S, id: "s1", principal: true, nom: "Site principal" };
  it("renvoie vers le site principal", () => {
    expect(planSuppressionSite(S, P)).toEqual({ ok: true, versSite: "s1" });
  });
  it("refuse de supprimer le site principal", () => {
    expect(planSuppressionSite(P, P).ok).toBe(false);
  });
  it("refuse si aucun site principal n'existe", () => {
    expect(planSuppressionSite(S, undefined).ok).toBe(false);
  });
});

describe("construireListe", () => {
  const liste = construireListe({
    companies: [C, { ...C, id: "c2", name: "Beta", onss: null, onss2: null }],
    fiches: [E, { ...E, id: "e2", company_id: null, nom: "Gamma", numero_bce: null }],
    sites: [{ entreprise_id: "e1" }, { entreprise_id: "e1" }],
    unites: [{ entreprise_id: "e1", localite: "Arlon", statut: "actif" }, { entreprise_id: "e1", localite: "Namur", statut: "arrete" }],
    onss: [{ id: "o1", entreprise_id: "e1", site_id: null, numero: "123456789", libelle: null }],
    ignores: [],
    affilies: new Map([["c1", 42]]),
    delegues: new Map([["e1", 3]]),
  });
  it("fusionne CG Link et les fiches, triées par nom", () => {
    expect(liste.map((l) => l.nom)).toEqual(["Acme", "Beta", "Gamma"]);
  });
  it("calcule les compteurs et les états", () => {
    const acme = liste[0];
    expect(acme).toMatchObject({ cle: "e1", affilies: 42, sites: 2, delegues: 3, localites: ["Arlon"], horsCgLink: false, bceManquant: false, ecartsOnss: true });
    expect(liste[1]).toMatchObject({ cle: "c-c2", sites: 0, bceManquant: true, ecartsOnss: false });
    expect(liste[2]).toMatchObject({ cle: "e2", horsCgLink: true, bceManquant: true });
  });
  it("recherche par nom, n° BCE (avec ou sans points), ONSS et localité", () => {
    expect(correspond(liste[0], "acm")).toBe(true);
    expect(correspond(liste[0], "0850.076")).toBe(true);
    expect(correspond(liste[0], "123456")).toBe(true);
    expect(correspond(liste[0], "arlon")).toBe(true);
    expect(correspond(liste[0], "zzz")).toBe(false);
  });
});

describe("nomManquant", () => {
  it("exige un nom pour une fiche hors CG Link", () => {
    expect(nomManquant(null, "  ")).toBe(true);
    expect(nomManquant(null, null)).toBe(true);
    expect(nomManquant(null, "Acme")).toBe(false);
  });
  it("n'exige rien pour une fiche reliée à CG Link", () => {
    expect(nomManquant("c1", null)).toBe(false);
  });
});

describe("construireListe, entreprises regroupées", () => {
  const XLG: CompanyCgLink = { ...C, id: "x1", name: "XLG HOME", onss: "131624343", onss2: null };
  const liste = construireListe({
    companies: [C, XLG],
    fiches: [{ ...E, autres_company_ids: ["x1"] }],
    sites: [], unites: [], onss: [], ignores: [],
    affilies: new Map([["c1", 40], ["x1", 562]]),
    delegues: new Map(),
  });
  it("n'affiche pas l'entreprise regroupée dans une autre fiche", () => {
    expect(liste.map((l) => l.nom)).toEqual(["Acme"]);
  });
  it("additionne les affiliés des entreprises regroupées", () => {
    expect(liste[0].affilies).toBe(602);
  });
});
