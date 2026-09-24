const ID = /^[A-Za-z0-9_-]{11}$/;
const HOTES = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/**
 * Extrait l'identifiant d'une vidéo YouTube depuis un lien collé
 * (watch?v=, youtu.be/, shorts/, embed/, live/). Retourne null si ce n'est pas un lien YouTube valide.
 */
export function idYoutube(lien: string): string | null {
  let url: URL;
  try {
    const brut = lien.trim();
    url = new URL(/^https?:\/\//i.test(brut) ? brut : `https://${brut}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const hote = url.hostname.toLowerCase();

  let id: string | null = null;
  if (hote === "youtu.be" || hote === "www.youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (HOTES.has(hote)) {
    const [, section, suite] = url.pathname.split("/");
    if (section === "watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(section)) id = suite ?? null;
  }
  return id && ID.test(id) ? id : null;
}

/** Lien canonique enregistré en base. */
export function lienCanonique(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Lecteur intégré sans cookie publicitaire tant que la vidéo n'est pas lancée. */
export function lienIntegre(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

export function miniature(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
