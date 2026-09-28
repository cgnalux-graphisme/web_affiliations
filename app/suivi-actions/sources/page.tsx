import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import GestionSources, { type Source } from "./GestionSources";

export const metadata: Metadata = {
  title: "Sources de la veille — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function SourcesPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/sources");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_sources").select("id, nom, url_flux, actif").order("nom");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold leading-none tracking-tight">Sources</h1>
        <p className="mt-2 max-w-2xl text-base">
          Les flux RSS lus par la veille toutes les 3 heures. Une source désactivée n&apos;est plus lue, mais ses
          articles déjà ramassés restent dans la veille.
        </p>
      </div>
      {error ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          La liste des sources ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : (
        <GestionSources sources={(data ?? []) as Source[]} />
      )}
    </div>
  );
}
