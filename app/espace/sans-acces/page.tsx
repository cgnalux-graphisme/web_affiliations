import type { Metadata } from "next";
import { appParCode } from "../_noyau/registre";
import SansAcces from "../_noyau/SansAcces";

export const metadata: Metadata = { title: "Accès refusé — Espace CG" };

/** Page vers laquelle une page d'app renvoie quand le droit manque (la garde du layout fait la même chose sur place). */
export default async function Page({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app } = await searchParams;
  const nom = app ? (await appParCode(app))?.nom : null;
  return <SansAcces nomApp={nom} />;
}
