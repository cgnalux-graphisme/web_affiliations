import { Radar } from "lucide-react";

/**
 * Repère de section au-dessus du titre d'un écran (ex. « Scan News » au-dessus de « Le fil ») :
 * distingue le nom de la section de celui de l'écran.
 */
export default function RepereSection({ nom = "Scan News" }: { nom?: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-militant-bordeaux">
      <Radar size={15} aria-hidden /> {nom}
    </p>
  );
}
