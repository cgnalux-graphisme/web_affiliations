import { describe, expect, it } from "vitest";
import { echapperChamps, echapperHtml } from "./echapper-html";

describe("echapperHtml", () => {
  it("neutralise les balises et les guillemets", () => {
    expect(echapperHtml(`<a href="https://piege.be">Cliquez</a> & l'été`)).toBe(
      "&lt;a href=&quot;https://piege.be&quot;&gt;Cliquez&lt;/a&gt; &amp; l&#39;été"
    );
  });

  it("laisse un texte ordinaire intact", () => {
    expect(echapperHtml("Dupont Marie")).toBe("Dupont Marie");
  });
});

describe("echapperChamps", () => {
  it("neutralise seulement les valeurs texte", () => {
    expect(echapperChamps({ nom: "<b>X</b>", montant: null, actif: true })).toEqual({
      nom: "&lt;b&gt;X&lt;/b&gt;",
      montant: null,
      actif: true,
    });
  });
});
