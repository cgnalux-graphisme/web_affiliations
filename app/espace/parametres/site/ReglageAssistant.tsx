"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { Alerte } from "../../_partage/ui";
import Interrupteur from "../../_partage/Interrupteur";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { rafraichirMobilisation } from "../../actions/mobilisations/revalidation";

const CLE = "chatbot_actif";

/**
 * Interrupteur « Afficher l'Assistant CG » (site_parametres, clé chatbot_actif, 'on' / 'off').
 * Coupé : la bulle n'apparaît sur aucune page et les routes /api/assistant refusent les demandes.
 */
export default function ReglageAssistant({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function changer(v: boolean) {
    setEnCours(true);
    setErreur("");
    const supabase = getSupabaseAuth();
    const maj = { valeur: v ? "on" : "off", updated_at: new Date().toISOString() };
    let { data, error } = await supabase.from("site_parametres").update(maj).eq("cle", CLE).select("cle");
    if (!error && !data?.length) {
      ({ data, error } = await supabase.from("site_parametres").insert({ cle: CLE, ...maj }).select("cle"));
    }
    if (error || !data?.length) {
      console.error(error);
      setErreur("Le réglage n'a pas pu être enregistré. Reconnectez-vous puis réessayez.");
      setEnCours(false);
      return;
    }
    setOn(v);
    // Le layout (donc la bulle) se régénère tout de suite sur toutes les pages.
    await rafraichirMobilisation();
    setEnCours(false);
    router.refresh();
  }

  return (
    <section aria-labelledby="titre-assistant" className="ecg-panneau">
      <div className="ecg-panneau-tete">
        <span className="ecg-entete-ico h-10 w-10 rounded-xl" aria-hidden>
          <MessageCircle size={20} />
        </span>
        <div>
          <h2 id="titre-assistant">Assistant CG</h2>
          <p>
        La bulle « Une question ? » en bas à droite de toutes les pages publiques. Elle oriente les visiteurs vers le bon
        service, sans jamais répondre sur le fond. Les demandes transmises arrivent dans{" "}
        <Link
          href="/espace/demarches/chatbot"
          className="ecg-lien"
        >
          Demandes chatbot
        </Link>
        .
          </p>
        </div>
      </div>
      <div className="ecg-panneau-corps ecg-pile">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">Afficher l&apos;assistant sur le site</p>
        <Interrupteur actif={on} onChange={changer} label="Afficher l'Assistant CG sur le site" etatOn="Activé" etatOff="Coupé" enCours={enCours} />
      </div>
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
      <div aria-live="polite">
        <Alerte ton={on ? "succes" : "info"} icone={on ? Eye : EyeOff} role={null}>
          <b>Sur le site maintenant : {on ? "l'assistant est visible" : "l'assistant est masqué"}.</b>
        </Alerte>
      </div>
      </div>
    </section>
  );
}
