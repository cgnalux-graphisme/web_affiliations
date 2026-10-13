import { describe, expect, it } from "vitest";
import { champsAEnvoyer, deplacerEntree, fusionnerEntree, lireReponseFonction, versCgLink } from "./cglink";

const J = "2026-10-13";
const m = (organe: string, qualite: string | null, extra: Record<string, unknown> = {}) =>
  ({ organe, qualite, libelle: null, fonction: null, fin: null, ...extra }) as Parameters<typeof versCgLink>[1][number];

describe("versCgLink", () => {
  it("donne Effectif / Suppléant / Pas de mandat par organe, effectif prioritaire", () => {
    const r = versCgLink({ prenom: "Jean", nom: "Dupont", telephone: "+32 (0) 470 12 34 56" },
      [m("ds", "suppleant"), m("ds", "effectif"), m("cppt", "suppleant")], J);
    expect(r).toEqual({ name: "Jean Dupont", phone: "+32 (0) 470 12 34 56", mandateDs: "Effectif", mandateCe: "Pas de mandat", mandateCppt: "Suppléant", mandateOther: "" });
  });
  it("ignore les mandats terminés", () => {
    expect(versCgLink({ prenom: null, nom: "D", telephone: null }, [m("ce", "effectif", { fin: "2026-10-12" })], J).mandateCe).toBe("Pas de mandat");
  });
  it("écrit les autres mandats et les fonctions dans mandateOther", () => {
    const r = versCgLink({ prenom: null, nom: "D", telephone: null }, [
      m("cee", "effectif"), m("instances_cg", null, { libelle: "Comité exécutif" }), m("autre", null, { libelle: "SIPP" }),
      m("ce", "effectif", { fonction: "Secrétaire" }),
    ], J);
    expect(r.mandateOther).toBe("CEE effectif ; Instances CG : Comité exécutif ; SIPP ; Secrétaire (CE)");
    expect(r.mandateCe).toBe("Effectif");
  });
});

describe("fusionnerEntree", () => {
  const ds = [
    { id: "a", name: "A", email: "a@x.be", isActive: true, mustChangePassword: false, acceptedRgpd: true, invitedAt: 1 },
    { id: "b", name: "B", email: "b@x.be" },
  ];
  it("ne modifie que l'entrée visée et conserve ses autres champs", () => {
    const r = fusionnerEntree(ds, "a", { name: "A2", phone: "+32" })!;
    expect(r[0]).toEqual({ id: "a", name: "A2", email: "a@x.be", isActive: true, mustChangePassword: false, acceptedRgpd: true, invitedAt: 1, phone: "+32" });
    expect(r[1]).toBe(ds[1]);
  });
  it("n'écrit jamais l'e-mail", () => {
    expect(fusionnerEntree(ds, "a", { email: "autre@x.be" })![0].email).toBe("a@x.be");
  });
  it("renvoie null si l'entrée n'existe pas", () => {
    expect(fusionnerEntree(ds, "z", { name: "Z" })).toBeNull();
  });
});

describe("deplacerEntree", () => {
  it("retire de la source, ajoute (ou remplace) dans la cible", () => {
    const r = deplacerEntree([{ id: "a", name: "A" }, { id: "b" }], [{ id: "c" }], "a")!;
    expect(r.source.map((d) => d.id)).toEqual(["b"]);
    expect(r.cible.map((d) => d.id)).toEqual(["c", "a"]);
    expect(deplacerEntree([{ id: "b" }], [{ id: "a", name: "ancien" }], "z")).toBeNull();
  });
});

describe("lireReponseFonction", () => {
  it("lit le succès et l'identifiant", () => {
    expect(lireReponseFonction(200, { success: true, userId: "u1" })).toEqual({ ok: true, userId: "u1" });
  });
  it("rend le message de CG Link, sinon un message générique", () => {
    expect(lireReponseFonction(400, { error: "User already registered" })).toEqual({ ok: false, erreur: "CG Link a refusé : User already registered" });
    expect(lireReponseFonction(500, null)).toEqual({ ok: false, erreur: "CG Link n'a pas répondu correctement. Réessayez dans un instant." });
    expect(lireReponseFonction(401, {})).toEqual({ ok: false, erreur: "Votre session a expiré. Reconnectez-vous puis réessayez." });
  });
});

describe("champsAEnvoyer", () => {
  it("n'efface jamais dans CG Link un téléphone vide ici", () => {
    const c = { name: "J D", phone: "", mandateDs: "Effectif", mandateCe: "Pas de mandat", mandateCppt: "Pas de mandat", mandateOther: "" };
    expect(champsAEnvoyer(c)).toEqual({ name: "J D", mandateDs: "Effectif", mandateCe: "Pas de mandat", mandateCppt: "Pas de mandat", mandateOther: "" });
    expect(champsAEnvoyer({ ...c, phone: "+32 (0) 470 12 34 56" }).phone).toBe("+32 (0) 470 12 34 56");
  });
});
