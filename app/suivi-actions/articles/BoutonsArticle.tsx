"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, EyeOff, Globe, Loader2, Trash2 } from "lucide-react";
import { getSupabaseAuth } from "../../../lib/supabase";
import { BUCKET_BLOG, RUBRIQUES, STATUT_BROUILLON, STATUT_PUBLIE, cheminImageDepuisUrl, type Categorie } from "../../../lib/articles";
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

const BOUTON =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border-2 px-3.5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";

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
        className={
          publie
            ? `${BOUTON} border-militant-charbon hover:bg-militant-charbon hover:text-white`
            : `${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`
        }
      >
        {enCours ? <Loader2 size={14} className="animate-spin" aria-hidden /> : publie ? <EyeOff size={14} aria-hidden /> : <Globe size={14} aria-hidden />}
        {publie ? "Dépublier" : "Publier"}
      </button>
      {erreur && (
        <span role="alert" className="text-xs font-semibold text-militant-bordeaux">
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
    <div role="alertdialog" aria-labelledby={`question-${article.id}`} className="rounded-xl border-2 border-militant-bordeaux bg-white p-3">
      <p id={`question-${article.id}`} className="text-sm font-bold">
        Supprimer définitivement « {article.titre} » ?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours}
          autoFocus
          className={`${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`}
        >
          {enCours ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
          {enCours ? "Suppression…" : "Oui, supprimer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmation(false);
            setErreur("");
          }}
          disabled={enCours}
          className={`${BOUTON} border-militant-charbon hover:bg-militant-charbon hover:text-white`}
        >
          Annuler
        </button>
      </div>
    </div>
  );

  const message = erreur && (
    <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-militant-bordeaux">
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
            className={`${BOUTON} border-transparent px-2.5 text-militant-bordeaux hover:border-militant-bordeaux`}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        )}
        {message}
      </div>
    );
  }

  return (
    <section aria-labelledby="titre-suppression" className="mx-auto max-w-3xl rounded-2xl border-2 border-militant-bordeaux bg-white p-6">
      <h2 id="titre-suppression" className="flex items-center gap-2 text-lg font-bold text-militant-bordeaux">
        <Trash2 size={18} aria-hidden /> Supprimer l&apos;article
      </h2>
      <p className="mt-1.5 text-sm">
        Suppression définitive, sans retour possible{article.image_couverture ? ", image de couverture comprise" : ""}. Il
        disparaît aussi du site public.
      </p>
      <div className="mt-4">
        {confirmation ? (
          question
        ) : (
          <button
            type="button"
            onClick={() => setConfirmation(true)}
            className={`${BOUTON} border-militant-bordeaux text-militant-bordeaux hover:bg-militant-bordeaux hover:text-white`}
          >
            <Trash2 size={16} aria-hidden /> Supprimer cet article
          </button>
        )}
      </div>
      {message}
    </section>
  );
}
