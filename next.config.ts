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
};

export default nextConfig;
