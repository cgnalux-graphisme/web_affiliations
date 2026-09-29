import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * « On vous explique » : texte d'une note technique FGTB (Word .docx ou PDF).
 * SERVEUR UNIQUEMENT (route /api/redaction/note). Le type est vérifié par la signature du fichier,
 * pas seulement par son extension.
 */

/** Taille maximale d'une note (les requêtes vers une fonction Vercel sont limitées à 4,5 Mo). */
export const NOTE_TAILLE_MAX = 4 * 1024 * 1024;
/** Au-delà, la note est trop longue pour une vulgarisation fiable en une fois. */
export const NOTE_TEXTE_MAX = 150_000;
/** En deçà, il n'y a pas assez de matière (ou le PDF est une image scannée). */
export const NOTE_TEXTE_MIN = 300;

export type FormatNote = "docx" | "pdf";

export class ErreurNote extends Error {}

/** Format réel du fichier : .docx = archive ZIP (« PK »), .pdf = « %PDF ». */
export function formatNote(nom: string, octets: Uint8Array): FormatNote | null {
  const ext = nom.toLowerCase().split(".").pop();
  const zip = octets[0] === 0x50 && octets[1] === 0x4b;
  const pdf = octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46;
  if (ext === "docx" && zip) return "docx";
  if (ext === "pdf" && pdf) return "pdf";
  return null;
}

/** Espaces et lignes vides superflues retirés (le texte part tel quel à l'IA). */
export function nettoyerTexte(texte: string): string {
  return texte
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extraireTexteNote(nom: string, octets: Uint8Array): Promise<{ texte: string; format: FormatNote }> {
  const format = formatNote(nom, octets);
  if (!format) {
    throw new ErreurNote(
      nom.toLowerCase().endsWith(".doc")
        ? "Ancien format Word (.doc) non pris en charge : enregistrez la note en .docx (Fichier › Enregistrer sous) puis réessayez."
        : "Ce fichier n'est ni un Word (.docx) ni un PDF valide."
    );
  }

  let brut: string;
  try {
    if (format === "docx") {
      brut = (await mammoth.extractRawText({ buffer: Buffer.from(octets) })).value;
    } else {
      const pdf = await getDocumentProxy(new Uint8Array(octets));
      brut = (await extractText(pdf, { mergePages: true })).text;
    }
  } catch {
    throw new ErreurNote(
      format === "pdf"
        ? "Le PDF ne peut pas être lu (fichier abîmé ou protégé par mot de passe). Essayez la version Word de la note."
        : "Le fichier Word ne peut pas être lu (fichier abîmé ?). Rouvrez-le dans Word, enregistrez-le à nouveau puis réessayez."
    );
  }

  const texte = nettoyerTexte(brut);
  if (texte.length < NOTE_TEXTE_MIN) {
    throw new ErreurNote(
      format === "pdf"
        ? "Presque aucun texte n'a été trouvé dans ce PDF : c'est sans doute une image scannée. Utilisez la version Word ou un PDF avec du texte sélectionnable."
        : "La note contient presque aucun texte : impossible de la vulgariser de manière fiable."
    );
  }
  if (texte.length > NOTE_TEXTE_MAX) {
    throw new ErreurNote(
      `La note est trop longue (${texte.length.toLocaleString("fr-BE")} caractères, ${NOTE_TEXTE_MAX.toLocaleString("fr-BE")} maximum). Gardez la partie utile dans un nouveau fichier.`
    );
  }
  return { texte, format };
}

/** Nom de fichier sûr pour l'archive (lettres, chiffres, tirets), extension conservée. */
export function nomArchive(nom: string, format: FormatNote): string {
  const base = nom
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "note"}.${format}`;
}
