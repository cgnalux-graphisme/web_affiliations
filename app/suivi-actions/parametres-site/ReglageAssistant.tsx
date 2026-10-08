"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import Interrupteur from "../Interrupteur";
import { getSupabaseAuth } from "../../../lib/supabase";
import { rafraichirMobilisation } from "../mobilisations/revalidation";

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
    <section aria-labelledby="titre-assistant" className="mt-8 rounded-2xl border border-militant-ardoise p-6">
      <h2 id="titre-assistant" className="flex items-center gap-2 font-condensed text-3xl font-extrabold leading-none">
        <MessageCircle size={24} className="text-militant-rouge" aria-hidden /> Assistant CG
      </h2>
      <p className="mt-2 text-[15px]">
        La bulle « Une question ? » en bas à droite de toutes les pages publiques. Elle oriente les visiteurs vers le bon
        service, sans jamais répondre sur le fond. Les demandes transmises arrivent dans{" "}
        <Link
          href="/suivi-actions/chatbot"
          className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
        >
          Demandes chatbot
        </Link>
        .
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-militant-ardoise py-4">
        <p className="text-[16px] font-bold">Afficher l&apos;assistant sur le site</p>
        <Interrupteur actif={on} onChange={changer} label="Afficher l'Assistant CG sur le site" etatOn="Activé" etatOff="Coupé" enCours={enCours} />
      </div>
      {erreur && (
        <p role="alert" className="mt-3 font-semibold text-militant-bordeaux">
          {erreur}
        </p>
      )}
      <p aria-live="polite" className={`mt-5 border-l-[6px] py-1 pl-4 font-bold ${on ? "border-militant-rouge" : "border-militant-ardoise"}`}>
        Sur le site maintenant : {on ? "l'assistant est visible" : "l'assistant est masqué"}.
      </p>
    </section>
  );
}
