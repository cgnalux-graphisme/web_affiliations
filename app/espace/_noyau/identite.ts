/** Prénom, nom affiché et initiales à partir de profiles.name (sinon de l'adresse e-mail). */
export function identite(nom: string | null, email: string) {
  const propre = (nom ?? "").trim().replace(/\s+/g, " ");
  const base = propre || email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const mots = base.split(" ").filter(Boolean);
  const majuscule = (m: string) => m.charAt(0).toLocaleUpperCase("fr-BE") + m.slice(1);
  const prenom = mots.length ? majuscule(mots[0]) : "";
  const initiales = (mots.length > 1 ? mots[0][0] + mots[mots.length - 1][0] : base.slice(0, 2)).toLocaleUpperCase("fr-BE");
  return { prenom, nomComplet: propre || email, initiales: initiales || "CG" };
}
