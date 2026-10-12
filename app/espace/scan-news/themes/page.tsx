import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import GestionThemes, { type Theme } from "./GestionThemes";

import { Alerte, EnteteEcran } from "../../_partage/ui";
export const metadata: Metadata = {
  title: "Thématiques — Scan News — Espace CG",
  robots: { index: false, follow: false },
};

export default async function ThemesPage() {
  await exigerApp("scan-news");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_themes").select("id, mot_cle, actif").order("mot_cle");

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran
        icone="tag"
        titre="Thématiques"
        description={
          <>
            Les mots-clés qui rendent un article du{" "}
            <Link href="/espace/scan-news/fil" className="ecg-lien">
              fil
            </Link>{" "}
            pertinent : au moins un mot-clé actif dans son titre ou son résumé. Rien n&apos;est effacé, un changement ici
            re-filtre le fil tout de suite.
          </>
        }
      />
      {error ? (
        <Alerte ton="erreur">La liste des mots-clés ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.</Alerte>
      ) : (
        <GestionThemes themes={(data ?? []) as Theme[]} />
      )}
    </div>
  );
}
