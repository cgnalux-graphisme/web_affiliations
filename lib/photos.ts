export const BUCKET_PHOTOS = "action-photos";

/**
 * Chemin d'une photo dans le bucket : "<action_id>/<rang>-<uuid>.jpg".
 * Le rang (00, 01…) fixe l'ordre d'affichage : la vue site_photos_public n'expose
 * pas de date, la vitrine trie donc les photos par URL. Le rang 00 = photo principale.
 */
export function cheminPhoto(actionId: string, rang: number, id: string): string {
  return `${actionId}/${String(rang).padStart(2, "0")}-${id}.jpg`;
}

/**
 * Retrouve le chemin du fichier dans le bucket à partir de l'URL publique stockée
 * dans site_photos (".../storage/v1/object/public/action-photos/<chemin>").
 * Retourne null si l'URL ne pointe pas vers le bucket.
 */
export function cheminDepuisUrl(url: string): string | null {
  const marqueur = `/storage/v1/object/public/${BUCKET_PHOTOS}/`;
  const i = url.indexOf(marqueur);
  if (i === -1) return null;
  const chemin = url.slice(i + marqueur.length).split(/[?#]/)[0];
  return chemin ? decodeURIComponent(chemin) : null;
}

/** Rang d'une photo lu dans son chemin ("<action_id>/07-….jpg" → 7), ou null. */
export function rangDepuisChemin(chemin: string): number | null {
  const m = chemin.match(/^[^/]+\/(\d{2})-[^/]+$/);
  return m ? Number(m[1]) : null;
}

export function trierPhotos<T extends { url: string }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => a.url.localeCompare(b.url));
}

const COTE_MAX = 2000;

/**
 * Réduit une photo (max 2000 px de côté) et la convertit en JPEG avant envoi :
 * les photos de téléphone font souvent 5 à 10 Mo.
 */
export async function preparerPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const echelle = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * echelle);
  canvas.height = Math.round(bitmap.height * echelle);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion JPEG impossible"))), "image/jpeg", 0.85)
  );
}
