import { describe, expect, it } from "vitest";
import { buildLivraisonPersonnelleHtml } from "./onem-email-html";

describe("buildLivraisonPersonnelleHtml", () => {
  it("affiche le nom sans laisser passer de balise", () => {
    const html = buildLivraisonPersonnelleHtml({
      nom: "<script>",
      prenom: "Ada",
      emailDeclarant: "ada@exemple.be",
      documents: ["Formulaire C1"],
      adminEmail: "admin@exemple.be",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Formulaire C1");
    expect(html).toContain("ada@exemple.be");
  });
});
