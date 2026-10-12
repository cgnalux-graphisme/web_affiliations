import type { Metadata } from "next";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import GestionSources, { type Source } from "./GestionSources";

import { Alerte, EnteteEcran } from "../../_partage/ui";
export const metadata: Metadata = {
  title: "Sources — Scan News — Espace CG",
  robots: { index: false, follow: false },
};

export default async function SourcesPage() {
  await exigerApp("scan-news");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_sources").select("id, nom, url_flux, actif").order("nom");

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran
        icone="list"
        titre="Sources"
        description="Les flux RSS lus par Scan News chaque matin (et à la demande depuis Le fil). Une source désactivée n'est plus lue, mais ses articles déjà ramassés restent dans le fil."
      />
      {error ? (
        <Alerte ton="erreur">La liste des sources ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.</Alerte>
      ) : (
        <GestionSources sources={(data ?? []) as Source[]} />
      )}
    </div>
  );
}
