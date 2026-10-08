import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { estStatutDemande, type DemandeChatbot } from "../../../lib/assistant-demandes";
import { getSuperAdmin } from "../../../lib/supabase-server";
import { getSupabaseService } from "../../../lib/supabase-service";
import ListeDemandesChatbot from "./ListeDemandesChatbot";

export const metadata: Metadata = {
  title: "Demandes chatbot — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Demandes transmises par l'Assistant CG (site_chatbot_demandes, lue en service_role après vérification
 * SUPER_ADMIN). Le registre national n'est jamais chargé avec la liste : seulement au clic sur « Afficher ».
 */
export default async function DemandesChatbotPage({ searchParams }: { searchParams: Promise<{ statut?: string; id?: string }> }) {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/chatbot");
  const p = await searchParams;
  const supabase = getSupabaseService();

  let demandes: DemandeChatbot[] = [];
  let echec = !supabase;
  if (supabase) {
    const { data, error } = await supabase
      .from("site_chatbot_demandes")
      .select("id, created_at, nom, prenom, email, message, code_postal, region, categorie, cp_code, affilie, service_nom, destinataire_email, statut, registre_national")
      .order("created_at", { ascending: false })
      .limit(500);
    echec = Boolean(error);
    demandes = (data ?? []).map(({ registre_national, ...d }) => ({ ...(d as Omit<DemandeChatbot, "aRegistre">), aRegistre: Boolean(registre_national) }));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Demandes chatbot</h1>
        <p className="mt-2 text-base">Les demandes transmises par l&apos;Assistant CG du site. Les conversations ne sont jamais enregistrées.</p>
      </div>
      {echec ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          Les demandes ne peuvent pas être chargées. Rechargez la page ; si le problème persiste, vérifiez la clé SUPABASE_SERVICE_ROLE_KEY.
        </p>
      ) : (
        <ListeDemandesChatbot demandes={demandes} filtreInitial={estStatutDemande(p.statut) ? p.statut : "tous"} ouverte={p.id ?? null} />
      )}
    </div>
  );
}
