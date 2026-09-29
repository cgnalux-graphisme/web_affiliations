"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import Interrupteur from "../Interrupteur";
import { CLE_ACCUEIL_MOBILISATION, PARAM_OFF, PARAM_ON, cheminMobilisation } from "../../../lib/mobilisations";
import { getSupabaseAuth } from "../../../lib/supabase";
import { rafraichirMobilisation } from "../mobilisations/revalidation";

/**
 * Interrupteur « Afficher le bloc mobilisation sur l'accueil » (site_parametres, clé accueil_mobilisation).
 * Visible sur le site seulement si l'interrupteur est sur « on » ET qu'une mobilisation est mise en avant.
 */
export default function ReglageMobilisation({
  initial,
  active,
}: {
  initial: boolean;
  active: { id: string; titre: string; slug: string | null } | null;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function changer(v: boolean) {
    setEnCours(true);
    setErreur("");
    const supabase = getSupabaseAuth();
    const valeur = v ? PARAM_ON : PARAM_OFF;
    const maj = { valeur, updated_at: new Date().toISOString() };
    let { data, error } = await supabase.from("site_parametres").update(maj).eq("cle", CLE_ACCUEIL_MOBILISATION).select("cle");
    if (!error && !data?.length) {
      ({ data, error } = await supabase.from("site_parametres").insert({ cle: CLE_ACCUEIL_MOBILISATION, ...maj }).select("cle"));
    }
    if (error || !data?.length) {
      console.error(error);
      setErreur("Le réglage n'a pas pu être enregistré. Reconnectez-vous puis réessayez.");
      setEnCours(false);
      return;
    }
    setOn(v);
    await rafraichirMobilisation();
    setEnCours(false);
    router.refresh();
  }

  const visible = on && active;

  return (
    <section aria-labelledby="titre-mobilisation" className="mt-8 rounded-2xl border border-militant-ardoise p-6">
      <h2 id="titre-mobilisation" className="flex items-center gap-2 font-condensed text-3xl font-extrabold leading-none">
        <Megaphone size={24} className="text-militant-rouge" aria-hidden /> Mobilisation
      </h2>
      <p className="mt-2 text-[15px]">
        Le bloc d&apos;appel à l&apos;action en tête de l&apos;accueil, le bandeau d&apos;alerte en haut de toutes les pages et la
        page campagne.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-militant-ardoise py-4">
        <p className="text-[16px] font-bold">
          Afficher le bloc mobilisation sur l&apos;accueil
        </p>
        <Interrupteur
          actif={on}
          onChange={changer}
          label="Afficher le bloc mobilisation sur l'accueil"
          etatOn="Activé"
          etatOff="Coupé"
          enCours={enCours}
        />
      </div>
      {erreur && (
        <p role="alert" className="mt-3 font-semibold text-militant-bordeaux">
          {erreur}
        </p>
      )}

      <div
        aria-live="polite"
        className={`mt-5 border-l-[6px] py-1 pl-4 ${visible ? "border-militant-rouge" : "border-militant-ardoise"}`}
      >
        <p className="font-bold">Sur le site maintenant : {visible ? "visible" : "rien n'est affiché"}.</p>
        <p className="mt-1 text-[15px]">
          {visible ? (
            <>
              « {active.titre} » s&apos;affiche sur l&apos;accueil, dans le bandeau et sur{" "}
              {active.slug ? (
                <Link
                  href={cheminMobilisation(active.slug)}
                  className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
                >
                  sa page campagne
                </Link>
              ) : (
                "sa page campagne"
              )}
              .
            </>
          ) : !active ? (
            <>
              Aucune mobilisation n&apos;est mise en avant.{" "}
              <Link
                href="/suivi-actions/mobilisations"
                className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
              >
                Choisir une mobilisation
              </Link>
              .
            </>
          ) : (
            <>« {active.titre} » est mise en avant, mais l&apos;affichage est coupé. L&apos;accueil garde son ouverture habituelle.</>
          )}
        </p>
      </div>
    </section>
  );
}
