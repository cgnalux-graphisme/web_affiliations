/**
 * Neutralise le HTML des valeurs saisies par le public avant de les placer dans un e-mail.
 * Sans cela, un nom comme « <a href=…>Cliquez ici</a> » deviendrait un vrai lien dans un e-mail
 * envoyé au nom de la Centrale (hameçonnage).
 */
export function echapperHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Copie d'un objet dont toutes les valeurs texte sont neutralisées (les autres valeurs restent telles quelles). */
export function echapperChamps<T extends object>(objet: T): T {
  return Object.fromEntries(
    Object.entries(objet).map(([cle, valeur]) => [cle, typeof valeur === "string" ? echapperHtml(valeur) : valeur])
  ) as T;
}
