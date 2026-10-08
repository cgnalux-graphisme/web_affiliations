import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CLE_ACCUEIL_MOBILISATION, PARAM_ON } from "../../../lib/mobilisations";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import ReglageAssistant from "./ReglageAssistant";
import ReglageMobilisation from "./ReglageMobilisation";

export const metadata: Metadata = {
  title: "Paramètres du site — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** Paramètres du site public (site_parametres) : mobilisation sur l'accueil, Assistant CG. */
export default async function ParametresSitePage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/parametres-site");

  const supabase = await getSupabaseServer();
  const [{ data: param, error }, { data: active }, { data: assistant }] = await Promise.all([
    supabase.from("site_parametres").select("valeur").eq("cle", CLE_ACCUEIL_MOBILISATION).maybeSingle(),
    supabase.from("site_mobilisations").select("id, titre, slug").eq("actif", true).limit(1).maybeSingle(),
    supabase.from("site_parametres").select("valeur").eq("cle", "chatbot_actif").maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Paramètres du site</h1>
        <p className="mt-2 text-base">Ce qui s&apos;affiche sur le site public.</p>
      </div>

      {error ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          Les paramètres ne peuvent pas être chargés. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
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
