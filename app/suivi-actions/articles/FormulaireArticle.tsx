"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Clock, Eye, FileText, Globe, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { getSupabaseAuth } from "../../../lib/supabase";
import { dateFrToIso, formatDateFr } from "../../../lib/dates";
import { preparerPhoto } from "../../../lib/photos";
import { useOnceSubmit } from "../../../lib/use-once-submit";
import {
  BUCKET_BLOG,
  STATUT_BROUILLON,
  STATUT_PUBLIE,
  aujourdhui,
  cheminCouverture,
  cheminImageDepuisUrl,
  dateArticle,
  lignes,
  lignesSourcesInvalides,
  slugifier,
  slugValide,
  tempsLecture,
  type StatutArticle,
} from "../../../lib/articles";
import EditeurTexte from "./EditeurTexte";
import { rafraichirBlog } from "./revalidation";

/** Ligne de site_articles, pour le mode modification. */
export type ArticleEnregistre = {
  id: string;
  titre: string;
  slug: string;
  chapo: string | null;
  points_cles: string | null;
  contenu: string | null;
  image_couverture: string | null;
  sources: string | null;
  statut: string;
  date_publication: string | null;
};

type Form = {
  titre: string;
  slug: string;
  chapo: string;
  pointsCles: string;
  contenu: string;
  sources: string;
  statut: StatutArticle;
  datePublication: string; // jj/mm/aaaa
};
type Erreurs = Partial<Record<keyof Form | "image", string>>;

/** Couverture : celle enregistrée (url), une nouvelle (fichier local) ou aucune. */
type Couverture = { url: string; file?: undefined } | { file: File; apercu: string; url?: undefined } | null;

const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX = 20 * 1024 * 1024;
const CHAPO_MAX = 400;
// RLS : écriture réservée aux super admins → refus si la session a expiré.
const CODE_ACCES_REFUSE = "42501";

/** Pré-remplissage d'un nouvel article (depuis un item de la veille). */
export type PreRemplissage = { titre: string; sources: string };

function formDepuis(a?: ArticleEnregistre, pre?: PreRemplissage): Form {
  if (!a && pre) {
    return { ...formDepuis(), titre: pre.titre, slug: slugifier(pre.titre), sources: pre.sources };
  }
  return {
    titre: a?.titre ?? "",
    slug: a?.slug ?? "",
    chapo: a?.chapo ?? "",
    pointsCles: a?.points_cles ?? "",
    contenu: a?.contenu ?? "",
    sources: a?.sources ?? "",
    statut: a?.statut === STATUT_PUBLIE ? STATUT_PUBLIE : STATUT_BROUILLON,
    datePublication: dateArticle(a?.date_publication),
  };
}

