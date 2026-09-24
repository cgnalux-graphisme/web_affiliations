"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { getSupabaseAuth } from "./lib/supabase";
import { BUCKET_PHOTOS, cheminDepuisUrl } from "./lib/photos";

/**
 * Suppression définitive d'une action, en deux temps (bouton puis confirmation).
 * Ordre : fichiers photo du bucket d'abord, puis la ligne site_actions
 * (les lignes site_photos et site_videos suivent par ON DELETE CASCADE).
 */
export default function SuppressionAction({
  actionId,
  titre,
  urlsPhotos,
  nbVideos,
}: {
  actionId: string;
  titre: string;
  urlsPhotos: string[];
  nbVideos: number;
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function supprimer() {
    setEnCours(true);
    setErreur("");
    const supabase = getSupabaseAuth();

    // 1) Fichiers photo. En cas d'échec réel (réseau, session expirée), on n'efface pas
    //    l'action : sinon ses photos resteraient en ligne sans plus rien pour les retrouver.
    const chemins = urlsPhotos.flatMap((u) => cheminDepuisUrl(u) ?? []);
    if (chemins.length) {
      const { data, error } = await supabase.storage.from(BUCKET_PHOTOS).remove(chemins);
      if (error || (data?.length ?? 0) < chemins.length) {
        console.error("remove", error, data);
        setEnCours(false);
        setErreur(
          "Les photos de cette action n'ont pas pu être effacées du stockage, l'action n'a donc pas été supprimée. " +
            "Vérifiez votre connexion ou reconnectez-vous, puis réessayez."
        );
        return;
      }
    }

    // 2) L'action (photos et vidéos en base suivent en cascade).
    const { data: supprimees, error } = await supabase.from("site_actions").delete().eq("id", actionId).select("id");
    if (error || !supprimees?.length) {
      console.error(error);
      setEnCours(false);
      setErreur(
        chemins.length
          ? "Les photos ont été effacées, mais l'action n'a pas pu être supprimée. Reconnectez-vous puis réessayez."
          : "L'action n'a pas pu être supprimée. Votre session a peut-être expiré : reconnectez-vous puis réessayez."
      );
      return;
    }

    router.push(`/suivi-actions?supprimee=${encodeURIComponent(titre)}`);
    router.refresh();
  }

  const elements = [
    urlsPhotos.length ? `${urlsPhotos.length} photo${urlsPhotos.length > 1 ? "s" : ""}` : null,
    nbVideos ? `${nbVideos} vidéo${nbVideos > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="titre-suppression"
      className="max-w-2xl mx-auto rounded-2xl border-2 border-militant-bordeaux bg-white p-6"
    >
      <h2 id="titre-suppression" className="flex items-center gap-2 text-lg font-bold text-militant-bordeaux">
        <Trash2 size={18} aria-hidden /> Supprimer l&apos;action
      </h2>
      <p className="mt-1.5 text-sm text-militant-charbon">
        Suppression définitive, sans retour possible
        {elements.length ? ` : l'action, ses ${elements.join(" et ses ")}` : ""}. Elle disparaît aussi du site
        public.
      </p>

      {!confirmation ? (
        <button
          type="button"
          onClick={() => setConfirmation(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-militant-bordeaux px-4 py-2 text-sm font-bold text-militant-bordeaux transition-colors hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
        >
          <Trash2 size={16} aria-hidden /> Supprimer cette action
        </button>
      ) : (
        <div role="alertdialog" aria-labelledby="question-suppression" className="mt-4 rounded-xl bg-militant-charbon p-4 text-white">
          <p id="question-suppression" className="font-bold">
            Supprimer définitivement « {titre} » ?
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={supprimer}
              disabled={enCours}
              autoFocus
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-4 py-2.5 text-sm font-bold text-white ring-2 ring-transparent transition-shadow hover:ring-white focus:outline-none focus-visible:ring-white disabled:opacity-60"
            >
              {enCours ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} aria-hidden />}
              {enCours ? "Suppression…" : "Oui, supprimer définitivement"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmation(false);
                setErreur("");
              }}
              disabled={enCours}
              className="inline-flex items-center justify-center rounded-xl border-2 border-white px-4 py-2 text-sm font-bold text-white hover:bg-white hover:text-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-semibold text-militant-bordeaux">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}
    </section>
  );
}
