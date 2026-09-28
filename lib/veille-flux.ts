import { XMLParser } from "fast-xml-parser";

import { lienValide } from "./veille";

/**
 * Veille : lecture des flux RSS / Atom / RDF des sources (table site_sources)
 * et préparation des items pour site_veille. Fonctions pures, testées. Côté serveur.
 */

export type ItemFlux = {
  titre: string;
  resume: string | null;
  lien: string;
  date_publication: string | null; // ISO
};

const RESUME_MAX = 600;
export const ITEMS_MAX_PAR_FLUX = 50;

const ENTITES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â", auml: "ä",
  ccedil: "ç", icirc: "î", iuml: "ï", ocirc: "ô", ouml: "ö", ugrave: "ù", ucirc: "û", uuml: "ü",
  Eacute: "É", Egrave: "È", Ecirc: "Ê", Agrave: "À", Ccedil: "Ç", oelig: "œ", OElig: "Œ",
  laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  hellip: "…", ndash: "–", mdash: "—", euro: "€", deg: "°",
};

/** Décode les entités HTML courantes (&eacute; &#233; &#xE9;…). */
export function decoderEntites(texte: string): string {
  return texte.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITES[e] ?? m;
  });
}

/** Texte lisible depuis du HTML de flux : sans balises, entités décodées, espaces réduits. */
export function texteDepuisHtml(html: string): string {
  return decoderEntites(
    decoderEntites(html) // certains flux encodent le HTML deux fois (&lt;p&gt;)
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function couper(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.–-]+$/, "")}…`;
}

/** Valeur texte d'un nœud XML (texte simple, CDATA ou objet avec #text). */
function texte(noeud: unknown): string {
  if (noeud == null) return "";
  if (typeof noeud === "string" || typeof noeud === "number") return String(noeud);
  if (Array.isArray(noeud)) return texte(noeud[0]);
  if (typeof noeud === "object") {
    const o = noeud as Record<string, unknown>;
    return texte(o["#text"] ?? o.__cdata ?? "");
  }
  return "";
}

function liste<T = unknown>(v: T | T[] | undefined | null): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function dateIso(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Lien d'une entrée Atom : <link rel="alternate" href="…"> (ou le premier lien). */
function lienAtom(noeud: unknown): string {
  const liens = liste(noeud as Record<string, string> | Record<string, string>[]);
  const choisi = liens.find((l) => typeof l === "object" && (!l["@_rel"] || l["@_rel"] === "alternate")) ?? liens[0];
  if (typeof choisi === "string") return choisi;
  return choisi?.["@_href"] ?? "";
}

/**
 * Lit un flux RSS 2.0, Atom ou RDF et renvoie ses articles (au plus ITEMS_MAX_PAR_FLUX).
 * Les entrées sans titre ou sans lien http(s) sont ignorées. Lève une erreur si le document n'est pas un flux.
 */
export function lireFlux(xml: string): ItemFlux[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    cdataPropName: "__cdata",
    processEntities: true,
    htmlEntities: true,
    trimValues: true,
  });
  const doc = parser.parse(xml) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  let brutes: { titre: string; resume: string; lien: string; date: string }[];
  if (doc.rss?.channel) {
    brutes = liste(liste(doc.rss.channel)[0]?.item).map((i: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      titre: texte(i.title),
      resume: texte(i.description) || texte(i.encoded),
      lien: texte(i.link) || (i.guid?.["@_isPermaLink"] !== "false" ? texte(i.guid) : ""),
      date: texte(i.pubDate) || texte(i.date),
    }));
  } else if (doc.feed) {
    brutes = liste(doc.feed.entry).map((e: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      titre: texte(e.title),
      resume: texte(e.summary) || texte(e.content),
      lien: lienAtom(e.link),
      date: texte(e.published) || texte(e.updated),
    }));
  } else if (doc.RDF) {
    brutes = liste(doc.RDF.item).map((i: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      titre: texte(i.title),
      resume: texte(i.description),
      lien: texte(i.link),
      date: texte(i.date),
    }));
  } else {
    throw new Error("Ce document n'est pas un flux RSS ou Atom.");
  }

  const vus = new Set<string>();
  const items: ItemFlux[] = [];
  for (const b of brutes) {
    const titre = couper(texteDepuisHtml(b.titre), 300);
    const lien = lienValide(decoderEntites(b.lien));
    if (!titre || !lien || vus.has(lien)) continue;
    vus.add(lien);
    const resume = texteDepuisHtml(b.resume);
    items.push({
      titre,
      resume: resume ? couper(resume, RESUME_MAX) : null,
      lien,
      date_publication: dateIso(b.date),
    });
    if (items.length >= ITEMS_MAX_PAR_FLUX) break;
  }
  return items;
}
