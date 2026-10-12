"use client";

import { usePathname } from "next/navigation";

/** N'affiche son contenu qu'en dehors de l'Espace CG (pied de page du site public, par exemple). */
export default function HorsEspace({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/espace") ? null : <>{children}</>;
}
