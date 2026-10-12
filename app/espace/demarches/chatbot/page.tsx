import type { Metadata } from "next";
import { estStatutDemande, type DemandeChatbot } from "../../../../lib/assistant-demandes";
import { exigerApp, monProfil } from "../../../../lib/espace/acces";
import { getSupabaseService } from "../../../../lib/supabase-service";
import ListeDemandesChatbot from "./ListeDemandesChatbot";

import { Alerte, EnteteEcran } from "../../_partage/ui";
export const metadata: Metadata = {
  title: "Demandes chatbot — Espace CG",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Demandes transmises par l'Assistant CG (site_chatbot_demandes, lue en service_role après vérification
 * SUPER_ADMIN). Le registre national n'est jamais chargé avec la liste : seulement au clic sur « Afficher ».
 */
export default async function DemandesChatbotPage({ searchParams }: { searchParams: Promise<{ statut?: string; id?: string }> }) {
  await exigerApp("demarches");
  const p = await searchParams;
  const supabase = getSupabaseService();

  let demandes: DemandeChatbot[] = [];
  let echec = !supabase;
  if (supabase) {
    const colonnes =
      "id, created_at, nom, prenom, email, message, code_postal, region, categorie, cp_code, affilie, service_nom, destinataire_email, statut, registre_national";
    const lire = (cols: string) =>
      supabase.from("site_chatbot_demandes").select(cols).order("created_at", { ascending: false }).limit(500);
    // traite_le n'existe qu'après la migration du 08/10/2026 : sans elle, la liste s'affiche quand même.
    let { data, error } = await lire(`${colonnes}, traite_le`);
    if (error?.code === "42703") ({ data, error } = await lire(colonnes));
    echec = Boolean(error);
    demandes = ((data ?? []) as unknown as Record<string, unknown>[]).map(({ registre_national, traite_le, ...d }) => ({
      ...(d as Omit<DemandeChatbot, "aRegistre" | "traite_le">),
      traite_le: (traite_le as string | null | undefined) ?? null,
      aRegistre: Boolean(registre_national),
    }));
  }

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="message"
        titre="Demandes chatbot"
        description="Les demandes transmises par l'Assistant CG du site. Les conversations ne sont jamais enregistrées."
      />
      {echec ? (
        <Alerte ton="erreur">Les demandes ne peuvent pas être chargées. Rechargez la page ; si le problème persiste, vérifiez la clé SUPABASE_SERVICE_ROLE_KEY.</Alerte>
      ) : (
        <ListeDemandesChatbot
          demandes={demandes}
          filtreInitial={estStatutDemande(p.statut) ? p.statut : "tous"}
          ouverte={p.id ?? null}
          peutSupprimer={(await monProfil())?.role === "SUPER_ADMIN"}
        />
      )}
    </div>
  );
}
