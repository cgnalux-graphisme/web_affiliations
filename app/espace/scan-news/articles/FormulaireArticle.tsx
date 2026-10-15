"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Clock,
  Eye,
  FileText,
  Globe,
  ImagePlus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { Alerte, EnteteEcran } from "../../_partage/ui";
import { dateFrToIso, formatDateFr } from "../../../../lib/dates";
import { imageAcceptee, MESSAGE_IMAGE_REFUSEE, TYPES_IMAGE } from "../../../../lib/image-deposee";
import { preparerPhoto } from "../../../../lib/photos";
import { useOnceSubmit } from "../../../../lib/use-once-submit";
import {
  BUCKET_BLOG,
  CATEGORIE_EXPLICATION,
  RUBRIQUES,
  categorieDe,
  type Categorie,
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
} from "../../../../lib/articles";
import type { Brouillon } from "../../../../lib/redaction-ia";
import EditeurTexte from "./EditeurTexte";
import { IconeChargement } from "../../../Chargement";
import ZoneDepotImages from "../../../ZoneDepotImages";
import PanneauNote, { RAPPEL_NOTE, type ResultatNote } from "./PanneauNote";
import PanneauRedaction, { RAPPEL_IA, type DemandeBrouillon, type EtatIA, type SourcePanneau } from "./PanneauRedaction";
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
  /** « article » (blog) ou « explication » (On vous explique) ; absent = article. */
  categorie?: string | null;
  /** Chemin de la note FGTB d'origine dans le bucket privé notes-sources (On vous explique). */
  document_source?: string | null;
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

/** Résumé, pour le bandeau du brouillon proposé, de la matière réellement utilisée par l'IA. */
function phraseMatiere(b: Brouillon): string {
  const lues = b.lectures.filter((l) => l.etat !== "echec").length;
  const parties = [
    b.nb_sources > 1 ? `les ${b.nb_sources} résumés du flux` : "le résumé du flux",
    lues && `${lues} article${lues > 1 ? "s" : ""} lu${lues > 1 ? "s" : ""} par l'IA`,
    b.textes_colles && `${b.textes_colles} texte${b.textes_colles > 1 ? "s" : ""} collé${b.textes_colles > 1 ? "s" : ""}`,
    b.notes_utilisees && "vos notes",
  ].filter(Boolean) as string[];
  const debut = b.nb_sources > 1 ? `Synthèse de ${b.nb_sources} sources, à partir de ` : "Rédigé à partir de ";
  return `${debut}${parties.join(", ").replace(/, ([^,]*)$/, " et $1")}.`;
}

