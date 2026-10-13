import { describe, expect, it } from "vitest";
import { DEBUT_MANDATS_IMPORTES, importerUnDelegue, planImport, type CompanyImport, type FicheImport } from "./import";

const d = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: "Jean Dupont", email: `${id}@exemple.be`, phone: "", ...extra });
const fiches: FicheImport[] = [
  { id: "fA", company_id: "A", autres_company_ids: ["X"], site_principal_id: "sA" },
  { id: "fB", company_id: "B", autres_company_ids: [], site_principal_id: "sB" },
];

describe("planImport", () => {
  it("crée les délégués avec leurs mandats au site principal, début 13/05/2024", () => {
    const companies: CompanyImport[] = [{ id: "A", name: "ACME", delegates: [d("u1", { mandateDs: "Effectif", phone: "0470 00 00 00" })] }];
    const p = planImport({ companies, fiches, dejaImportes: new Set(), companyDuProfil: new Map() });
    expect(p.delegues).toHaveLength(1);
    expect(p.delegues[0]).toMatchObject({ entreprise_id: "fA", cglink_user_id: "u1", prenom: "Jean", nom: "Dupont", telephone: "+32 (0) 470 00 00 00", a_verifier: null });
    expect(p.delegues[0].mandats).toEqual([
      { organe: "ds", qualite: "effectif", libelle: null, fonction: null, a_verifier: null, site_id: "sA", debut: DEBUT_MANDATS_IMPORTES },
    ]);
  });
  it("importe le délégué d'une entreprise regroupée dans la fiche qui la regroupe (XLG HOME → TRIXXO)", () => {
    const p = planImport({ companies: [{ id: "X", name: "XLG", delegates: [d("u2")] }], fiches, dejaImportes: new Set(), companyDuProfil: new Map() });
    expect(p.delegues[0].entreprise_id).toBe("fA");
  });
  it("ne recrée pas un délégué déjà importé", () => {
    const p = planImport({ companies: [{ id: "A", name: "ACME", delegates: [d("u1")] }], fiches, dejaImportes: new Set(["u1"]), companyDuProfil: new Map() });
    expect(p.delegues).toEqual([]);
    expect(p.dejaPresents).toBe(1);
  });
  it("délégué dans deux entreprises : celle du profil, marqué à vérifier avec l'autre nom", () => {
    const companies: CompanyImport[] = [
      { id: "A", name: "MARLUX", delegates: [d("u3")] },
      { id: "B", name: "REMACLE", delegates: [d("u3")] },
    ];
    const p = planImport({ companies, fiches, dejaImportes: new Set(), companyDuProfil: new Map([["u3", "B"]]) });
    expect(p.delegues).toHaveLength(1);
    expect(p.delegues[0].entreprise_id).toBe("fB");
    expect(p.delegues[0].a_verifier).toBe("Aussi listé chez MARLUX dans CG Link");
  });
  it("cumule la note du nom et celle des deux entreprises", () => {
    const companies: CompanyImport[] = [
      { id: "A", name: "MARLUX", delegates: [d("u4", { name: "Marie Claire Van Damme" })] },
      { id: "B", name: "REMACLE", delegates: [d("u4", { name: "Marie Claire Van Damme" })] },
    ];
    const p = planImport({ companies, fiches, dejaImportes: new Set(), companyDuProfil: new Map() });
    expect(p.delegues[0].entreprise_id).toBe("fA");
    expect(p.delegues[0].a_verifier).toBe("Découpage prénom / nom à confirmer ; Aussi listé chez REMACLE dans CG Link");
  });
  it("signale les entreprises sans fiche et les textes non importés", () => {
    const p = planImport({
      companies: [{ id: "Z", name: "INCONNUE", delegates: [d("u5")] }, { id: "B", name: "REMACLE", delegates: [d("u6", { mandateOther: "O" })] }],
      fiches, dejaImportes: new Set(), companyDuProfil: new Map(),
    });
    expect(p.sansFiche).toEqual(["INCONNUE"]);
    expect(p.rejetes).toEqual([{ entreprise: "REMACLE", texte: "O" }]);
    expect(p.delegues.map((x) => x.cglink_user_id)).toEqual(["u6"]);
  });
});

describe("importerUnDelegue", () => {
  const d = { entreprise_id: "f", cglink_user_id: "u", prenom: "J", nom: "D", email: null, telephone: null, a_verifier: null,
    mandats: [{ organe: "ds" as const, qualite: "effectif" as const, libelle: null, fonction: null, a_verifier: null, site_id: "s", debut: DEBUT_MANDATS_IMPORTES }] };
  it("annule le délégué si ses mandats n'ont pas pu être enregistrés (un nouvel import le reprendra)", async () => {
    const supprimes: string[] = [];
    const r = await importerUnDelegue(d, {
      insererDelegue: async () => ({ id: "x" }),
      insererMandats: async () => false,
      supprimerDelegue: async (id) => { supprimes.push(id); },
    });
    expect(r).toBe("erreur");
    expect(supprimes).toEqual(["x"]);
  });
  it("compte un délégué créé avec ses mandats, ou déjà présent", async () => {
    const ops = { insererMandats: async () => true, supprimerDelegue: async () => {} };
    expect(await importerUnDelegue(d, { ...ops, insererDelegue: async () => ({ id: "x" }) })).toBe("cree");
    expect(await importerUnDelegue(d, { ...ops, insererDelegue: async () => ({ id: null }) })).toBe("deja");
    expect(await importerUnDelegue(d, { ...ops, insererDelegue: async () => "erreur" })).toBe("erreur");
  });
});