/** Formulaire d'article : création (sans `article`) ou modification. */
export default function FormulaireArticle({
  article,
  preRemplissage,
}: {
  article?: ArticleEnregistre;
  preRemplissage?: PreRemplissage;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => formDepuis(article, preRemplissage));
  // Un nouvel article suit son titre ; un article existant garde son adresse (liens déjà partagés).
  const [slugManuel, setSlugManuel] = useState(Boolean(article));
  const [couverture, setCouverture] = useState<Couverture>(() =>
    article?.image_couverture ? { url: article.image_couverture } : null
  );
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [enCours, setEnCours] = useState(false);
  const [progression, setProgression] = useState("");
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const { acquire, release } = useOnceSubmit();
  const champFichier = useRef<HTMLInputElement>(null);

  // Libère l'aperçu local de l'image quand il est remplacé ou à la sortie.
  const apercu = couverture?.file ? couverture.apercu : null;
  useEffect(() => () => {
    if (apercu) URL.revokeObjectURL(apercu);
  }, [apercu]);

  function set<K extends keyof Form>(cle: K, valeur: Form[K]) {
    setForm((f) => ({ ...f, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
  }

  function changerTitre(titre: string) {
    setForm((f) => ({ ...f, titre, slug: slugManuel ? f.slug : slugifier(titre) }));
    setErreurs((e) => ({ ...e, titre: undefined, slug: slugManuel ? e.slug : undefined }));
  }

  function choisirImage(input: HTMLInputElement) {
    // Copier le fichier AVANT de vider le champ : vider le champ vide aussi sa FileList (Chrome, Edge).
    const file = input.files?.[0] ?? null;
    input.value = ""; // permet de rechoisir la même image ensuite
    if (!file) return;
    if (!TYPES_IMAGE.includes(file.type) || file.size > TAILLE_MAX) {
      setErreurs((e) => ({ ...e, image: "Image non ajoutée : JPEG, PNG ou WebP de 20 Mo maximum." }));
      return;
    }
    setErreurs((e) => ({ ...e, image: undefined }));
    setCouverture({ file, apercu: URL.createObjectURL(file) });
  }

  function valider(): boolean {
    const e: Erreurs = {};
    if (!form.titre.trim()) e.titre = "Indiquez un titre";
    if (!form.slug) e.slug = "Indiquez l'adresse de l'article";
    else if (!slugValide(form.slug)) e.slug = "Uniquement des lettres minuscules sans accent, des chiffres et des tirets";
    if (form.chapo.length > CHAPO_MAX) e.chapo = `${CHAPO_MAX} caractères maximum`;
    const invalides = lignesSourcesInvalides(form.sources);
    if (invalides.length) {
      e.sources = `Ligne${invalides.length > 1 ? "s" : ""} ${invalides.join(", ")} : chaque ligne doit contenir un lien complet (https://…)`;
    }
    if (form.datePublication && !dateFrToIso(form.datePublication)) e.datePublication = "Date invalide (format jj/mm/aaaa)";
    if (form.statut === STATUT_PUBLIE && !form.contenu.trim()) e.contenu = "Un article publié doit avoir un contenu";
    setErreurs(e);
    return Object.keys(e).length === 0;
  }

  /** Horodatage à enregistrer : inchangé si la date n'a pas bougé, maintenant pour aujourd'hui, sinon le jour choisi. */
  function horodatage(): string | null {
    const saisie = form.datePublication || (form.statut === STATUT_PUBLIE ? aujourdhui() : "");
    if (!saisie) return null;
    if (article?.date_publication && saisie === dateArticle(article.date_publication)) return article.date_publication;
    if (saisie === aujourdhui()) return new Date().toISOString();
    return `${dateFrToIso(saisie)}T00:00:00Z`;
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!acquire() || enCours) return;
    if (!valider()) {
      release();
      return;
    }
    setEnCours(true);
    setErreurEnvoi("");

    const donnees = {
      titre: form.titre.trim(),
      slug: form.slug,
      chapo: form.chapo.trim() || null,
      points_cles: lignes(form.pointsCles).join("\n") || null,
      contenu: form.contenu.trim() || null,
      sources: form.sources.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n") || null,
      statut: form.statut,
      date_publication: horodatage(),
    };

    try {
      const supabase = getSupabaseAuth();
      setProgression("Enregistrement de l'article…");
      const { data: ligne, error } = article
        ? await supabase.from("site_articles").update(donnees).eq("id", article.id).select("id").single()
        : await supabase.from("site_articles").insert(donnees).select("id").single();

      if (error) {
        release();
        if (error.code === "23505") {
          setErreurs((x) => ({ ...x, slug: "Cette adresse est déjà utilisée par un autre article. Modifiez-la." }));
        } else if (error.code === CODE_ACCES_REFUSE || error.code === "PGRST116") {
          setErreurEnvoi("Votre session a expiré ou ne permet pas l'enregistrement. Reconnectez-vous puis réessayez.");
        } else {
          console.error(error);
          setErreurEnvoi(
            `L'article n'a pas pu être enregistré (${error.message}). Vérifiez votre connexion et réessayez.`
          );
        }
        return;
      }

      // Image de couverture : un échec ici n'annule pas l'enregistrement de l'article.
      const imageOk = await synchroniserCouverture(ligne.id);
      await rafraichirBlog([form.slug, article?.slug ?? ""]);

      if (!imageOk) {
        router.push(`/suivi-actions/articles/${ligne.id}/modifier?image=erreur`);
      } else {
        router.push(`/suivi-actions/articles?enregistre=${ligne.id}`);
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      release();
      setErreurEnvoi("L'article n'a pas pu être enregistré. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
      setProgression("");
    }
  }

  /** Envoie la nouvelle image, la rattache à l'article, puis efface l'ancienne. Retourne false en cas d'échec. */
  async function synchroniserCouverture(articleId: string): Promise<boolean> {
    const ancienne = article?.image_couverture ?? null;
    const nouvelleUrl = couverture?.url ?? null;
    if (!couverture?.file && nouvelleUrl === ancienne) return true;

    const supabase = getSupabaseAuth();
    const stockage = supabase.storage.from(BUCKET_BLOG);
    let url: string | null = null;
    let chemin: string | null = null;

    if (couverture?.file) {
      setProgression("Envoi de l'image de couverture…");
      chemin = cheminCouverture(articleId, crypto.randomUUID());
      try {
        const jpeg = await preparerPhoto(couverture.file);
        const { error } = await stockage.upload(chemin, jpeg, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw error;
      } catch (err) {
        console.error(err);
        return false;
      }
      url = stockage.getPublicUrl(chemin).data.publicUrl;
    }

    const { error } = await supabase.from("site_articles").update({ image_couverture: url }).eq("id", articleId);
    if (error) {
      console.error(error);
      if (chemin) await stockage.remove([chemin]);
      return false;
    }
    // L'ancienne image n'est plus référencée : on l'efface (un échec ne laisse qu'un fichier inutilisé).
    const ancienChemin = cheminImageDepuisUrl(ancienne);
    if (ancienChemin) {
      const { error: errRetrait } = await stockage.remove([ancienChemin]);
      if (errRetrait) console.error("remove", ancienChemin, errRetrait);
    }
    return true;
  }

  const points = lignes(form.pointsCles);
  const minutes = tempsLecture(form.chapo, form.pointsCles, form.contenu);
  const imageAffichee = couverture?.file ? couverture.apercu : couverture?.url;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="border-b-[6px] border-militant-charbon pb-4">
        <Link
          href="/suivi-actions/articles"
          className="inline-flex items-center gap-1 text-sm font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          <ArrowLeft size={15} aria-hidden /> Tous les articles
        </Link>
        <h1 className="mt-3 font-condensed text-5xl font-extrabold uppercase leading-[0.9]">
          {article ? "Modifier l'article" : "Nouvel article"}
        </h1>
        {article && (
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-lg font-semibold">{article.titre}</p>
            <Link
              href={`/suivi-actions/articles/${article.id}/apercu`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
            >
              <Eye size={15} aria-hidden /> Aperçu de la version enregistrée
            </Link>
          </div>
        )}
        {!article && preRemplissage && (
          <p className="mt-3 border-l-4 border-militant-rouge pl-3 text-sm">
            Pré-rempli depuis la veille : titre repris de l&apos;article d&apos;origine et lien ajouté aux sources.
            Reformulez avec vos propres mots avant de publier.
          </p>
        )}
      </header>

      <form onSubmit={enregistrer} noValidate className="overflow-hidden rounded-2xl border border-militant-ardoise bg-white">
        {/* ── TITRE ── */}
        <TitreSection>1. Titre et accroche</TitreSection>
        <div className="space-y-5 px-6 py-6">
          <Champ id="titre" label="Titre *" erreur={erreurs.titre} aide="Court et percutant : c'est lui que le lecteur voit en premier.">
            <input
              id="titre"
              className={champ(erreurs.titre)}
              value={form.titre}
              onChange={(e) => changerTitre(e.target.value)}
              maxLength={160}
              placeholder="Ex. Index : ce que le gouvernement ne vous dit pas"
            />
          </Champ>

          <Champ
            id="slug"
            label="Adresse de l'article *"
            erreur={erreurs.slug}
            aide={
              article
                ? "Changer l'adresse d'un article déjà partagé casse les anciens liens."
                : "Générée depuis le titre. Vous pouvez la raccourcir."
            }
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className={`flex min-w-0 flex-1 items-center rounded-xl border bg-white focus-within:ring-2 focus-within:ring-militant-rouge ${
                  erreurs.slug ? "border-2 border-militant-bordeaux" : "border-militant-ardoise"
                }`}
              >
                <span className="shrink-0 pl-3 text-sm font-semibold">/blog/</span>
                <input
                  id="slug"
                  className="w-full min-w-0 rounded-xl bg-white py-2.5 pr-3 text-sm focus:outline-none"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManuel(true);
                    set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  maxLength={80}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSlugManuel(false);
                  set("slug", slugifier(form.titre));
                }}
                className={BOUTON_SECONDAIRE}
              >
                <RefreshCw size={15} aria-hidden /> Depuis le titre
              </button>
            </div>
          </Champ>

          <Champ
            id="chapo"
            label="Chapô"
            erreur={erreurs.chapo}
            aide="L'accroche : deux ou trois phrases qui donnent envie de lire la suite."
          >
            <textarea
              id="chapo"
              className={`${champ(erreurs.chapo)} min-h-[90px] resize-y`}
              value={form.chapo}
              onChange={(e) => set("chapo", e.target.value)}
              rows={3}
              placeholder="Ex. Le gouvernement veut toucher à l'indexation automatique des salaires. Voici ce que ça change sur votre fiche de paie."
            />
            <p className={`mt-1 text-right text-xs tabular-nums ${form.chapo.length > CHAPO_MAX ? "font-bold text-militant-bordeaux" : ""}`}>
              {form.chapo.length}/{CHAPO_MAX}
            </p>
          </Champ>
        </div>

        {/* ── EN BREF ── */}
        <TitreSection>2. En bref</TitreSection>
        <div className="space-y-4 px-6 py-6">
          <Champ
            id="points-cles"
            label="Points clés"
            aide="Le résumé pour le lecteur pressé, affiché en haut de l'article. Une ligne par point, 3 à 5 points courts."
          >
            <textarea
              id="points-cles"
              className={`${champ()} min-h-[130px] resize-y`}
              value={form.pointsCles}
              onChange={(e) => set("pointsCles", e.target.value)}
              rows={5}
              placeholder={"L'index est menacé\nUne perte de 150 € par mois en moyenne\nManifestation le 14/10 à Bruxelles"}
            />
          </Champ>
          {points.length > 0 && (
            <div aria-label="Aperçu de l'encart En bref" className="rounded-2xl bg-militant-bordeaux p-5 text-white">
              <p className="font-condensed text-2xl font-extrabold uppercase leading-none">En bref</p>
              <ul className="mt-3 space-y-1.5">
                {points.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] font-semibold leading-snug">
                    <span aria-hidden className="mt-[0.45em] h-2 w-2 shrink-0 bg-white" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── CONTENU ── */}
        <TitreSection>3. Contenu</TitreSection>
        <div className="space-y-2 px-6 py-6">
          <p id="libelle-contenu" className="text-sm font-semibold">
            Texte de l&apos;article{form.statut === STATUT_PUBLIE ? " *" : ""}
          </p>
          <p className="text-xs">
            Des sous-titres toutes les quelques lignes et des paragraphes courts : le lecteur parcourt avant de lire.
          </p>
          <EditeurTexte
            valeur={form.contenu}
            onChange={(html) => set("contenu", html)}
            idLibelle="libelle-contenu"
            erreur={Boolean(erreurs.contenu)}
            disabled={enCours}
          />
          {erreurs.contenu && <p className="text-xs font-semibold text-militant-bordeaux">{erreurs.contenu}</p>}
          <p className="flex items-center gap-1.5 text-sm">
            <Clock size={15} aria-hidden /> Temps de lecture estimé : {minutes} min
          </p>
        </div>

        {/* ── IMAGE ── */}
        <TitreSection>4. Image de couverture</TitreSection>
        <div className="space-y-3 px-6 py-6">
          <p className="text-xs">Format paysage de préférence. L&apos;image est réduite automatiquement avant l&apos;envoi.</p>
          {imageAffichee ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local ou image du bucket */}
              <img src={imageAffichee} alt="Aperçu de l'image de couverture" className="aspect-[16/9] w-full rounded-xl object-cover" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => champFichier.current?.click()} disabled={enCours} className={BOUTON_SECONDAIRE}>
                  <ImagePlus size={16} aria-hidden /> Remplacer l&apos;image
                </button>
                <button type="button" onClick={() => setCouverture(null)} disabled={enCours} className={BOUTON_SECONDAIRE}>
                  <X size={16} aria-hidden /> Retirer l&apos;image
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => champFichier.current?.click()}
              disabled={enCours}
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-militant-ardoise text-[15px] font-bold transition-colors hover:border-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
            >
              <ImagePlus size={28} aria-hidden className="text-militant-rouge" />
              Choisir une image
            </button>
          )}
          <input
            ref={champFichier}
            type="file"
            accept={TYPES_IMAGE.join(",")}
            onChange={(e) => choisirImage(e.currentTarget)}
            className="sr-only"
            tabIndex={-1}
            aria-label="Image de couverture"
          />
          {erreurs.image && <p className="text-xs font-semibold text-militant-bordeaux">{erreurs.image}</p>}
        </div>

        {/* ── SOURCES ── */}
        <TitreSection>5. Sources</TitreSection>
        <div className="px-6 py-6">
          <Champ
            id="sources"
            label="Liens vers les sources"
            erreur={erreurs.sources}
            aide="Un lien par ligne. Vous pouvez le faire précéder du nom du média : « Le Soir – https://… »."
          >
            <textarea
              id="sources"
              className={`${champ(erreurs.sources)} min-h-[100px] resize-y`}
              value={form.sources}
              onChange={(e) => set("sources", e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={"RTBF – https://www.rtbf.be/…\nhttps://www.lesoir.be/…"}
            />
          </Champ>
        </div>

        {/* ── PUBLICATION ── */}
        <TitreSection>6. Publication</TitreSection>
        <div className="space-y-5 px-6 py-6">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Statut</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Choix
                checked={form.statut === STATUT_BROUILLON}
                onChange={() => set("statut", STATUT_BROUILLON)}
                icone={<FileText size={16} aria-hidden />}
                label="Brouillon"
                detail="Invisible sur le site"
              />
              <Choix
                checked={form.statut === STATUT_PUBLIE}
                onChange={() => {
                  set("statut", STATUT_PUBLIE);
                  if (!form.datePublication) set("datePublication", aujourdhui());
                }}
                icone={<Globe size={16} aria-hidden />}
                label="Publié"
                detail="Visible dans Actualités"
              />
            </div>
          </fieldset>

          <Champ
            id="date-publication"
            label="Date de publication"
            erreur={erreurs.datePublication}
            aide="Vide = date du jour à la publication. Une date future : l'article n'apparaît sur le site qu'à partir de ce jour-là."
          >
            <input
              id="date-publication"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="jj/mm/aaaa"
              maxLength={10}
              className={`${champ(erreurs.datePublication)} sm:max-w-[12rem]`}
              value={form.datePublication}
              onChange={(e) => set("datePublication", formatDateFr(e.target.value))}
            />
          </Champ>
        </div>

        <div className="space-y-3 px-6 pb-6">
          {erreurEnvoi && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border-2 border-militant-bordeaux bg-white px-4 py-3 text-sm">
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
              <p>{erreurEnvoi}</p>
            </div>
          )}
          {Object.values(erreurs).some(Boolean) && !erreurEnvoi && (
            <p role="alert" className="text-center text-sm font-semibold text-militant-bordeaux">
              Certains champs doivent être corrigés avant l&apos;enregistrement.
            </p>
          )}
          <button
            type="submit"
            disabled={enCours}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-militant-bordeaux py-3 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {enCours && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {enCours
              ? progression || "Enregistrement…"
              : form.statut === STATUT_PUBLIE
                ? article?.statut === STATUT_PUBLIE
                  ? "Enregistrer les modifications"
                  : "Publier l'article"
                : "Enregistrer le brouillon"}
          </button>
          <p className="text-center text-xs">* Champs obligatoires</p>
        </div>
      </form>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
const BOUTON_SECONDAIRE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-militant-charbon bg-white px-4 py-2 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-50";

function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-y-2 border-militant-charbon bg-white px-6 py-2.5 font-condensed text-xl font-extrabold first:border-t-0">
      {children}
    </h2>
  );
}

function Champ({
  id,
  label,
  erreur,
  aide,
  children,
}: {
  id: string;
  label: string;
  erreur?: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {aide && <p className="mb-1.5 text-xs">{aide}</p>}
      {children}
      {erreur && <p className="mt-1 text-xs font-semibold text-militant-bordeaux">{erreur}</p>}
    </div>
  );
}

function Choix({
  checked,
  onChange,
  icone,
  label,
  detail,
}: {
  checked: boolean;
  onChange: () => void;
  icone: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-4 py-3 transition-colors ${
        checked ? "border-militant-rouge ring-1 ring-militant-rouge" : "border-militant-ardoise hover:border-militant-charbon"
      }`}
    >
      <input type="radio" name="statut" checked={checked} onChange={onChange} className="mt-1 accent-militant-rouge" />
      <span>
        <span className="flex items-center gap-1.5 text-[15px] font-bold">
          <span className={checked ? "text-militant-rouge" : ""}>{icone}</span>
          {label}
        </span>
        <span className="block text-xs">{detail}</span>
      </span>
    </label>
  );
}

function champ(erreur?: string) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-militant-rouge ${
    erreur ? "border-2 border-militant-bordeaux" : "border-militant-ardoise focus:border-militant-charbon"
  }`;
}
