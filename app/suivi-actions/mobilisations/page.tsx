import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { CLE_ACCUEIL_MOBILISATION, PARAM_ON, type Mobilisation } from "../../../lib/mobilisations";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import ListeMobilisations from "./ListeMobilisations";

export const metadata: Metadata = {
  title: "Mobilisations — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** Mobilisations (manifestations, grèves à venir) : liste, mise en avant, modification, suppression. */
export default async function MobilisationsPage({ searchParams }: { searchParams: Promise<{ enregistre?: string }> }) {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/mobilisations");
  const { enregistre } = await searchParams;

  const supabase = await getSupabaseServer();
  const [{ data, error }, { data: param }] = await Promise.all([
    supabase
      .from("site_mobilisations")
      .select("id, titre, slug, date_evenement, lieu, image_hero, lien_inscription, actif, pourquoi")
      .order("date_evenement", { ascending: false, nullsFirst: true }),
    supabase.from("site_parametres").select("valeur").eq("cle", CLE_ACCUEIL_MOBILISATION).maybeSingle(),
  ]);
  const accueilOn = param?.valeur === PARAM_ON;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-[6px] border-militant-charbon pb-5">
        <div>
          <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Mobilisations</h1>
          <p className="mt-2 text-base">
            Manifestations et grèves à venir. Celle qui est « mise en avant » apparaît sur l&apos;accueil, dans le bandeau
            d&apos;alerte et sur sa page campagne.
          </p>
        </div>
        <Link
          href="/suivi-actions/mobilisations/nouvelle"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-militant-bordeaux px-4 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
        >
          <Plus size={17} aria-hidden /> Nouvelle mobilisation
        </Link>
      </div>

      <p
        className={`mt-6 border-l-[6px] py-1 pl-4 text-[15px] ${accueilOn ? "border-militant-rouge" : "border-militant-ardoise"}`}
      >
        Affichage sur le site public :{" "}
        <strong>{accueilOn ? "activé" : "coupé"}</strong>.{" "}
        {accueilOn
          ? "La mobilisation mise en avant est visible."
          : "Aucune mobilisation n'est visible, même mise en avant."}{" "}
        <Link
          href="/suivi-actions/parametres-site"
          className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
        >
          Paramètres du site
        </Link>
      </p>

      {error ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          Les mobilisations ne peuvent pas être chargées. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : (
        <ListeMobilisations initiales={(data ?? []) as Mobilisation[]} accueilOn={accueilOn} enregistre={enregistre} />
      )}
    </div>
  );
}
