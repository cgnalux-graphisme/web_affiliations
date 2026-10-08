/**
 * Limitation du nombre de requêtes par adresse IP, en mémoire (fenêtre glissante).
 * Garde-fou « au mieux » : chaque instance du serveur tient son propre compte (Vercel réutilise les
 * instances, mais en lance plusieurs sous forte charge). Aucune adresse IP n'est enregistrée ailleurs.
 */

const compteurs = new Map<string, number[]>();

export function adresseIp(request: Request): string {
  const transmise = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return transmise || request.headers.get("x-real-ip") || "inconnue";
}

/** true si la requête est acceptée ; false si la limite est atteinte pour cette clé. */
export function accepterRequete(cle: string, max: number, fenetreMs: number, maintenant = Date.now()): boolean {
  const recents = (compteurs.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
  if (recents.length >= max) {
    compteurs.set(cle, recents);
    return false;
  }
  recents.push(maintenant);
  compteurs.set(cle, recents);
  // Ménage occasionnel pour ne pas garder des milliers d'entrées.
  if (compteurs.size > 5000) {
    for (const [k, v] of compteurs) if (!v.some((t) => maintenant - t < fenetreMs)) compteurs.delete(k);
  }
  return true;
}
