import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

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
    ];
  },
};

export default nextConfig;
