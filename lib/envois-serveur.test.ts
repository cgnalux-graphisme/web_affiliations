import { afterEach, describe, expect, it, vi } from "vitest";
import type { Resend } from "resend";
import { destinatairesInternes, envoyerEtJournaliser, lireRefs } from "./envois-serveur";
import { DESTINATAIRES_DEFAUT } from "./envois";

// Données fictives uniquement ; sans clé service_role, aucune lecture ni écriture en base.
const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

afterEach(() => vi.unstubAllEnvs());

describe("envois-serveur", () => {
  it("ne garde que des références de demande valides", () => {
    expect(lireRefs({ type: "c1", id: ID })).toEqual([{ type: "c1", id: ID }]);
    expect(lireRefs([{ type: "c1", id: ID }, { type: "web_c1", id: ID }, { type: "c32", id: "pas-un-uuid" }, null])).toEqual([
      { type: "c1", id: ID },
    ]);
    expect(lireRefs(undefined)).toEqual([]);
  });

  it("adresses par défaut si la base n'est pas joignable", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await destinatairesInternes("c1")).toEqual(DESTINATAIRES_DEFAUT.c1);
  });

  it("envoie un e-mail par destinataire et rapporte chaque résultat", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const send = vi.fn(async ({ to }: { to: string[] }) =>
      to[0] === "b@exemple.be" ? { data: null, error: { name: "validation_error", message: "Adresse refusée" } } : { data: { id: "r1" }, error: null }
    );
    const resend = { emails: { send } } as unknown as Resend;
    const r = await envoyerEtJournaliser(resend, {
      envoi: "c1",
      refs: [{ type: "c1", id: ID }],
      recipients: ["A@exemple.be", "b@exemple.be", "a@exemple.be"],
      subject: "Sujet",
      html: "<p>x</p>",
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(r.envois).toEqual([
      { to: "a@exemple.be", id: "r1", erreur: null },
      { to: "b@exemple.be", id: null, erreur: "Adresse refusée" },
    ]);
    expect(r.error).not.toBeNull();
  });
});
