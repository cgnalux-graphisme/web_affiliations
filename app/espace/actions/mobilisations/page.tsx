import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, Plus } from "lucide-react";
import { CLE_ACCUEIL_MOBILISATION, PARAM_ON, type Mobilisation } from "../../../../lib/mobilisations";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import ListeMobilisations from "./ListeMobilisations";

import { Alerte, BTN_PRINCIPAL, EnteteEcran, LIEN } from "../../_partage/ui";
export const metadata: Metadata = {
  title: "Mobilisations — Espace CG",
  robots: { index: false, follow: false },
};

/** Mobilisations (manifestations, grèves à venir) : liste, mise en avant, modification, suppression. */
export default async function MobilisationsPage({ searchParams }: { searchParams: Promise<{ enregistre?: string }> }) {
  await exigerApp("actions");
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
    <div className="ecg-ecran">
      <EnteteEcran
        icone="flag"
        titre="Mobilisations"
        description="Manifestations et grèves à venir. Celle qui est « mise en avant » apparaît sur l'accueil, dans le bandeau d'alerte et sur sa page campagne."
        actions={
          <Link href="/espace/actions/mobilisations/nouvelle" className={BTN_PRINCIPAL}>
            <Plus size={18} aria-hidden /> Nouvelle mobilisation
          </Link>
        }
      />

      <Alerte ton={accueilOn ? "info" : "attention"} icone={accueilOn ? Eye : EyeOff} role={null}>
        Affichage sur le site public : <b>{accueilOn ? "activé" : "coupé"}</b>.{" "}
        {accueilOn
          ? "La mobilisation mise en avant est visible."
          : "Aucune mobilisation n'est visible, même mise en avant."}{" "}
        <Link href="/espace/parametres/site" className={LIEN}>
          Paramètres du site
        </Link>
      </Alerte>

      {error ? (
        <Alerte ton="erreur">Les mobilisations ne peuvent pas être chargées. Rechargez la page ; si le problème persiste, reconnectez-vous.</Alerte>
      ) : (
        <ListeMobilisations initiales={(data ?? []) as Mobilisation[]} accueilOn={accueilOn} enregistre={enregistre} />
      )}
    </div>
  );
}
