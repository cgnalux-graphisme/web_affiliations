/**
 * Distance en voiture entre deux adresses, par Google Maps (Routes API, « computeRoutes »). SERVEUR UNIQUEMENT :
 * la clé GOOGLE_MAPS_API_KEY ne quitte jamais le serveur. Sans clé : pas de calcul (l'admin saisit les km).
 * Choix de Fred (14/10/2026) : Google Maps.
 */

export type ResultatDistance = { ok: true; metres: number } | { ok: false; erreur: string };

export function cleGoogleConfiguree(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export async function distanceVoiture(de: string, vers: string): Promise<ResultatDistance> {
  const cle = process.env.GOOGLE_MAPS_API_KEY;
  if (!cle) return { ok: false, erreur: "Calcul automatique pas encore configuré (clé Google Maps)." };
  try {
    const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": cle, "X-Goog-FieldMask": "routes.distanceMeters" },
      body: JSON.stringify({
        origin: { address: de },
        destination: { address: vers },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        languageCode: "fr-BE",
        regionCode: "BE",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const j = (await r.json().catch(() => ({}))) as { routes?: { distanceMeters?: number }[]; error?: { message?: string; status?: string } };
    if (!r.ok) {
      console.error("[liberations] Google Maps :", r.status, j.error?.status);
      return { ok: false, erreur: r.status === 403 ? "Clé Google Maps refusée (Routes API activée ?)." : "Google Maps n'a pas répondu correctement." };
    }
    const metres = j.routes?.[0]?.distanceMeters;
    if (typeof metres !== "number") return { ok: false, erreur: "Adresse introuvable par Google Maps : vérifiez-la." };
    return { ok: true, metres };
  } catch {
    return { ok: false, erreur: "Google Maps n'a pas répondu. Réessayez plus tard." };
  }
}
