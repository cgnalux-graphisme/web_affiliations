import type { Metadata } from "next";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import Destinataires, { type Destinataire } from "./Destinataires";

import { Alerte, EnteteEcran } from "../../_partage/ui";
export const metadata: Metadata = {
  title: "Paramètres — Espace CG",
  robots: { index: false, follow: false },
};

/** Paramètres : adresses qui reçoivent les envois automatiques des formulaires (site_destinataires). */
export default async function ParametresPage() {
  await exigerApp("parametres");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_destinataires")
    .select("id, envoi, email, actif")
    .order("created_at", { ascending: true });
  const tableAbsente = error?.code === "42P01" || error?.code === "PGRST205";

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="mail"
        titre="Paramètres des envois"
        description="Adresses qui reçoivent automatiquement chaque formulaire. Le demandeur reçoit toujours sa propre copie, en plus."
      />

      {tableAbsente ? (
        <Alerte ton="attention" role="alert" titre="Les paramètres ne sont pas encore activés.">
          Exécutez la migration <code>supabase/migrations/20260928120000_site_destinataires_envois_mails.sql</code> dans
          l&apos;éditeur SQL de Supabase, puis rechargez cette page. En attendant, les envois partent vers les adresses
          habituelles.
        </Alerte>
      ) : error ? (
        <Alerte ton="erreur">Les paramètres ne peuvent pas être chargés. Rechargez la page ; si le problème persiste, reconnectez-vous.</Alerte>
      ) : (
        <Destinataires initiaux={(data ?? []) as Destinataire[]} />
      )}
    </div>
  );
}
