import { Facebook, Instagram, Youtube } from "lucide-react";

/** Logo TikTok (absent de lucide), monochrome comme les autres icônes. */
export function IconeTikTok({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  );
}

// Icônes monochromes : jamais les couleurs des marques (le bleu et le vert sont réservés à la CSC et à Synova).
export const RESEAUX = [
  { nom: "Facebook", href: "https://www.facebook.com/profile.php?id=100064837864775", icone: <Facebook size={20} aria-hidden /> },
  { nom: "Instagram", href: "https://www.instagram.com/centralegenerale_fgtb_nam_lux", icone: <Instagram size={20} aria-hidden /> },
  { nom: "YouTube", href: "https://www.youtube.com/@CentraleG%C3%A9n%C3%A9raleFGTBNamurLuxem", icone: <Youtube size={20} aria-hidden /> },
  { nom: "TikTok", href: "https://www.tiktok.com/@fgtb_cg_nalux", icone: <IconeTikTok /> },
];

