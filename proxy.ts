import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSuperAdmin } from "./lib/admin";

// Next.js 16 : "proxy" remplace l'ancien "middleware".
// Rafraîchit la session Supabase (cookies) et verrouille l'espace admin.
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

  if (request.nextUrl.pathname.startsWith("/suivi-actions")) {
    const autorise = user ? await isSuperAdmin(supabase, user.id) : false;
    if (!autorise) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", request.nextUrl.pathname);
      if (user) url.searchParams.set("erreur", "acces");
      const redirect = NextResponse.redirect(url);
      // Conserver les cookies de session éventuellement rafraîchis.
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: ["/suivi-actions/:path*", "/login"],
};
