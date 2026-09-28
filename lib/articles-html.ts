import sanitizeHtml from "sanitize-html";

/**
 * Nettoie le contenu HTML d'un article avant affichage public : seules les balises
 * produites par l'éditeur (gras, sous-titres, listes, liens, citations) sont gardées,
 * sans style ni script. Les liens externes s'ouvrent dans un nouvel onglet.
 */
export function nettoyerContenu(html: string | null | undefined): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: ["p", "br", "h2", "h3", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      h1: "h2",
      h4: "h3",
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const externe = /^https?:\/\//i.test(href);
        const attributs: Record<string, string> = externe
          ? { href, target: "_blank", rel: "noopener noreferrer" }
          : { href };
        return { tagName, attribs: attributs };
      },
    },
    exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
  });
}
