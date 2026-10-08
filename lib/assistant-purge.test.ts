import { describe, expect, it } from "vitest";
import { limiteConservation, purgerDemandesChatbot, suppressionPrevue } from "./assistant-purge";
import { DUREE_DEMANDES, DUREE_DEMANDES_MOIS } from "./vie-privee";

describe("conservation des demandes de l'Assistant CG", () => {
  it("la page et la suppression utilisent la même durée", () => {
    expect(DUREE_DEMANDES).toBe(`${DUREE_DEMANDES_MOIS} mois`);
  });

  it("supprime ce qui a été traité avant la limite (12 mois avant aujourd'hui)", () => {
    expect(limiteConservation(new Date("2027-10-08T06:00:00Z"), 12).toISOString()).toBe("2026-10-08T06:00:00.000Z");
  });

  it("annonce la date de suppression d'une demande traitée", () => {
    expect(suppressionPrevue("2026-10-08T14:05:00Z", 12).toISOString()).toBe("2027-10-08T14:05:00.000Z");
  });

  it("ne supprime que les demandes « traite » dont la date de traitement est dépassée", async () => {
    const appels: string[] = [];
    const requete = {
      delete: () => (appels.push("delete"), requete),
      eq: (c: string, v: string) => (appels.push(`eq ${c}=${v}`), requete),
      lt: (c: string, v: string) => (appels.push(`lt ${c}<${v}`), requete),
      select: () => Promise.resolve({ data: [{ id: "a" }, { id: "b" }], error: null }),
    };
    const supabase = { from: (t: string) => (appels.push(`from ${t}`), requete) };
    const r = await purgerDemandesChatbot(supabase as never, new Date("2027-10-08T06:00:00Z"));
    expect(r).toEqual({ supprimees: 2 });
    expect(appels).toEqual([
      "from site_chatbot_demandes",
      "delete",
      "eq statut=traite",
      "lt traite_le<2026-10-08T06:00:00.000Z",
    ]);
  });

  it("sans la colonne traite_le (migration pas exécutée), ne supprime rien et le signale", async () => {
    const requete = {
      delete: () => requete,
      eq: () => requete,
      lt: () => requete,
      select: () => Promise.resolve({ data: null, error: { code: "42703" } }),
    };
    const r = await purgerDemandesChatbot({ from: () => requete } as never);
    expect(r).toEqual({ erreur: "colonne traite_le absente (migration à exécuter)" });
  });
});
