import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import Destinataires, { type Destinataire } from "./Destinataires";

export const metadata: Metadata = {
  title: "Paramètres — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** Paramètres : adresses qui reçoivent les envois automatiques des formulaires (site_destinataires). */
export default async function ParametresPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/parametres");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_destinataires")
    .select("id, envoi, email, actif")
    .order("created_at", { ascending: true });
  const tableAbsente = error?.code === "42P01" || error?.code === "PGRST205";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Paramètres</h1>
        <p className="mt-2 text-base">
          Adresses qui reçoivent automatiquement chaque formulaire. Le demandeur reçoit toujours sa propre copie, en plus.
        </p>
      </div>

      {tableAbsente ? (
        <div role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-5">
          <p className="font-condensed text-2xl font-bold">Les paramètres ne sont pas encore activés.</p>
          <p className="mt-1 text-lg">
            Exécutez la migration <code>supabase/migrations/20260928120000_site_destinataires_envois_mails.sql</code> dans
            l&apos;éditeur SQL de Supabase, puis rechargez cette page. En attendant, les envois partent vers les adresses
            habituelles.
          </p>
        </div>
      ) : error ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          Les paramètres ne peuvent pas être chargés. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : (
        <Destinataires initiaux={(data ?? []) as Destinataire[]} />
      )}
    </div>
  );
}
