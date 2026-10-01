import { NextResponse, type NextRequest } from "next/server";
import { domaineValide, logoMedia } from "../../../lib/logo-media";
import { getSuperAdmin } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Logo d'un média pour Scan News (GET ?domaine=rtbf.be) : icône récupérée sur le site du média lui-même.
 * Réservé aux super admins. 404 sans logo : l'écran affiche alors les initiales du média.
 */
export async function GET(request: NextRequest) {
  if (!(await getSuperAdmin())) return new NextResponse(null, { status: 401 });
  const domaine = (request.nextUrl.searchParams.get("domaine") ?? "").toLowerCase().replace(/^www\./, "");
  if (!domaineValide(domaine)) return new NextResponse(null, { status: 400 });

  const logo = await logoMedia(domaine);
  if (!logo) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, max-age=86400" } });
  return new NextResponse(new Uint8Array(logo.corps), {
    headers: {
      "Content-Type": logo.type,
      "Cache-Control": "private, max-age=604800",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
