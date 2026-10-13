import { describe, expect, it } from "vitest";
import { classerAutre, importerMandats, libelleMandat, mandatEnCours, siteParDefaut, validerMandat } from "./mandats";

const organe = (t: string) => {
  const c = classerAutre(t);
  return c.rejete ? "rejete" : `${c.mandat.organe}${c.mandat.qualite ? ":" + c.mandat.qualite : ""}${c.mandat.fonction ? ":" + c.mandat.fonction : ""}`;
};

describe("classerAutre (textes réels de CG Link)", () => {
  it.each([
    ["CE Européen", "cee"],
    ["CE EUROPE", "cee"],
    ["Européen", "cee"],
    ["Effectif Cee", "cee:effectif"],
    ["CE europeen suppleant", "cee:suppleant"],
    ["Suppléant europe", "cee:suppleant"],
    ["Tresorier CEE Eiffage", "cee:Trésorier"],
    ["Comitè  exècutif", "instances_cg"],
    ["Comité Ecécutif CGNalux", "instances_cg"],
    ["Comité exécutif CG", "instances_cg"],
    ["Comité Exécutif, Comité Régional", "instances_cg"],
    ["Vérificateur aux comptes C.G Namur lux", "instances_cg"],
    ["Vice secrétaire bureau des femmes du Luxembourg/ membre du comité exécutif Namur-Luxembourg", "instances_cg"],
    ["Délégué CE", "ce:effectif"],
    ["Secrétaire CE", "ce:effectif:Secrétaire"],
    ["Délégué Permanent Wust", "autre"],
    ["O", "rejete"],
    ["32470000000", "rejete"],
    ["marc andre", "rejete"],
  ])("%s → %s", (texte, attendu) => {
    expect(organe(texte)).toBe(attendu);
  });
  it("garde le texte d'origine en libellé (Instances, Autre) et dans la note à vérifier", () => {
    const c = classerAutre("Délégué Permanent Wust");
    expect(c.rejete).toBe(false);
    if (!c.rejete) {
      expect(c.mandat.libelle).toBe("Délégué Permanent Wust");
      expect(c.mandat.a_verifier).toBe('Repris de « Autre » dans CG Link : "Délégué Permanent Wust"');
    }
  });
});

describe("importerMandats", () => {
  it("range DS, CE, CPPT directement et ignore « Pas de mandat »", () => {
    const r = importerMandats({ id: "u", mandateDs: "Effectif", mandateCe: "Suppléant", mandateCppt: "Pas de mandat", mandateOther: "" });
    expect(r.mandats.map((m) => `${m.organe}:${m.qualite}`)).toEqual(["ds:effectif", "ce:suppleant"]);
    expect(r.mandats.every((m) => m.a_verifier === null)).toBe(true);
    expect(r.rejetes).toEqual([]);
  });
  it("fusionne « Secrétaire CE » dans le mandat CE existant", () => {
    const r = importerMandats({ id: "u", mandateCe: "Effectif", mandateOther: "Secrétaire CE" });
    expect(r.mandats).toHaveLength(1);
    expect(r.mandats[0]).toMatchObject({ organe: "ce", qualite: "effectif", fonction: "Secrétaire" });
    expect(r.mandats[0].a_verifier).toContain("Secrétaire CE");
  });
  it("liste les textes non importés", () => {
    expect(importerMandats({ id: "u", mandateOther: "O" }).rejetes).toEqual(["O"]);
  });
  it("sans aucun champ : aucun mandat", () => {
    expect(importerMandats({ id: "u" })).toEqual({ mandats: [], rejetes: [] });
  });
});

describe("libelleMandat et mandatEnCours", () => {
  it("compose un libellé court", () => {
    expect(libelleMandat({ organe: "ds", qualite: "effectif", libelle: null, fonction: null })).toBe("DS eff.");
    expect(libelleMandat({ organe: "cppt", qualite: "suppleant", libelle: null, fonction: "Secrétaire" })).toBe("CPPT supp. (Secrétaire)");
    expect(libelleMandat({ organe: "instances_cg", qualite: null, libelle: "Comité exécutif", fonction: null })).toBe("Comité exécutif");
    expect(libelleMandat({ organe: "cee", qualite: null, libelle: null, fonction: null })).toBe("CEE");
  });
  it("un mandat sans fin ou finissant aujourd'hui ou plus tard est en cours", () => {
    expect(mandatEnCours({ fin: null }, "2026-10-13")).toBe(true);
    expect(mandatEnCours({ fin: "2026-10-13" }, "2026-10-13")).toBe(true);
    expect(mandatEnCours({ fin: "2026-10-12" }, "2026-10-13")).toBe(false);
  });
});

describe("validerMandat", () => {
  const base = { organe: "ds", qualite: "effectif", libelle: "", fonction: "", site_id: "s1", debut: "13/05/2024", fin: "" };
  it("accepte un mandat complet et convertit les dates", () => {
    expect(validerMandat(base)).toEqual({ ok: true, valeurs: { organe: "ds", qualite: "effectif", libelle: null, fonction: null, site_id: "s1", debut: "2024-05-13", fin: null } });
  });
  it("exige la qualité pour DS, CE, CPPT", () => {
    expect(validerMandat({ ...base, qualite: "" })).toEqual({ ok: false, erreur: "Choisissez effectif ou suppléant." });
  });
  it("exige un libellé pour Autre et Instances CG", () => {
    expect(validerMandat({ ...base, organe: "autre", qualite: "" })).toEqual({ ok: false, erreur: "Précisez le mandat (libellé)." });
  });
  it("refuse un organe inconnu, une date invalide, une fin avant le début", () => {
    expect(validerMandat({ ...base, organe: "xx" }).ok).toBe(false);
    expect(validerMandat({ ...base, debut: "31/02/2024" })).toEqual({ ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" });
    expect(validerMandat({ ...base, fin: "01/01/2024" })).toEqual({ ok: false, erreur: "La fin du mandat ne peut pas précéder son début." });
  });
});

describe("siteParDefaut", () => {
  const sites = [{ id: "p", principal: true }, { id: "s2", principal: false }];
  it("prend le site de l'unité de rattachement", () => {
    expect(siteParDefaut("u1", [{ id: "u1", site_id: "s2" }], sites)).toBe("s2");
  });
  it("sinon le site principal", () => {
    expect(siteParDefaut(null, [], sites)).toBe("p");
    expect(siteParDefaut("u1", [{ id: "u1", site_id: null }], sites)).toBe("p");
    expect(siteParDefaut(null, [], [])).toBeNull();
  });
});