/** Formulaire d'article : création (sans `article`) ou modification. */
export default function FormulaireArticle({
  article,
  categorie: categorieNouvelle,
  lienNote,
  preRemplissage,
  sourcesIA,
  consignesIA,
  origine,
  mettreEnAvantIA,
}: {
  article?: ArticleEnregistre;
  /** Rubrique d'un nouvel article (sinon celle de l'article modifié). */
  categorie?: Categorie;
  /** Lien temporaire de téléchargement de la note d'origine (On vous explique). */
  lienNote?: string | null;
  preRemplissage?: PreRemplissage;
  /** Articles du fil à l'origine de l'article (un seul, ou ceux d'un sujet du Check IA) : active la rédaction assistée. */
  sourcesIA?: SourcePanneau[];
  /** Consignes pré-remplies (angle proposé par le Check IA). */
  consignesIA?: string;
  /** D'où vient le pré-remplissage (message sous le titre). */
  origine?: "fil" | "check-ia";
  /** Ouverture depuis « Brouillon IA » : le panneau de rédaction assistée reçoit le focus. */
  mettreEnAvantIA?: boolean;
}) {
  const router = useRouter();
  const categorie: Categorie = article ? categorieDe(article.categorie) : (categorieNouvelle ?? "article");
  const rubrique = RUBRIQUES[categorie];
  const explication = categorie === CATEGORIE_EXPLICATION;
  // Note FGTB importée (On vous explique) : chemin de l'archive et rappel de vérification.
  const [documentSource, setDocumentSource] = useState<string | null>(article?.document_source ?? null);
  const [vulgarise, setVulgarise] = useState(false);
  // Photo de couverture proposée par l'IA pour la note vulgarisée (affichée, non enregistrée).
  const [suggestionNote, setSuggestionNote] = useState("");
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
  const [ia, setIa] = useState<EtatIA>({ etape: "inactif" });
  // L'éditeur riche ne relit sa valeur qu'à sa création : on le recrée après un brouillon IA.
  const [versionEditeur, setVersionEditeur] = useState(0);
  const panneauIA = useRef<HTMLElement>(null);

  async function proposerBrouillon(demande: DemandeBrouillon) {
    if (!sourcesIA?.length || ia.etape === "en_cours") return;
    const dejaRedige = Boolean(form.contenu.trim() || form.chapo.trim() || form.pointsCles.trim());
    if (dejaRedige && !window.confirm("Le brouillon de l'IA remplacera le titre, le chapô, les points clés, le contenu et les sources déjà saisis. Continuer ?")) {
      return;
    }
    setIa({ etape: "en_cours", lecture: demande.lire.length > 0 });
    try {
      const reponse = await fetch("/api/redaction/brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demande),
      });
      const json = (await reponse.json().catch(() => ({}))) as { brouillon?: Brouillon; erreur?: string };
      if (!reponse.ok || !json.brouillon) {
        setIa({ etape: "erreur", message: json.erreur ?? "La génération du brouillon a échoué. Réessayez." });
        return;
      }
      const b = json.brouillon;
      // Date et statut restent gérés par le formulaire : le brouillon IA n'y touche pas.
      setForm((f) => ({
        ...f,
        titre: b.titre,
        slug: b.slug,
        chapo: b.chapo,
        pointsCles: b.points_cles,
        contenu: b.contenu,
        sources: b.sources,
      }));
      setSlugManuel(false);
      setErreurs({});
      setVersionEditeur((v) => v + 1);
      setIa({
        etape: "propose",
        avertissement: b.avertissement,
        suggestionImage: b.suggestion_image,
        matiere: phraseMatiere(b),
        reprises: b.reprises,
      });
      // Le résultat s'affiche en tête du panneau : on y ramène la lecture.
      panneauIA.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setIa({ etape: "erreur", message: "Le serveur ne répond pas. Vérifiez votre connexion et réessayez." });
    }
  }

  /** « On vous explique » : la vulgarisation de la note pré-remplit le formulaire (date et statut inchangés). */
  function appliquerNote(r: ResultatNote) {
    const v = r.vulgarisation;
    setForm((f) => ({
      ...f,
      titre: v.titre,
      slug: v.slug,
      chapo: v.chapo,
      pointsCles: v.points_cles,
      contenu: v.contenu,
      sources: v.sources,
    }));
    setDocumentSource(r.document_source);
    setSlugManuel(false);
    setErreurs({});
    setVersionEditeur((n) => n + 1);
    setVulgarise(true);
    setSuggestionNote(v.suggestion_image);
  }

  // Ouverture depuis « Brouillon IA » : le panneau reçoit le focus.
  useEffect(() => {
    if (mettreEnAvantIA && sourcesIA?.length) panneauIA.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (file) accepterImage(file);
  }

  function accepterImage(file: File) {
    if (!imageAcceptee(file)) {
      setErreurs((e) => ({ ...e, image: `Image non ajoutée : ${MESSAGE_IMAGE_REFUSEE}.` }));
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
    // « On vous explique » : une source peut être une simple référence (ex. « Note FGTB 26I107F »).
    const invalides = explication ? [] : lignesSourcesInvalides(form.sources);
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
      categorie,
      document_source: documentSource,
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
        router.push(`/espace/scan-news/articles/${ligne.id}/modifier?image=erreur`);
      } else {
        router.push(`${rubrique.admin}?enregistre=${ligne.id}`);
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
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran
        icone={article ? "pen" : explication ? "upload" : "pen"}
        titre={article ? `Modifier l'${rubrique.singulier}` : rubrique.nouveau}
        description={article ? article.titre : explication ? rubrique.nom : "Les champs marqués d'une * sont obligatoires."}
        actions={
          <>
            <Link href={rubrique.admin} className={BOUTON_SECONDAIRE}>
              <ArrowLeft size={16} aria-hidden /> {rubrique.tous}
            </Link>
            {article && (
              <Link href={`/espace/scan-news/articles/${article.id}/apercu`} className={BOUTON_SECONDAIRE}>
                <Eye size={16} aria-hidden /> Aperçu
              </Link>
            )}
          </>
        }
      />
      {explication && documentSource && (
        <Alerte ton="info" icone={FileText} role={null}>
          Note FGTB d&apos;origine (usage interne) :{" "}
          {lienNote ? (
            <a href={lienNote} className="ecg-lien break-all">
              {documentSource.split("/").pop()?.replace(/^[0-9a-f-]{36}-/i, "")}
            </a>
          ) : (
            <span className="break-all font-semibold">{documentSource.split("/").pop()?.replace(/^[0-9a-f-]{36}-/i, "")}</span>
          )}
        </Alerte>
      )}
      {!article && preRemplissage && ia.etape === "inactif" && (
        <Alerte ton="info" role={null}>
          {origine === "check-ia"
            ? "Pré-rempli depuis le Check IA : intitulé du sujet en titre, liens de toutes ses sources, angle en consignes."
            : "Pré-rempli depuis Scan News : titre repris de l'article d'origine et lien ajouté aux sources."}{" "}
          Reformulez avec vos propres mots avant de publier.
        </Alerte>
      )}

      {explication && !article && (
        <PanneauNote
          dejaRedige={Boolean(form.contenu.trim() || form.chapo.trim() || form.pointsCles.trim())}
          onResultat={appliquerNote}
        />
      )}

      {sourcesIA && sourcesIA.length > 0 && (
        <PanneauRedaction
          refPanneau={panneauIA}
          sources={sourcesIA}
          consignesInitiales={consignesIA}
          ia={ia}
          onLancer={proposerBrouillon}
        />
      )}

      <form onSubmit={enregistrer} noValidate className="ecg-panneau">
        {/* ── TITRE ── */}
        <TitreSection>1. Titre et accroche</TitreSection>
        <div className="space-y-5 px-5 py-5">
          <Champ id="titre" label="Titre *" erreur={erreurs.titre} aide="Court et percutant : c'est lui que le lecteur voit en premier.">
            <input
              id="titre"
              className={champ(erreurs.titre)}
              value={form.titre}
              onChange={(e) => changerTitre(e.target.value)}
              maxLength={160}
              placeholder="Ex. Index : ce que le gouvernement ne vous dit pas…"
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
              <div className={`ecg-champ-groupe min-w-0 flex-1${erreurs.slug ? " ecg-champ-erreur" : ""}`}>
                <span>{rubrique.chemin}/</span>
                <input
                  id="slug"
                  className=""
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
              className={`${champ(erreurs.chapo)} min-h-[90px]`}
              value={form.chapo}
              onChange={(e) => set("chapo", e.target.value)}
              rows={3}
              placeholder="Ex. Le gouvernement veut toucher à l'indexation automatique des salaires. Voici ce que ça change sur votre fiche de paie…"
            />
            <p className={`ecg-aide text-right tabular-nums ${form.chapo.length > CHAPO_MAX ? "font-bold text-militant-bordeaux" : ""}`}>
              {form.chapo.length}/{CHAPO_MAX}
            </p>
          </Champ>
        </div>

        {/* ── EN BREF ── */}
        <TitreSection>2. En bref</TitreSection>
        <div className="space-y-4 px-5 py-5">
          <Champ
            id="points-cles"
            label="Points clés"
            aide="Le résumé pour le lecteur pressé, affiché en haut de l'article. Une ligne par point, 3 à 5 points courts."
          >
            <textarea
              id="points-cles"
              className={`${champ()} min-h-[130px]`}
              value={form.pointsCles}
              onChange={(e) => set("pointsCles", e.target.value)}
              rows={5}
              placeholder={"L'index est menacé\nUne perte de 150 € par mois en moyenne\nManifestation le 14/10 à Bruxelles"}
            />
          </Champ>
          {points.length > 0 && (
            <div aria-label="Aperçu de l'encart En bref" className="rounded-2xl bg-militant-bordeaux p-5 text-white">
              <p className="ecg-sous-titre leading-none">En bref</p>
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
        <div className="space-y-2 px-5 py-5">
          <p id="libelle-contenu" className="ecg-libelle mb-0">
            Texte de l&apos;article{form.statut === STATUT_PUBLIE ? " *" : ""}
          </p>
          <p className="ecg-aide mt-0">
            Des sous-titres toutes les quelques lignes et des paragraphes courts : le lecteur parcourt avant de lire.
          </p>
          <EditeurTexte
            key={versionEditeur}
            valeur={form.contenu}
            onChange={(html) => set("contenu", html)}
            idLibelle="libelle-contenu"
            erreur={Boolean(erreurs.contenu)}
            disabled={enCours}
          />
          {erreurs.contenu && <p className="ecg-erreur">{erreurs.contenu}</p>}
          <p className="ecg-texte-doux flex items-center gap-1.5 text-sm">
            <Clock size={15} aria-hidden /> Temps de lecture estimé : {minutes} min
          </p>
        </div>

        {/* ── IMAGE ── */}
        <TitreSection>4. Image de couverture</TitreSection>
        <div className="space-y-3 px-5 py-5">
          <p className="ecg-aide mt-0">
            Format paysage de préférence. Choisissez un fichier ou glissez une image (depuis votre ordinateur ou une autre
            page web). Elle est réduite automatiquement avant l&apos;envoi.
          </p>
          <Alerte ton="attention" role={null} titre="Droits d'image">
            Utilisez une photo de la centrale ou d&apos;une banque d&apos;images libre. Une photo de presse trouvée en ligne
            est protégée par le droit d&apos;auteur.
          </Alerte>
          {((ia.etape === "propose" && ia.suggestionImage) || suggestionNote) && (
            <p className="ecg-encart flex items-start gap-2.5 text-sm">
              <Camera size={17} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="font-bold">Suggestion de photo (IA, non enregistrée) : </span>
                {ia.etape === "propose" && ia.suggestionImage ? ia.suggestionImage : suggestionNote}
              </span>
            </p>
          )}
          <ZoneDepotImages
            onImages={([f]) => accepterImage(f)}
            onErreur={(m) => setErreurs((x) => ({ ...x, image: m || undefined }))}
            disabled={enCours}
          >
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
              className="ecg-depot aspect-[16/9] w-full"
            >
              <span className="ecg-depot-ico" aria-hidden>
                <ImagePlus size={22} />
              </span>
              <b>Choisir une image</b>
              <small>ou glissez-la ici</small>
            </button>
          )}
          </ZoneDepotImages>
          <input
            ref={champFichier}
            type="file"
            accept={TYPES_IMAGE.join(",")}
            onChange={(e) => choisirImage(e.currentTarget)}
            className="sr-only"
            tabIndex={-1}
            aria-label="Image de couverture"
          />
          {erreurs.image && <p className="ecg-erreur">{erreurs.image}</p>}
        </div>

        {/* ── SOURCES ── */}
        <TitreSection>5. Sources</TitreSection>
        <div className="px-5 py-5">
          <Champ
            id="sources"
            label={explication ? "Sources" : "Liens vers les sources"}
            erreur={erreurs.sources}
            aide={
              explication
                ? "Une source par ligne : la référence de la note (« Note FGTB 26I107F ») et, si besoin, des liens."
                : "Un lien par ligne. Vous pouvez le faire précéder du nom du média : « Le Soir – https://… »."
            }
          >
            <textarea
              id="sources"
              className={`${champ(erreurs.sources)} min-h-[100px]`}
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
        <div className="space-y-5 px-5 py-5">
          <fieldset>
            <legend className="ecg-libelle">Statut</legend>
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

        <div className="space-y-3 px-5 pb-5">
          {(ia.etape === "propose" || vulgarise) && (
            <Alerte ton="attention" icone={Sparkles} role={null}>
              <b>{vulgarise ? RAPPEL_NOTE : RAPPEL_IA}</b>
            </Alerte>
          )}
          {erreurEnvoi && <Alerte ton="erreur">{erreurEnvoi}</Alerte>}
        </div>
        <div className="ecg-panneau-pied justify-between">
          <p className="self-center text-sm" aria-live="polite">
            {Object.values(erreurs).some(Boolean) && !erreurEnvoi ? (
              <span className="font-semibold text-militant-bordeaux">
                Certains champs doivent être corrigés avant l&apos;enregistrement.
              </span>
            ) : (
              <span className="ecg-texte-doux">* Champs obligatoires</span>
            )}
          </p>
          <button type="submit" className="ecg-btn ecg-btn-principal">
            {enCours && <IconeChargement size={16} />}
            {enCours
              ? progression || "Enregistrement…"
              : form.statut === STATUT_PUBLIE
                ? article?.statut === STATUT_PUBLIE
                  ? "Enregistrer les modifications"
                  : "Publier l'article"
                : "Enregistrer le brouillon"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
const BOUTON_SECONDAIRE = "ecg-btn";

function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="ecg-section-titre">
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
      <label htmlFor={id} className="ecg-libelle">
        {label}
      </label>
      {aide && <p className="ecg-aide -mt-1 mb-2">{aide}</p>}
      {children}
      {erreur && <p className="ecg-erreur">{erreur}</p>}
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
    <label className={`ecg-choix items-start${checked ? " ecg-choix-actif" : ""}`}>
      <input type="radio" name="statut" checked={checked} onChange={onChange} className="mt-0.5" />
      <span>
        <span className="flex items-center gap-1.5 font-semibold">
          {icone}
          {label}
        </span>
        <span className="ecg-aide mt-0.5 block">{detail}</span>
      </span>
    </label>
  );
}

function champ(erreur?: string) {
  return `ecg-champ${erreur ? " ecg-champ-erreur" : ""}`;
}
