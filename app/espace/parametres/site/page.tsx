import type { Metadata } from "next";
import { CLE_ACCUEIL_MOBILISATION, PARAM_ON } from "../../../../lib/mobilisations";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import ReglageAssistant from "./ReglageAssistant";
import ReglageMobilisation from "./ReglageMobilisation";

import { Alerte, EnteteEcran } from "../../_partage/ui";
export const metadata: Metadata = {
  title: "Paramètres du site — Espace CG",
  robots: { index: false, follow: false },
};

/** Paramètres du site public (site_parametres) : mobilisation sur l'accueil, Assistant CG. */
export default async function ParametresSitePage() {
  await exigerApp("parametres");

  const supabase = await getSupabaseServer();
  const [{ data: param, error }, { data: active }, { data: assistant }] = await Promise.all([
    supabase.from("site_parametres").select("valeur").eq("cle", CLE_ACCUEIL_MOBILISATION).maybeSingle(),
    supabase.from("site_mobilisations").select("id, titre, slug").eq("actif", true).limit(1).maybeSingle(),
    supabase.from("site_parametres").select("valeur").eq("cle", "chatbot_actif").maybeSingle(),
  ]);

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="sliders" titre="Paramètres du site" description="Ce qui s'affiche sur le site public." />

      {error ? (
        <Alerte ton="erreur">Les paramètres ne peuvent pas être chargés. Rechargez la page ; si le problème persiste, reconnectez-vous.</Alerte>
      ) : (
        <>
          <ReglageMobilisation
            initial={param?.valeur === PARAM_ON}
            active={active ? { id: active.id as string, titre: active.titre as string, slug: (active.slug as string | null) ?? null } : null}
          />
          <ReglageAssistant initial={assistant?.valeur === "on"} />
        </>
      )}
    </div>
  );
}
