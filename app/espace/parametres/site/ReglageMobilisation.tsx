"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Megaphone } from "lucide-react";
import { Alerte } from "../../_partage/ui";
import Interrupteur from "../../_partage/Interrupteur";
import { CLE_ACCUEIL_MOBILISATION, PARAM_OFF, PARAM_ON, cheminMobilisation } from "../../../../lib/mobilisations";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { rafraichirMobilisation } from "../../actions/mobilisations/revalidation";

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
    <section aria-labelledby="titre-mobilisation" className="ecg-panneau">
      <div className="ecg-panneau-tete">
        <span className="ecg-entete-ico h-10 w-10 rounded-xl" aria-hidden>
          <Megaphone size={20} />
        </span>
        <div>
          <h2 id="titre-mobilisation">Mobilisation</h2>
          <p>
        Le bloc d&apos;appel à l&apos;action en tête de l&apos;accueil, le bandeau d&apos;alerte en haut de toutes les pages et la
        page campagne.
          </p>
        </div>
      </div>

      <div className="ecg-panneau-corps ecg-pile">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
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
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

      <div aria-live="polite">
      <Alerte ton={visible ? "succes" : "info"} icone={visible ? Eye : EyeOff} role={null} titre={`Sur le site maintenant : ${visible ? "visible" : "rien n'est affiché"}.`}>
        <p>
          {visible ? (
            <>
              « {active.titre} » s&apos;affiche sur l&apos;accueil, dans le bandeau et sur{" "}
              {active.slug ? (
                <Link
                  href={cheminMobilisation(active.slug)}
                  className="ecg-lien"
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
                href="/espace/actions/mobilisations"
                className="ecg-lien"
              >
                Choisir une mobilisation
              </Link>
              .
            </>
          ) : (
            <>« {active.titre} » est mise en avant, mais l&apos;affichage est coupé. L&apos;accueil garde son ouverture habituelle.</>
          )}
        </p>
      </Alerte>
      </div>
      </div>
    </section>
  );
}
