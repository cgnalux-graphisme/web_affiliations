import { beforeAll, describe, expect, it, vi } from "vitest";
import { JETON_QR, empreinteAppareil, lirePasse, nouveauJetonQr, signerPasse } from "./jeton-serveur";
import { adresseDomicile } from "./jour-j-serveur";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "cle-de-test-uniquement";
});

describe("jetons de la page du QR code", () => {
  it("crée des jetons de QR non devinables, au bon format", () => {
    const a = nouveauJetonQr();
    expect(JETON_QR.test(a)).toBe(true);
    expect(a).not.toBe(nouveauJetonQr());
  });

  it("signe et relit un passe", () => {
    const p = lirePasse(signerPasse({ dossier: "d", date: "j", participant: "p" }));
    expect(p).toMatchObject({ dossier: "d", date: "j", participant: "p" });
  });

  it("refuse un passe falsifié ou expiré", () => {
    const passe = signerPasse({ dossier: "d", date: "j", participant: "p" });
    const [corps, sig] = passe.split(".");
    const autre = Buffer.from(JSON.stringify({ dossier: "d", date: "j", participant: "AUTRE", exp: Date.now() + 60_000 })).toString("base64url");
    expect(lirePasse(`${autre}.${sig}`)).toBeNull();
    expect(lirePasse(`${corps}.x${sig.slice(1)}`)).toBeNull();
    expect(lirePasse("n'importe quoi")).toBeNull();
    expect(lirePasse(null)).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31 * 60_000);
    expect(lirePasse(passe)).toBeNull();
    vi.useRealTimers();
  });

  it("ne garde qu'une empreinte de l'adresse IP", () => {
    const e = empreinteAppareil("203.0.113.5");
    expect(e).toHaveLength(32);
    expect(e).not.toContain("203");
    expect(empreinteAppareil("203.0.113.5")).toBe(e);
    expect(empreinteAppareil("203.0.113.6")).not.toBe(e);
  });
});

describe("adresse de départ (domicile)", () => {
  it("compose l'adresse pour Google Maps, ou rien si elle est incomplète", () => {
    expect(adresseDomicile({ adresse_rue: "Rue Haute", adresse_numero: "5", adresse_boite: "2", adresse_code_postal: "5000", adresse_localite: "Namur", adresse_pays: null }))
      .toBe("Rue Haute 5, 5000 Namur, Belgique");
    expect(adresseDomicile({ adresse_rue: "Rue Haute", adresse_numero: null, adresse_boite: null, adresse_code_postal: null, adresse_localite: null, adresse_pays: null })).toBeNull();
    expect(adresseDomicile(null)).toBeNull();
  });
});
