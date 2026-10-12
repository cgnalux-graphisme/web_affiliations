"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, EyeOff, Globe, Trash2 } from "lucide-react";
import { IconeChargement } from "../../../Chargement";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { BUCKET_BLOG, RUBRIQUES, STATUT_BROUILLON, STATUT_PUBLIE, cheminImageDepuisUrl, type Categorie } from "../../../../lib/articles";
import { rafraichirBlog } from "./revalidation";

type ArticleCible = {
  id: string;
  titre: string;
  slug: string;
  statut: string;
  image_couverture: string | null;
  date_publication: string | null;
  aContenu: boolean;
  /** Rubrique (retour à la bonne liste après suppression) ; absent = article. */
  categorie?: Categorie;
};

const BOUTON = "ecg-btn ecg-btn-petit";

/** Publier / dépublier en un clic. Un article sans contenu ne peut pas être publié. */
export function BoutonPublication({ article }: { article: ArticleCible }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const publie = article.statut === STATUT_PUBLIE;

  async function basculer() {
    setEnCours(true);
    setErreur("");
    const maj = publie
      ? { statut: STATUT_BROUILLON }
      : { statut: STATUT_PUBLIE, date_publication: article.date_publication ?? new Date().toISOString() };
    const { data, error } = await getSupabaseAuth().from("site_articles").update(maj).eq("id", article.id).select("id");
    if (error || !data?.length) {
      console.error(error);
      setEnCours(false);
      setErreur("Modification impossible. Reconnectez-vous puis réessayez.");
      return;
    }
    await rafraichirBlog([article.slug]);
    router.refresh();
    setEnCours(false);
  }

  if (!publie && !article.aContenu) {
    return <span className="text-sm">Contenu à rédiger avant publication</span>;
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={basculer}
        disabled={enCours}
        aria-label={`${publie ? "Dépublier" : "Publier"} : ${article.titre}`}
        className={publie ? BOUTON : `${BOUTON} ecg-btn-principal`}
      >
        {enCours ? <IconeChargement size={14} /> : publie ? <EyeOff size={14} aria-hidden /> : <Globe size={14} aria-hidden />}
        {publie ? "Dépublier" : "Publier"}
      </button>
      {erreur && (
        <span role="alert" className="ecg-erreur mt-0 text-xs">
          {erreur}
        </span>
      )}
    </span>
  );
}

/**
 * Suppression définitive en deux temps (bouton puis confirmation).
 * L'image de couverture est effacée du stockage d'abord ; si ça échoue, l'article est conservé.
 */
export function SuppressionArticle({ article, compact }: { article: ArticleCible; compact?: boolean }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function supprimer() {
    setEnCours(true);
    setErreur("");
    const supabase = getSupabaseAuth();

    const chemin = cheminImageDepuisUrl(article.image_couverture);
    if (chemin) {
      const { data, error } = await supabase.storage.from(BUCKET_BLOG).remove([chemin]);
      if (error || !data?.length) {
        console.error("remove", error, data);
        setEnCours(false);
        setErreur(
          "L'image de couverture n'a pas pu être effacée, l'article n'a donc pas été supprimé. Reconnectez-vous puis réessayez."
        );
        return;
      }
    }

    const { data, error } = await supabase.from("site_articles").delete().eq("id", article.id).select("id");
    if (error || !data?.length) {
      console.error(error);
      setEnCours(false);
      setErreur("L'article n'a pas pu être supprimé. Votre session a peut-être expiré : reconnectez-vous puis réessayez.");
      return;
    }

    await rafraichirBlog([article.slug]);
    router.push(`${RUBRIQUES[article.categorie ?? "article"].admin}?supprime=${encodeURIComponent(article.titre)}`);
    router.refresh();
  }

  const question = (
    <div role="alertdialog" aria-labelledby={`question-${article.id}`} className="ecg-alerte ecg-alerte-erreur block p-3">
      <p id={`question-${article.id}`} className="text-sm font-semibold">
        Supprimer définitivement « {article.titre} » ?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours}
          autoFocus
          className={`${BOUTON} ecg-btn-danger`}
        >
          {enCours ? <IconeChargement size={14} /> : <Trash2 size={14} aria-hidden />}
          {enCours ? "Suppression…" : "Oui, supprimer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmation(false);
            setErreur("");
          }}
          disabled={enCours}
          className={`${BOUTON}`}
        >
          Annuler
        </button>
      </div>
    </div>
  );

  const message = erreur && (
    <p role="alert" className="ecg-erreur text-xs">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
      {erreur}
    </p>
  );

  if (compact) {
    return (
      <div>
        {confirmation ? (
          question
        ) : (
          <button
            type="button"
            onClick={() => setConfirmation(true)}
            aria-label={`Supprimer : ${article.titre}`}
            title="Supprimer"
            className={`${BOUTON} ecg-btn-fantome ecg-btn-fantome-danger`}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        )}
        {message}
      </div>
    );
  }

  return (
    <section aria-labelledby="titre-suppression" className="ecg-panneau ecg-panneau-danger">
      <div className="ecg-panneau-tete">
        <div>
          <h2 id="titre-suppression">
            <Trash2 size={18} aria-hidden /> Supprimer l&apos;article
          </h2>
          <p>
            Suppression définitive, sans retour possible{article.image_couverture ? ", image de couverture comprise" : ""}.
            Il disparaît aussi du site public.
          </p>
        </div>
      </div>
      <div className="ecg-panneau-corps">
        {confirmation ? (
          question
        ) : (
          <button
            type="button"
            onClick={() => setConfirmation(true)}
            className={`${BOUTON} ecg-btn-danger-contour`}
          >
            <Trash2 size={16} aria-hidden /> Supprimer cet article
          </button>
        )}
        {message}
      </div>
    </section>
  );
}
