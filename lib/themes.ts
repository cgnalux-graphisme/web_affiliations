/**
 * Thématiques de la veille (table site_themes) : un article est « pertinent » s'il contient
 * au moins un mot-clé actif dans son titre ou son résumé.
 * Règle : insensible à la casse et aux accents ; le mot-clé doit commencer un mot
 * (« grève » retient « Grèves », « salaire » retient « salaires », mais « cp » ne retient pas « capacité »).
 */

/** Texte comparable : minuscules, sans accents, ligatures dépliées, espaces réduits. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type Correspondance = { motsCles: string[]; test: (texte: string) => string[] };

/**
 * Prépare la recherche pour une liste de mots-clés (une seule fois pour toute la liste d'articles).
 * `test(texte)` renvoie les mots-clés trouvés (tels qu'écrits dans site_themes), sans doublon.
 */
export function preparerCorrespondance(motsCles: string[]): Correspondance {
  const vus = new Set<string>();
  const motifs: { motCle: string; re: RegExp }[] = [];
  for (const motCle of motsCles) {
    const n = normaliser(motCle);
    if (!n || vus.has(n)) continue;
    vus.add(n);
    // Début de mot : précédé d'un début de texte ou d'un caractère qui n'est ni lettre ni chiffre.
    motifs.push({ motCle: motCle.trim(), re: new RegExp(`(?:^|[^\\p{L}\\p{N}])${echapper(n).replace(/ /g, "\\s+")}`, "u") });
  }
  return {
    motsCles: motifs.map((m) => m.motCle),
    test(texte: string) {
      const t = normaliser(texte);
      return t ? motifs.filter((m) => m.re.test(t)).map((m) => m.motCle) : [];
    },
  };
}

/** Mots-clés trouvés dans le titre ou le résumé d'un article de veille. */
export function motsClesTrouves(
  article: { titre: string; resume: string | null },
  correspondance: Correspondance
): string[] {
  return correspondance.test(`${article.titre}\n${article.resume ?? ""}`);
}

/** Découpe une saisie en mots-clés : virgules, points-virgules ou retours à la ligne. */
export function decouperMotsCles(saisie: string): string[] {
  const vus = new Set<string>();
  return saisie
    .split(/[,;\n]/)
    .map((m) => m.replace(/\s+/g, " ").trim())
    .filter((m) => {
      const n = normaliser(m);
      if (!n || vus.has(n)) return false;
      vus.add(n);
      return true;
    });
}
