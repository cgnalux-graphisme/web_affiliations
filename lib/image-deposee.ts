/**
 * Glisser-déposer d'images (couverture d'article, photos d'actions, image de mobilisation) : utilitaires sans
 * dépendance, importables côté navigateur. Le composant est app/ZoneDepotImages.tsx.
 */

/** Types acceptés partout : toutes sont converties en JPEG avant envoi (preparerPhoto). */
export const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const TAILLE_IMAGE_MAX = 20 * 1024 * 1024;
export const MESSAGE_IMAGE_REFUSEE = "JPEG, PNG, WebP, GIF ou AVIF de 20 Mo maximum";

export function imageAcceptee(file: Pick<File, "type" | "size">): boolean {
  return TYPES_IMAGE.includes(file.type) && file.size <= TAILLE_IMAGE_MAX;
}

/** Adresse d'une image glissée depuis une page web : <img src> du HTML, sinon la liste d'URL, sinon le texte. */
export function urlImageDeposee(dt: Pick<DataTransfer, "getData">): string | null {
  const html = dt.getData("text/html");
  const src = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i)?.[1];
  const liste = dt
    .getData("text/uri-list")
    .split(/\r?\n/)
    .find((l) => l.trim() && !l.startsWith("#"));
  const candidat = (src ?? liste ?? dt.getData("text/plain")).trim().replace(/&amp;/g, "&");
  return /^(https?:\/\/|data:image\/)/i.test(candidat) ? candidat : null;
}

/** Nom de fichier lisible tiré de l'adresse d'une image web (« photo.jpg »), « image-web » à défaut. */
export function nomDepuisUrl(url: string): string {
  if (url.startsWith("data:")) return "image-web";
  let nom = url.split(/[?#]/)[0].split("/").pop() || "";
  try {
    nom = decodeURIComponent(nom);
  } catch {
    // Encodage invalide : le nom brut convient.
  }
  return (nom || "image-web").slice(0, 80);
}
