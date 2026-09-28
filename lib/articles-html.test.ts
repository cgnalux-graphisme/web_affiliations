import { describe, expect, it } from "vitest";
import { nettoyerContenu } from "./articles-html";

describe("nettoyerContenu", () => {
  it("garde la mise en forme de l'éditeur", () => {
    expect(nettoyerContenu("<h2>Titre</h2><p><strong>Gras</strong></p><ul><li><p>Un</p></li></ul>")).toBe(
      "<h2>Titre</h2><p><strong>Gras</strong></p><ul><li><p>Un</p></li></ul>"
    );
  });
  it("retire scripts, styles et liens dangereux", () => {
    const html = nettoyerContenu(
      '<p style="color:red" onclick="x()">A</p><script>alert(1)</script><a href="javascript:alert(1)">B</a><img src=x onerror=alert(1)>'
    );
    expect(html).toBe("<p>A</p><a>B</a>");
  });
  it("ouvre les liens externes dans un nouvel onglet", () => {
    expect(nettoyerContenu('<a href="https://fgtb.be" class="x">F</a>')).toBe(
      '<a href="https://fgtb.be" target="_blank" rel="noopener noreferrer">F</a>'
    );
  });
  it("retire les paragraphes vides", () => {
    expect(nettoyerContenu("<p></p><p>Texte</p>")).toBe("<p>Texte</p>");
  });
});
