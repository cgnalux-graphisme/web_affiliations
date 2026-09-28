import { describe, expect, it } from "vitest";
import { construireBrouillon, messageSource, type ReponseIA } from "./redaction-ia";

const item = {
  titre: "Les mutuelles critiquent le gouvernement",
  resume: "Selon une étude publiée ce lundi…",
  lien: "https://www.rtbf.be/article/mutuelles-123",
  source_nom: "RTBF Info",
};

const reponse: ReponseIA = {
  titre: "  Incapacité : les mutuelles  sonnent l'alarme ",
  chapo: "Le gouvernement veut « responsabiliser » les mutuelles.\nDécryptage.",
  points_cles: [" Les mutuelles réagissent ", "", "Une étude publiée lundi"],
  contenu_html: '<h2>Ce qui se passe</h2><p>Texte <script>alert(1)</script><a href="javascript:x()">lien</a></p>',
  autres_liens: ["https://www.rtbf.be/article/mutuelles-123", "https://www.mc.be/etude", "pas un lien", "https://www.mc.be/etude"],
  suggestion_image: " Une salle d'attente de mutuelle. ",
  source_suffisante: true,
  avertissement: "",
};

describe("construireBrouillon", () => {
  const b = construireBrouillon(reponse, item);

  it("nettoie le titre et en déduit l'adresse", () => {
    expect(b.titre).toBe("Incapacité : les mutuelles sonnent l'alarme");
    expect(b.slug).toBe("incapacite-les-mutuelles-sonnent-l-alarme");
  });

  it("met le lien d'origine en première source, sans doublon ni lien invalide", () => {
    expect(b.sources).toBe("RTBF Info – https://www.rtbf.be/article/mutuelles-123\nhttps://www.mc.be/etude");
  });

  it("met les points clés au format du formulaire", () => {
    expect(b.points_cles).toBe("Les mutuelles réagissent\nUne étude publiée lundi");
  });

  it("nettoie le HTML du contenu", () => {
    expect(b.contenu).toBe("<h2>Ce qui se passe</h2><p>Texte <a>lien</a></p>");
  });

  it("n'avertit pas quand la source suffit", () => {
    expect(b.avertissement).toBeNull();
    expect(b.suggestion_image).toBe("Une salle d'attente de mutuelle.");
  });

  it("avertit quand la source est trop maigre", () => {
    expect(construireBrouillon({ ...reponse, source_suffisante: false }, item).avertissement).toMatch(/trop maigre/);
    expect(construireBrouillon({ ...reponse, avertissement: "Il manque les chiffres." }, item).avertissement).toBe(
      "Il manque les chiffres."
    );
  });
});

describe("messageSource", () => {
  it("balise la source comme donnée et signale un résumé absent", () => {
    const m = messageSource({ ...item, resume: null });
    expect(m).toContain("<lien>https://www.rtbf.be/article/mutuelles-123</lien>");
    expect(m).toContain("(aucun résumé fourni par le flux)");
  });
});
