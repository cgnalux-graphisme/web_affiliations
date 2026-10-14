"use client";

import { usePathname } from "next/navigation";

/** N'affiche son contenu qu'en dehors de l'Espace CG et de la page du QR code des libérations (pied de page du site public, par exemple). */
export default function HorsEspace({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  return chemin.startsWith("/espace") || chemin.startsWith("/presence") ? null : <>{children}</>;
}
