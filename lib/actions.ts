function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Titre d'une action : son nom, sinon son type (le détail saisi pour "autre"). */
export function titreAction(a: {
  nom: string | null;
  type_action: string;
  type_action_autre: string | null;
}): string {
  if (a.nom?.trim()) return a.nom.trim();
  if (a.type_action === "autre") return capitalize(a.type_action_autre?.trim() || "autre action");
  return capitalize(a.type_action);
}
