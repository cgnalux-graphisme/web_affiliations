import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ERREUR_BCE_INCOMPLET, ERREUR_BCE_INCONNU, ERREUR_BCE_INJOIGNABLE, ERREUR_BCE_PAGE, lireBce } from "./lecture-serveur";

const fixture = (f: string) => readFileSync(join(__dirname, "__fixtures__", f), "utf8");

function faux(pages: Record<string, string | Error | number>): typeof fetch {
  return (async (url: string | URL) => {
    const u = String(url);
    const cle = Object.keys(pages).find((k) => u.includes(k));
    const v = cle ? pages[cle] : 404;
    if (v instanceof Error) throw v;
    if (typeof v === "number") return new Response("", { status: v });
    return new Response(v, { status: 200 });
  }) as typeof fetch;
}

describe("lireBce", () => {
  it("lit l'entité et toutes les pages d'unités", async () => {
    const r = await lireBce("0400378485", faux({
      "zoeknummerform": fixture("accg-entite.html"),
      "page=2": fixture("colruyt-unites-p2.html"),
      "vestiginglijst": fixture("colruyt-unites-p1.html"),
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.unites).toHaveLength(38);
  });
  it("signale un numéro inconnu", async () => {
    const r = await lireBce("0123456749", faux({ zoeknummerform: fixture("inconnu-entite.html") }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INCONNU });
  });
  it("signale une BCE injoignable (erreur réseau ou délai)", async () => {
    const r = await lireBce("0850076920", faux({ zoeknummerform: new Error("timeout") }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INJOIGNABLE });
  });
  it("signale un statut HTTP d'erreur (blocage, maintenance)", async () => {
    const r = await lireBce("0850076920", faux({ zoeknummerform: 503 }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INJOIGNABLE });
  });
  it("signale une page méconnaissable", async () => {
    const r = await lireBce("0850076920", faux({ zoeknummerform: "<html>autre</html>" }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_PAGE });
  });
});

describe("lireBce, garde-fous", () => {
  it("respecte un budget global de temps", async () => {
    const lent = ((_: string, init?: RequestInit) =>
      new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("abort"))))) as unknown as typeof fetch;
    const debut = Date.now();
    const r = await lireBce("0850076920", lent, 80);
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INJOIGNABLE });
    expect(Date.now() - debut).toBeLessThan(2000);
  });
  it("refuse une liste d'unités incomplète au lieu de la présenter comme complète", async () => {
    // La page 2 renvoie toujours la page 1 : mêmes numéros, la liste n'atteint jamais 38.
    const r = await lireBce("0400378485", faux({
      zoeknummerform: fixture("accg-entite.html"),
      vestiginglijst: fixture("colruyt-unites-p1.html"),
    }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INCOMPLET });
  });
});
