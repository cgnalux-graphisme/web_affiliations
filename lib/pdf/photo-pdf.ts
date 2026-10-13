/** Utilitaires des PDF générés dans le navigateur (rapport de congrès, fiches de suivi). NAVIGATEUR UNIQUEMENT. */

/** Réduit une photo pour le PDF (900 px de côté max, JPEG) : fichier final plus léger. null si illisible. */
export async function photoPourPdf(url: string): Promise<string | null> {
  try {
    const reponse = await fetch(url);
    if (!reponse.ok) return null;
    const bitmap = await createImageBitmap(await reponse.blob());
    const echelle = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * echelle);
    canvas.height = Math.round(bitmap.height * echelle);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch (err) {
    console.error("photo", url, err);
    return null;
  }
}

export function telecharger(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
