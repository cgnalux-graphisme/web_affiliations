import { describe, expect, it } from "vitest";
import { SOUS_TITRES, construireVulgarisation, nombresAbsents, sousTitresManquants } from "./vulgarisation-ia";
import { lireReferences } from "./articles";

// Note fictive.
const NOTE = "Note FGTB 26I107F. Le CNT a conclu la CCT n° 175. Le salaire minimum passe à 2.070,48 euros au 01/01/2027. La FGTB estime que c'est insuffisant.";
const CONTENU = SOUS_TITRES.map((t) => `<h2>${t}</h2><p>Texte.</p>`).join("");

describe("vulgarisation-ia", () => {
  it("repère les chiffres absents de la note", () => {
    expect(nombresAbsents("Le salaire passe à 2 070,48 euros, CCT 175, en 2027.", NOTE)).toEqual([]);
    expect(nombresAbsents("Soit 150 euros de plus par mois.", NOTE)).toEqual(["150"]);
    expect(nombresAbsents("Le 2e pilier.", NOTE)).toEqual([]);
  });

  it("repère les sous-titres imposés manquants", () => {
    expect(sousTitresManquants(CONTENU)).toEqual([]);
    expect(sousTitresManquants("<h2>De quoi s'agit-il ?</h2>")).toHaveLength(3);
  });

  it("construit la vulgarisation : référence vérifiée, liens retirés, alertes", () => {
    const v = construireVulgarisation(
      {
        titre: " Salaire minimum :  ce qui change ",
        chapo: "Enjeu.",
        points_cles: ["Un", "Deux", "Trois", "Quatre", "Cinq"],
        contenu_html: `${CONTENU}<p><a href="https://x.be">lien</a></p>`,
        reference_note: "Note FGTB 26I107F",
        note_suffisante: true,
        avertissement: "",
      },
      NOTE
    );
    expect(v.titre).toBe("Salaire minimum : ce qui change");
    expect(v.slug).toBe("salaire-minimum-ce-qui-change");
    expect(v.points_cles.split("\n")).toHaveLength(4);
    expect(v.contenu).not.toContain("<a ");
    expect(v.sources).toBe("Note FGTB 26I107F");
    expect(v.avertissement).toBeNull();
  });

  it("écarte une référence inventée et signale les chiffres douteux", () => {
    const v = construireVulgarisation(
      {
        titre: "T",
        chapo: "Plus 300 euros.",
        points_cles: [],
        contenu_html: CONTENU,
        reference_note: "99X999",
        note_suffisante: false,
        avertissement: "Note courte.",
      },
      NOTE
    );
    expect(v.sources).toBe("");
    expect(v.avertissement).toContain("99X999");
    expect(v.avertissement).toContain("300");
    expect(v.note_suffisante).toBe(false);
  });

  it("lit les références avec ou sans lien", () => {
    expect(lireReferences("Note FGTB 26I107F\nLe Soir – https://lesoir.be/a")).toEqual([
      { libelle: "Note FGTB 26I107F", url: null },
      { libelle: "Le Soir", url: "https://lesoir.be/a" },
    ]);
  });
});
