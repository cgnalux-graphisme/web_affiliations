/**
 * Autocomplétion d'adresses belges avec Photon (OpenStreetMap, https://photon.komoot.io), appelé depuis le
 * navigateur. Partagé par le formulaire d'affiliation et l'Espace CG. Pur : construction de l'adresse et
 * lecture de la réponse.
 */

export interface PhotonSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  display: string;
}

/** bbox = rectangle englobant la Belgique (lon_min, lat_min, lon_max, lat_max). */
export function urlPhoton(recherche: string): string {
  return `https://photon.komoot.io/api/?q=${encodeURIComponent(recherche)}&lang=fr&limit=10&bbox=2.376,49.496,6.628,51.547`;
}

type Propriete = { countrycode?: string; street?: string; name?: string; housenumber?: string; postcode?: string; city?: string; locality?: string; district?: string };

/** Rues belges seulement, une seule fois par rue et localité, 6 au plus. */
export function suggestionsPhoton(json: unknown): PhotonSuggestion[] {
  const features = ((json as { features?: unknown[] } | null)?.features ?? []) as { properties?: Propriete }[];
  const vus = new Set<string>();
  const liste: PhotonSuggestion[] = [];
  for (const f of features) {
    const p = f?.properties;
    if (!p || p.countrycode !== "BE" || !p.street) continue;
    const s = {
      street: p.street,
      housenumber: p.housenumber ?? "",
      postcode: p.postcode ?? "",
      city: p.city ?? p.locality ?? p.district ?? "",
      display: "",
    };
    s.display = [s.street + (s.housenumber ? ` ${s.housenumber}` : ""), [s.postcode, s.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const cle = `${s.street}|${s.postcode}|${s.city}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    liste.push(s);
  }
  return liste.slice(0, 6);
}
