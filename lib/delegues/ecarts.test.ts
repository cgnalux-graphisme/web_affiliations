import { describe, expect, it } from "vitest";
import { calculerEcarts, planReprise } from "./ecarts";
import type { Delegue, Mandat } from "./types";

const J = "2026-10-13";
const D: Delegue = { id: "d", entreprise_id: "e", cglink_user_id: "u", unite_id: null, prenom: "Jean", nom: "Dupont",
  email: "j@x.be", telephone: "+32 (0) 470 12 34 56", notes: null, a_verifier: null,
  adresse_rue: null, adresse_numero: null, adresse_boite: null, adresse_code_postal: null, adresse_localite: null, adresse_pays: null };
const M = (id: string, organe: Mandat["organe"], qualite: Mandat["qualite"], extra: Partial<Mandat> = {}): Mandat =>
  ({ id, delegue_id: "d", site_id: "s", organe, qualite, libelle: null, fonction: null, debut: "2024-05-13", fin: null, a_verifier: null, ...extra });
const E = { id: "u", name: "Jean Dupont", email: "j@x.be", phone: "0470123456", mandateDs: "Effectif", mandateCe: "Pas de mandat", mandateCppt: "", mandateOther: "" };

describe("calculerEcarts", () => {
  it("rien quand tout concorde (téléphone et casse normalisés)", () => {
    expect(calculerEcarts(D, [M("1", "ds", "effectif")], { ...E, email: "J@X.BE" }, [], J)).toEqual([]);
  });
  it("signale nom, e-mail (non envoyable) et mandat différents", () => {
    const r = calculerEcarts(D, [M("1", "ds", "suppleant")], { ...E, name: "Jean Dupond", email: "autre@x.be" }, [], J);
    expect(r.map((e) => `${e.champ}:${e.ici}->${e.cglink}:${e.envoyable}`)).toEqual([
      "nom:Jean Dupont->Jean Dupond:true", "email:j@x.be->autre@x.be:false", "ds:Suppléant->Effectif:true",
    ]);
  });
  it("ignore un écart dont la valeur CG Link a été ignorée, le remontre si elle change", () => {
    const e = { ...E, name: "Jean Dupond" };
    expect(calculerEcarts(D, [M("1", "ds", "effectif")], e, [{ champ: "nom", valeur: "Jean Dupond" }], J)).toEqual([]);
    expect(calculerEcarts(D, [M("1", "ds", "effectif")], { ...e, name: "J. Dupond" }, [{ champ: "nom", valeur: "Jean Dupond" }], J)).toHaveLength(1);
  });
});

describe("planReprise", () => {
  it("nom et téléphone : mise à jour du délégué", () => {
    expect(planReprise("nom", D, [], { ...E, name: "DUPOND Jean" }, J)).toEqual([{ type: "maj_delegue", valeurs: { prenom: "Jean", nom: "DUPOND" } }]);
    expect(planReprise("telephone", D, [], { ...E, phone: "081649963" }, J)).toEqual([{ type: "maj_delegue", valeurs: { telephone: "+32 (0) 81 64 99 63" } }]);
  });
  it("« Pas de mandat » dans CG Link : termine les mandats en cours (jamais supprimés)", () => {
    expect(planReprise("ds", D, [M("1", "ds", "effectif"), M("2", "ds", "suppleant", { fin: "2025-01-01" })], { ...E, mandateDs: "Pas de mandat" }, J))
      .toEqual([{ type: "terminer", ids: ["1"], fin: J }]);
  });
  it("autre qualité : modifie le mandat en cours, ou en ajoute un", () => {
    expect(planReprise("ds", D, [M("1", "ds", "suppleant")], E, J)).toEqual([{ type: "qualite", id: "1", qualite: "effectif" }]);
    expect(planReprise("ce", D, [], { ...E, mandateCe: "Suppléant" }, J)).toEqual([{ type: "ajouter", mandat: {
      organe: "ce", qualite: "suppleant", libelle: null, fonction: null, debut: J, a_verifier: "Repris de CG Link le 13/10/2026" } }]);
  });
  it("autre : classe le texte, refuse ce qui n'est pas un mandat", () => {
    expect(planReprise("autre", D, [], { ...E, mandateOther: "Comité exécutif" }, J)[0]).toMatchObject({ type: "ajouter", mandat: { organe: "instances_cg", libelle: "Comité exécutif" } });
    expect(planReprise("autre", D, [], { ...E, mandateOther: "O" }, J)).toEqual([{ type: "erreur", erreur: "Le texte de CG Link n'est pas reconnu comme un mandat : ajoutez-le à la main." }]);
  });
});
