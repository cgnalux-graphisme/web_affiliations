/** Domaine d'un média (clé de son logo). Sans dépendance : utilisable côté navigateur. */

/** Domaine d'un lien, sans « www. » (clé du logo). null si le lien n'est pas valide. */
export function domaineDe(lien: string): string | null {
  try {
    const u = new URL(lien);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Nom de domaine acceptable (lettres, chiffres, tirets, points ; au moins un point). */
export function domaineValide(domaine: string): boolean {
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domaine);
}
