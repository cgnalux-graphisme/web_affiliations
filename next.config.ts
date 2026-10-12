import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/** Anciennes adresses de l'espace admin → leur place dans l'Espace CG (du plus précis au plus général). */
const ANCIEN_ADMIN: [string, string][] = [
  ["/suivi-actions", "/espace"],
  ["/suivi-actions/actions", "/espace/actions/liste"],
  ["/suivi-actions/nouvelle", "/espace/actions/nouvelle"],
  ["/suivi-actions/rapport", "/espace/actions/rapport"],
  ["/suivi-actions/mobilisations/:path*", "/espace/actions/mobilisations/:path*"],
  ["/suivi-actions/articles/:path*", "/espace/scan-news/articles/:path*"],
  ["/suivi-actions/explications/:path*", "/espace/scan-news/explications/:path*"],
  ["/suivi-actions/veille", "/espace/scan-news/fil"],
  ["/suivi-actions/sources", "/espace/scan-news/sources"],
  ["/suivi-actions/themes", "/espace/scan-news/themes"],
  ["/suivi-actions/demandes/:path*", "/espace/demarches/demandes/:path*"],
  ["/suivi-actions/chatbot", "/espace/demarches/chatbot"],
  ["/suivi-actions/parametres-site", "/espace/parametres/site"],
  ["/suivi-actions/parametres", "/espace/parametres/envois"],
  // Modifier une action : /suivi-actions/<id>/modifier.
  ["/suivi-actions/:id/modifier", "/espace/actions/:id/modifier"],
  // Toute autre ancienne adresse : le tableau de bord.
  ["/suivi-actions/:path*", "/espace"],
];

const nextConfig: NextConfig = {
  images: {
    // Photos des actions (bucket "action-photos") et images du blog (bucket "blog-images").
    remotePatterns: supabaseHost
      ? ["action-photos", "blog-images"].map((bucket) => ({
          protocol: "https" as const,
          hostname: supabaseHost,
          pathname: `/storage/v1/object/public/${bucket}/**`,
        }))
      : [],
  },
  // Les listes « Actualités » (/blog) et « On vous explique » sont fusionnées dans /actualites.
  // Les pages de détail restent à /blog/<slug> et /on-vous-explique/<slug>.
  async redirects() {
    return [
      { source: "/blog", destination: "/actualites?rubrique=actualites", permanent: true },
      { source: "/on-vous-explique", destination: "/actualites?rubrique=on-vous-explique", permanent: true },
      // Ancien espace admin (/suivi-actions) rangé dans l'Espace CG, app par app (08/10/2026).
      // Les paramètres d'adresse (?id=, ?vue=…) suivent la redirection.
      ...ANCIEN_ADMIN.map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },
};

export default nextConfig;
