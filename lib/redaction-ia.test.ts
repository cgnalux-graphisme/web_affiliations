import { describe, expect, it } from "vitest";
import {
  construireBrouillon,
  contientReprise,
  empreintesSource,
  marquerReprises,
  messageSource,
  raisonLecture,
  type ReponseIA,
} from "./redaction-ia";

const item = {
  titre: "Les mutuelles critiquent le gouvernement",
  resume: "Selon une étude publiée ce lundi…",
  lien: "https://www.rtbf.be/article/mutuelles-123",
  source_nom: "RTBF Info",
};

const ARTICLE =
  "Selon une nouvelle étude publiée ce lundi matin par la Mutualité chrétienne, près d'une personne en invalidité sur trois souhaite reprendre le travail. " +
  "« Notre travail, c'est d'accompagner, pas de sanctionner », estime la directrice.";

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
  const b = construireBrouillon(reponse, item, { source: "article" }, ARTICLE);

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

  it("n'avertit pas quand l'article est lu et la source suffit", () => {
    expect(b.avertissement).toBeNull();
    expect(b.source_lue).toBe("article");
    expect(b.suggestion_image).toBe("Une salle d'attente de mutuelle.");
  });

  it("avertit quand la source est maigre ou l'article non lu", () => {
    expect(construireBrouillon({ ...reponse, source_suffisante: false }, item, { source: "article" }).avertissement).toMatch(/trop maigre/);
    const nonLu = construireBrouillon(reponse, item, { source: "flux", raison: raisonLecture("url_not_accessible") });
    expect(nonLu.source_lue).toBe("flux");
    expect(nonLu.avertissement).toMatch(/non lu \(page inaccessible/);
  });

  it("met en italique une phrase recopiée que l'IA a oublié de marquer", () => {
    const copie = construireBrouillon(
      {
        ...reponse,
        contenu_html:
          "<p>Une étude est sortie. Près d'une personne en invalidité sur trois souhaite reprendre le travail. Et après ?</p>",
      },
      item,
      { source: "article" },
      ARTICLE
    );
    expect(copie.contenu).toBe(
      "<p>Une étude est sortie. <em>Près d'une personne en invalidité sur trois souhaite reprendre le travail.</em> Et après ?</p>"
    );
    expect(copie.reprises).toBe(1);
  });

  it("signale une reprise dans le chapô", () => {
    const c = construireBrouillon(
      { ...reponse, chapo: "Près d'une personne en invalidité sur trois souhaite reprendre le travail, dit l'étude." },
      item,
      { source: "article" },
      ARTICLE
    );
    expect(c.avertissement).toMatch(/Reprise mot pour mot dans le chapô/);
  });
});

describe("marquerReprises", () => {
  const empreintes = empreintesSource(ARTICLE);

  it("ne touche pas une citation déjà en italique", () => {
    const html = "<p><em>« Notre travail, c'est d'accompagner, pas de sanctionner »</em>, dit-elle.</p>";
    expect(marquerReprises(html, empreintes)).toEqual({ html, reprises: 0 });
  });

  it("ignore les formules courtes communes", () => {
    expect(contientReprise("Selon une nouvelle étude publiée ce lundi, rien.", empreintes)).toBe(false);
  });

  it("ne marque rien sans texte source", () => {
    expect(marquerReprises("<p>Texte</p>", new Set())).toEqual({ html: "<p>Texte</p>", reprises: 0 });
  });
});

describe("messageSource", () => {
  it("joint le texte collé, balisé comme donnée", () => {
    const m = messageSource(item, "extrait", "  Mes notes : réunion le 14/10.  ");
    expect(m).toContain("<texte_colle>\nMes notes : réunion le 14/10.\n</texte_colle>");
    expect(m).toContain("N'utilise pas d'outil de lecture");
    expect(messageSource(item, "site", "ignoré")).not.toContain("<texte_colle>");
  });

  it("met en italique une reprise du texte collé", () => {
    const b = construireBrouillon(
      { ...reponse, contenu_html: "<p>Près d'une personne en invalidité sur trois souhaite reprendre le travail.</p>" },
      item,
      { source: "extrait" },
      ARTICLE
    );
    expect(b.contenu).toContain("<em>");
    expect(b.source_lue).toBe("extrait");
    expect(b.avertissement).toBeNull();
  });

  it("balise la source comme donnée et signale un résumé absent", () => {
    const m = messageSource({ ...item, resume: null }, "site");
    expect(m).toContain("<lien>https://www.rtbf.be/article/mutuelles-123</lien>");
    expect(m).toContain("(aucun résumé fourni par le flux)");
  });

  it("prévient l'IA quand l'article ne peut pas être lu", () => {
    expect(messageSource(item, "impossible")).toContain("ne peut pas être lu");
    expect(messageSource(item, "site")).toContain("Lis d'abord l'article");
    expect(raisonLecture("site_refuse_ia")).toBe("le site refuse la lecture par les robots d'IA");
  });
});
