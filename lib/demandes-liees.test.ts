import { describe, expect, it } from "vitest";
import { demandesLiees, emailNormalise, nissChiffres, type Candidate } from "./demandes-liees";

// Données fictives uniquement.
const ref: Candidate = {
  type: "affiliation",
  id: "a1",
  created_at: "2026-09-24T08:00:00Z",
  nom: "Test",
  prenom: "Alex",
  email: "Alex.Test@exemple.be ",
  niss: "85.07.30-033.61",
};
const c = (x: Partial<Candidate>): Candidate => ({ ...ref, id: "x", email: null, niss: null, ...x });

describe("demandes-liees", () => {
  it("normalise NISS et e-mail", () => {
    expect(nissChiffres("85.07.30-033.61")).toBe("85073003361");
    expect(nissChiffres("123")).toBeNull();
    expect(emailNormalise(" A@B.be ")).toBe("a@b.be");
    expect(emailNormalise("pas-un-mail")).toBeNull();
  });

  it("rapproche par NISS (formats différents) ou e-mail, jamais par le nom seul", () => {
    const r = demandesLiees(ref, [
      c({ type: "c1", id: "c1", niss: "85073003361", created_at: "2026-09-24T08:10:00Z" }),
      c({ type: "c32", id: "c32", email: "alex.test@exemple.be", created_at: "2026-09-20T08:00:00Z" }),
      c({ type: "sepa", id: "homonyme" }),
      c({ type: "affiliation", id: "a1", niss: "85073003361" }),
    ]);
    expect(r.map((l) => [l.id, l.raison, l.memeDossier])).toEqual([
      ["c1", "niss", true],
      ["c32", "email", false],
    ]);
  });

  it("rien sans NISS ni e-mail", () => {
    expect(demandesLiees({ ...ref, niss: null, email: null }, [c({ niss: "85073003361" })])).toEqual([]);
  });
});
