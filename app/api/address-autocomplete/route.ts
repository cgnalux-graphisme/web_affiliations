import { NextRequest, NextResponse } from "next/server";
import { refuserSiTropDeRequetes } from "@/lib/limite-requetes";

interface AddressSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  display: string;
}

function dedupe(list: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = `${item.street}|${item.postcode}|${item.city}|${item.housenumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchBpostSuggestions(query: string): Promise<AddressSuggestion[]> {
  const apiKey = process.env.BPOST_API_KEY;
  if (!apiKey) return [];

  const url =
    "https://api.mailops.bpost.cloud/roa-info/externalMailingAddressProofingRest/autocomplete" +
    `?q=${encodeURIComponent(query)}&maxNumberOfSuggestions=6&id=web-affiliations`;

  const res = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
    // Suggestions pendant la frappe : au-delà de 4 s, mieux vaut ne rien proposer que bloquer.
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return [];
  const json = await res.json();

  const candidates: unknown[] = Array.isArray(json) ? json : (json?.suggestions ?? json?.items ?? []);
  const mapped = candidates
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      const street = String(r.street ?? r.streetName ?? "").trim();
      const housenumber = String(r.housenumber ?? r.streetNumber ?? "").trim();
      const postcode = String(r.postcode ?? r.postalCode ?? "").trim();
      const city = String(r.city ?? r.locality ?? "").trim();
      const display = String(
        r.display ??
          r.formattedAddress ??
          [street + (housenumber ? ` ${housenumber}` : ""), [postcode, city].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join(", ")
      ).trim();

      return { street, housenumber, postcode, city, display };
    })
    .filter((x) => x.street);

  return dedupe(mapped).slice(0, 6);
}

async function fetchPhotonSuggestions(query: string): Promise<AddressSuggestion[]> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    `&lang=fr&limit=10&bbox=2.376,49.496,6.628,51.547`;

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  const json = await res.json();
  const features: unknown[] = json.features ?? [];

  const mapped = (features as Array<{
    properties: {
      countrycode?: string;
      street?: string;
      housenumber?: string;
      postcode?: string;
      city?: string;
      locality?: string;
      district?: string;
    };
  }>)
    .filter((f) => f.properties?.countrycode === "BE" && f.properties?.street)
    .map((f) => {
      const p = f.properties;
      const street = p.street ?? "";
      const housenumber = p.housenumber ?? "";
      const postcode = p.postcode ?? "";
      const city = p.city ?? p.locality ?? p.district ?? "";
      const display = [street + (housenumber ? ` ${housenumber}` : ""), [postcode, city].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");
      return { street, housenumber, postcode, city, display };
    });

  return dedupe(mapped).slice(0, 6);
}

/** Une même recherche donne les mêmes adresses : réponses gardées un jour par le réseau de Vercel. */
const EN_CACHE = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(req: NextRequest) {
  const tropDeRequetes = refuserSiTropDeRequetes(req, "address-autocomplete", 300);
  if (tropDeRequetes) return tropDeRequetes;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const bpost = await fetchBpostSuggestions(q);
    if (bpost.length > 0) {
      return NextResponse.json({ suggestions: bpost, provider: "bpost" }, { headers: EN_CACHE });
    }
  } catch {
    // Fallback below
  }

  try {
    const photon = await fetchPhotonSuggestions(q);
    return NextResponse.json({ suggestions: photon, provider: "photon" }, { headers: photon.length > 0 ? EN_CACHE : undefined });
  } catch {
    return NextResponse.json({ suggestions: [], provider: "none" });
  }
}

