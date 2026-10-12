import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 : "proxy" remplace l'ancien "middleware".
// Rafraîchit la session Supabase (cookies) et exige une connexion pour l'Espace CG.
// Les droits app par app sont vérifiés ensuite côté serveur (layouts, pages, actions, routes API).
// Les anciennes adresses /suivi-actions/… sont redirigées par next.config.ts avant d'arriver ici.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() vérifie le jeton auprès de Supabase (et le rafraîchit si besoin).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/espace") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    // Conserver les cookies de session éventuellement rafraîchis.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/espace/:path*", "/login"],
};
