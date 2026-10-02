"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ClipboardPaste, Eye, ImagePlus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { IconeChargement } from "../../Chargement";
import ZoneDepotImages from "../../ZoneDepotImages";
import Interrupteur from "../Interrupteur";
import { BUCKET_BLOG, cheminImageDepuisUrl, slugifier, slugValide } from "../../../lib/articles";
import { formatDateFr } from "../../../lib/dates";
import { ANALYSE_MAX, POINTS_MAX } from "../../../lib/mobilisation-limites";
import {
  CHEMIN_MOBILISATION,
  cheminHero,
  depuisHorodatage,
  lienValide,
  versHorodatage,
  type Mobilisation,
} from "../../../lib/mobilisations";
import { imageAcceptee, MESSAGE_IMAGE_REFUSEE, TYPES_IMAGE } from "../../../lib/image-deposee";
import { preparerPhoto } from "../../../lib/photos";
import { getSupabaseAuth } from "../../../lib/supabase";
import { useOnceSubmit } from "../../../lib/use-once-submit";
import { rafraichirMobilisation } from "./revalidation";

type Form = {
  titre: string;
  slug: string;
  date: string;
  heure: string;
  lieu: string;
  chapo: string;
  pourquoi: string;
  revendications: string;
  infos: string;
  lien: string;
  actif: boolean;
};

type Image = { file: File; apercu: string } | { url: string } | null;

const BOUTON_SECONDAIRE =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-militant-charbon px-4 py-2 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";

export default function FormulaireMobilisation({ mobilisation }: { mobilisation?: Mobilisation }) {
  const router = useRouter();
  const { acquire, release } = useOnceSubmit();
  const d = depuisHorodatage(mobilisation?.date_evenement);
  const [form, setForm] = useState<Form>({
    titre: mobilisation?.titre ?? "",
    slug: mobilisation?.slug ?? "",
    date: d.date,
    heure: d.heure === "00:00" ? "" : d.heure,
    lieu: mobilisation?.lieu ?? "",
    chapo: mobilisation?.chapo ?? "",
    pourquoi: mobilisation?.pourquoi ?? "",
    revendications: mobilisation?.revendications ?? "",
    infos: mobilisation?.infos_pratiques ?? "",
    lien: mobilisation?.lien_inscription ?? "",
    actif: mobilisation?.actif ?? false,
  });
  const [slugManuel, setSlugManuel] = useState(Boolean(mobilisation?.slug));
  const [image, setImage] = useState<Image>(mobilisation?.image_hero ? { url: mobilisation.image_hero } : null);
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Form, string>>>({});
  const [enCours, setEnCours] = useState(false);
  const [progression, setProgression] = useState("");
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const [erreurImage, setErreurImage] = useState("");
  const champFichier = useRef<HTMLInputElement>(null);
  const champTitre = useRef<HTMLInputElement>(null);

  /** Pré-remplissage depuis l'analyse IA des textes collés (point 0). L'image et la mise en avant ne bougent pas. */
  function appliquerAnalyse(a: ChampsAnalyse) {
    setSlugManuel(false);
    setErreurs({});
    setForm((f) => ({
      ...f,
      titre: a.titre,
      slug: slugifier(a.titre),
      date: a.date,
      heure: a.heure,
      lieu: a.lieu,
      chapo: a.chapo,
      pourquoi: a.pourquoi,
      revendications: a.revendications,
      infos: a.infos_pratiques,
      lien: a.lien_inscription,
    }));
    champTitre.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    champTitre.current?.focus({ preventScroll: true });
  }
  const dejaRempli = [form.titre, form.lieu, form.chapo, form.pourquoi, form.revendications, form.infos, form.lien].some((v) =>
    v.trim()
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Libère l'aperçu local de l'image quand il est remplacé.
  useEffect(() => {
    const a = image && "apercu" in image ? image.apercu : null;
    return () => {
      if (a) URL.revokeObjectURL(a);
    };
  }, [image]);

  function changerTitre(titre: string) {
    setForm((f) => ({ ...f, titre, slug: slugManuel ? f.slug : slugifier(titre) }));
  }

  function choisirImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null; // copier avant de vider le champ (Chrome, Edge)
    e.target.value = "";
    if (file) accepterImage(file);
  }

  function accepterImage(file: File) {
    if (!imageAcceptee(file)) {
      setErreurImage(`Image non ajoutée : ${MESSAGE_IMAGE_REFUSEE}.`);
      return;
    }
    setErreurImage("");
    setImage({ file, apercu: URL.createObjectURL(file) });
  }

  function valider(): boolean {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.titre.trim()) e.titre = "Donnez un titre à la mobilisation.";
    if (!slugValide(form.slug)) e.slug = "Adresse invalide : lettres minuscules, chiffres et tirets uniquement.";
    if (!form.date.trim()) e.date = "La date est nécessaire au compte à rebours.";
    else if (!versHorodatage(form.date, "00:00")) e.date = "Date invalide : format jj/mm/aaaa.";
    if (form.heure.trim() && form.date.trim() && !versHorodatage(form.date, form.heure))
      e.heure = "Heure invalide : format hh:mm (ex. 10:30).";
    if (form.lien.trim() && !lienValide(form.lien)) e.lien = "Lien invalide : il doit commencer par https://.";
    setErreurs(e);
    return Object.keys(e).length === 0;
  }

  async function enregistrer(ev: React.FormEvent) {
    ev.preventDefault();
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
      date_evenement: versHorodatage(form.date, form.heure),
      lieu: form.lieu.trim() || null,
      chapo: form.chapo.trim() || null,
      pourquoi: form.pourquoi.trim() || null,
      revendications: nettoyerLignes(form.revendications),
      infos_pratiques: nettoyerLignes(form.infos),
      lien_inscription: form.lien.trim() || null,
      actif: form.actif,
      updated_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseAuth();
      if (form.actif) {
        setProgression("Mise en avant…");
        // Une seule mobilisation mise en avant à la fois.
        let requete = supabase.from("site_mobilisations").update({ actif: false }).eq("actif", true);
        if (mobilisation) requete = requete.neq("id", mobilisation.id);
        const { error } = await requete;
        if (error) throw error;
      }
      setProgression("Enregistrement de la mobilisation…");
      const { data: ligne, error } = mobilisation
        ? await supabase.from("site_mobilisations").update(donnees).eq("id", mobilisation.id).select("id").single()
        : await supabase.from("site_mobilisations").insert(donnees).select("id").single();
      if (error) {
        release();
        if (error.code === "23505") {
          setErreurs((x) => ({ ...x, slug: "Cette adresse est déjà utilisée par une autre mobilisation. Modifiez-la." }));
        } else if (error.code === "42501" || error.code === "PGRST116") {
          setErreurEnvoi("Votre session a expiré ou ne permet pas l'enregistrement. Reconnectez-vous puis réessayez.");
        } else {
          console.error(error);
          setErreurEnvoi(`La mobilisation n'a pas pu être enregistrée (${error.message}). Réessayez.`);
        }
        return;
      }
      const imageOk = await synchroniserImage(ligne.id);
      await rafraichirMobilisation();
      if (!imageOk) {
        release();
        setErreurEnvoi(
          "La mobilisation est enregistrée, mais l'image n'a pas pu être envoyée. Rechoisissez-la puis enregistrez à nouveau."
        );
        if (!mobilisation) router.replace(`/suivi-actions/mobilisations/${ligne.id}/modifier`);
        return;
      }
      router.push(`/suivi-actions/mobilisations?enregistre=${ligne.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      release();
      setErreurEnvoi("La mobilisation n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
      setProgression("");
    }
  }

  /** Envoie la nouvelle image, la rattache, puis efface l'ancienne. false en cas d'échec. */
  async function synchroniserImage(id: string): Promise<boolean> {
    const ancienne = mobilisation?.image_hero ?? null;
    const nouvelle = image && "url" in image ? image.url : null;
    if (!(image && "file" in image) && nouvelle === ancienne) return true;
    const supabase = getSupabaseAuth();
    const stockage = supabase.storage.from(BUCKET_BLOG);
    let url: string | null = null;
    let chemin: string | null = null;
    if (image && "file" in image) {
      setProgression("Envoi de l'image…");
      chemin = cheminHero(id, crypto.randomUUID());
      try {
        const jpeg = await preparerPhoto(image.file);
        const { error } = await stockage.upload(chemin, jpeg, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
        if (error) throw error;
      } catch (err) {
        console.error(err);
        return false;
      }
      url = stockage.getPublicUrl(chemin).data.publicUrl;
    }
    const { error } = await supabase.from("site_mobilisations").update({ image_hero: url }).eq("id", id);
    if (error) {
      console.error(error);
      if (chemin) await stockage.remove([chemin]);
      return false;
    }
    const ancienChemin = cheminImageDepuisUrl(ancienne);
    if (ancienChemin) {
      const { error: e } = await stockage.remove([ancienChemin]);
      if (e) console.error("remove", ancienChemin, e);
    }
    if (url) setImage({ url });
    return true;
  }

  const apercuImage = image ? ("apercu" in image ? image.apercu : image.url) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="border-b-[6px] border-militant-charbon pb-4">
        <Link
          href="/suivi-actions/mobilisations"
          className="inline-flex items-center gap-1 text-sm font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          <ArrowLeft size={15} aria-hidden /> Toutes les mobilisations
        </Link>
        <h1 className="mt-3 font-condensed text-5xl font-extrabold uppercase leading-[0.9]">
          {mobilisation ? "Modifier la mobilisation" : "Nouvelle mobilisation"}
        </h1>
        {mobilisation && (
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-lg font-semibold">{mobilisation.titre}</p>
            <Link
              href={`/suivi-actions/mobilisations/${mobilisation.id}/apercu`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              <Eye size={15} aria-hidden /> Aperçu de la version enregistrée
            </Link>
          </div>
        )}
      </header>

      <form onSubmit={enregistrer} noValidate className="overflow-hidden rounded-2xl border border-militant-ardoise bg-white">
        {!mobilisation && (
          <>
            <TitreSection>0. Partir de textes existants</TitreSection>
            <div className="px-6 py-6">
              <PanneauAnalyse dejaRempli={dejaRempli} onResultat={appliquerAnalyse} />
            </div>
          </>
        )}
        <TitreSection>1. L&apos;événement</TitreSection>
        <div className="space-y-5 px-6 py-6">
          <Champ id="titre" label="Titre *" erreur={erreurs.titre} aide="Court et frappant : il s'affiche en très grand.">
            <input
              id="titre"
              ref={champTitre}
              className={champ(erreurs.titre)}
              value={form.titre}
              onChange={(e) => changerTitre(e.target.value)}
              maxLength={120}
              placeholder="Ex. Grève générale contre la casse des pensions"
            />
          </Champ>

          <Champ id="slug" label="Adresse de la page campagne *" erreur={erreurs.slug} aide="Générée depuis le titre. Courte, elle se partage mieux.">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className={`flex min-w-0 flex-1 items-center rounded-xl border bg-white focus-within:ring-2 focus-within:ring-militant-rouge ${
                  erreurs.slug ? "border-2 border-militant-bordeaux" : "border-militant-ardoise"
                }`}
              >
                <span className="shrink-0 pl-3 text-sm font-semibold">{CHEMIN_MOBILISATION}/</span>
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

          <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
            <Champ id="date" label="Date *" erreur={erreurs.date} aide="jj/mm/aaaa">
              <input
                id="date"
                inputMode="numeric"
                className={champ(erreurs.date)}
                value={form.date}
                onChange={(e) => set("date", formatDateFr(e.target.value))}
                placeholder="14/10/2026"
                maxLength={10}
              />
            </Champ>
            <Champ id="heure" label="Heure" erreur={erreurs.heure} aide="hh:mm, heure belge">
              <input
                id="heure"
                inputMode="numeric"
                className={champ(erreurs.heure)}
                value={form.heure}
                onChange={(e) => set("heure", formatHeure(e.target.value))}
                placeholder="10:30"
                maxLength={5}
              />
            </Champ>
          </div>

          <Champ id="lieu" label="Lieu" aide="Ville et point de rendez-vous principal.">
            <input
              id="lieu"
              className={champ()}
              value={form.lieu}
              onChange={(e) => set("lieu", e.target.value)}
              maxLength={160}
              placeholder="Ex. Bruxelles, gare du Nord"
            />
          </Champ>

          <Champ id="chapo" label="Chapô" aide="Une ou deux phrases qui donnent envie de venir.">
            <textarea
              id="chapo"
              className={`${champ()} min-h-[80px] resize-y`}
              value={form.chapo}
              onChange={(e) => set("chapo", e.target.value)}
              rows={3}
              maxLength={400}
            />
          </Champ>

          <div>
            <p className="mb-1.5 block text-sm font-semibold">Image</p>
            <p className="mb-2 text-xs">
              Grande photo en tête de la page campagne et de l&apos;accueil. Choisissez un fichier ou glissez une image
              (depuis votre ordinateur ou une autre page web). Photo de la centrale ou banque libre ; une photo de presse
              est protégée.
            </p>
            <ZoneDepotImages onImages={([f]) => accepterImage(f)} onErreur={setErreurImage} disabled={enCours}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => champFichier.current?.click()}
                disabled={enCours}
                aria-label={apercuImage ? "Changer l'image" : "Choisir une image"}
                className="relative grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-militant-ardoise bg-white transition-colors hover:border-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge sm:w-64"
              >
                {apercuImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou image du bucket
                  <img src={apercuImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 px-3 text-center text-sm font-bold">
                    <ImagePlus size={24} className="text-militant-rouge" aria-hidden />
                    Glissez une image ici
                  </span>
                )}
              </button>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={champFichier}
                  type="file"
                  accept={TYPES_IMAGE.join(",")}
                  onChange={choisirImage}
                  className="sr-only"
                  id="image"
                  tabIndex={-1}
                />
                <button type="button" onClick={() => champFichier.current?.click()} className={BOUTON_SECONDAIRE}>
                  <ImagePlus size={15} aria-hidden /> {apercuImage ? "Changer l'image" : "Choisir une image"}
                </button>
                {apercuImage && (
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className={`${BOUTON_SECONDAIRE} border-transparent text-militant-bordeaux hover:border-militant-bordeaux hover:bg-white hover:text-militant-bordeaux`}
                  >
                    <Trash2 size={15} aria-hidden /> Retirer
                  </button>
                )}
              </div>
            </div>
            </ZoneDepotImages>
            {erreurImage && <p className="mt-2 text-xs font-semibold text-militant-bordeaux">{erreurImage}</p>}
          </div>
        </div>

        <TitreSection>2. Pourquoi on se mobilise</TitreSection>
        <div className="space-y-5 px-6 py-6">
          <PanneauPourquoi
            contexte={{ titre: form.titre, date: form.date, lieu: form.lieu, revendications: form.revendications }}
            dejaRedige={Boolean(form.pourquoi.trim())}
            onTexte={(t) => set("pourquoi", t)}
          />
          <Champ id="pourquoi" label="Le texte" aide="Paragraphes séparés par une ligne vide. C'est le cœur de la page campagne.">
            <textarea
              id="pourquoi"
              className={`${champ()} min-h-[260px] resize-y leading-relaxed`}
              value={form.pourquoi}
              onChange={(e) => set("pourquoi", e.target.value)}
              rows={12}
            />
          </Champ>
        </div>

        <TitreSection>3. Revendications et infos pratiques</TitreSection>
        <div className="space-y-5 px-6 py-6">
          <Champ id="revendications" label="Ce qu'on demande" aide="Une revendication par ligne.">
            <textarea
              id="revendications"
              className={`${champ()} min-h-[120px] resize-y`}
              value={form.revendications}
              onChange={(e) => set("revendications", e.target.value)}
              rows={5}
              placeholder={"Ex. Pas touche à nos pensions\nMaintien de l'indexation automatique des salaires"}
            />
          </Champ>
          <Champ
            id="infos"
            label="Comment y aller"
            aide="Une info par ligne. « Libellé : détail » met le libellé en évidence (ex. « Bus : départ 7 h de Libramont »)."
          >
            <textarea
              id="infos"
              className={`${champ()} min-h-[120px] resize-y`}
              value={form.infos}
              onChange={(e) => set("infos", e.target.value)}
              rows={5}
              placeholder={"Rendez-vous : 10 h 30, gare du Nord\nBus : départ 7 h, parking de la centrale à Libramont\nTrain : billet remboursé sur présentation"}
            />
          </Champ>
          <Champ
            id="lien"
            label="Lien d'inscription"
            erreur={erreurs.lien}
            aide="Adresse du formulaire d'inscription de la FGTB fédérale. Sans lien, le bouton « Je m'inscris » n'apparaît pas."
          >
            <input
              id="lien"
              type="url"
              inputMode="url"
              className={champ(erreurs.lien)}
              value={form.lien}
              onChange={(e) => set("lien", e.target.value.trim())}
              placeholder="https://"
              autoComplete="off"
              spellCheck={false}
            />
          </Champ>
        </div>

        <TitreSection>4. Mise en avant</TitreSection>
        <div className="space-y-2 px-6 py-6">
          <Interrupteur
            actif={form.actif}
            onChange={(v) => set("actif", v)}
            label="Mettre cette mobilisation en avant"
            etatOn="Mise en avant (accueil, bandeau, page campagne)"
            etatOff="Pas mise en avant"
          />
          <p className="text-xs">
            Une seule mobilisation peut être mise en avant : l&apos;activer désactive les autres. La mise en avant
            s&apos;arrête d&apos;elle-même 1 h après l&apos;heure de l&apos;événement. Elle n&apos;apparaît sur
            le site que si l&apos;affichage est activé dans les{" "}
            <Link href="/suivi-actions/parametres-site" className="font-semibold underline decoration-militant-rouge underline-offset-2">
              paramètres du site
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-militant-ardoise bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[24px] text-sm" aria-live="polite">
            {progression && (
              <span className="inline-flex items-center gap-2 font-semibold">
                <IconeChargement size={16} className="text-militant-rouge" /> {progression}
              </span>
            )}
            {erreurEnvoi && (
              <span role="alert" className="font-semibold text-militant-bordeaux">
                {erreurEnvoi}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={enCours}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-6 py-3 text-[16px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {enCours && <IconeChargement size={16} />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

type ChampsAnalyse = {
  titre: string;
  date: string;
  heure: string;
  lieu: string;
  chapo: string;
  pourquoi: string;
  revendications: string;
  infos_pratiques: string;
  lien_inscription: string;
};

/**
 * Point 0 : Fred colle des textes trouvés un peu partout (articles, tracts, communiqués) ; l'IA les analyse
 * et pré-remplit tous les champs en dessous. Rien n'est enregistré avant son clic sur « Enregistrer ».
 */
function PanneauAnalyse({ dejaRempli, onResultat }: { dejaRempli: boolean; onResultat: (a: ChampsAnalyse) => void }) {
  const [textes, setTextes] = useState("");
  const [etat, setEtat] = useState<"inactif" | "en_cours" | "fait">("inactif");
  const [erreur, setErreur] = useState("");
  const [avertissements, setAvertissements] = useState<string[]>([]);

  async function analyser() {
    if (textes.trim().length < 80) {
      setErreur("Collez d'abord un ou plusieurs textes complets : article, tract, communiqué de la FGTB…");
      return;
    }
    if (dejaRempli && !window.confirm("Remplacer les champs déjà remplis par ceux proposés par l'IA ?")) return;
    setEtat("en_cours");
    setErreur("");
    setAvertissements([]);
    try {
      const rep = await fetch("/api/mobilisations/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textes }),
      });
      const json = (await rep.json().catch(() => ({}))) as Partial<ChampsAnalyse> & {
        avertissements?: string[];
        erreur?: string;
      };
      if (!rep.ok || typeof json.titre !== "string") {
        setErreur(json.erreur ?? "L'analyse a échoué. Réessayez.");
        setEtat("inactif");
        return;
      }
      onResultat({
        titre: json.titre,
        date: json.date ?? "",
        heure: json.heure ?? "",
        lieu: json.lieu ?? "",
        chapo: json.chapo ?? "",
        pourquoi: json.pourquoi ?? "",
        revendications: json.revendications ?? "",
        infos_pratiques: json.infos_pratiques ?? "",
        lien_inscription: json.lien_inscription ?? "",
      });
      setAvertissements(json.avertissements ?? []);
      setEtat("fait");
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion et réessayez.");
      setEtat("inactif");
    }
  }

  return (
    <section aria-labelledby="titre-analyse" className="rounded-2xl border-2 border-militant-bordeaux p-5">
      <h3 id="titre-analyse" className="flex items-center gap-2 font-condensed text-2xl font-extrabold leading-none">
        <ClipboardPaste size={20} className="text-militant-rouge" aria-hidden /> Pré-remplir avec l&apos;IA
      </h3>
      <p className="mt-2 text-sm">
        Collez ici tout ce que vous avez trouvé : articles de presse, tract, communiqué de la FGTB, message avec les
        horaires des bus… L&apos;IA en tire le titre, la date, le lieu, le chapô, le « pourquoi », les revendications,
        les infos pratiques et le lien d&apos;inscription. Elle reformule et n&apos;invente rien : ce qui manque reste
        vide.
      </p>
      <label htmlFor="textes-colles" className="mt-4 block text-sm font-semibold">
        Vos textes
      </label>
      <textarea
        id="textes-colles"
        className={`${champ()} mt-1.5 min-h-[200px] resize-y`}
        value={textes}
        onChange={(e) => setTextes(e.target.value)}
        maxLength={ANALYSE_MAX}
        rows={9}
        placeholder="Collez un ou plusieurs textes, les uns à la suite des autres."
      />
      <p className="mt-1 text-right text-xs tabular-nums">
        {textes.length.toLocaleString("fr-BE")} / {ANALYSE_MAX.toLocaleString("fr-BE")} caractères
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={analyser}
          disabled={etat === "en_cours"}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {etat === "en_cours" ? <IconeChargement size={16} /> : <Sparkles size={16} aria-hidden />}
          {etat === "en_cours" ? "Analyse en cours…" : etat === "fait" ? "Relancer l'analyse" : "Analyser et pré-remplir"}
        </button>
        <span className="text-xs">Claude Sonnet 5 · 15 à 40 secondes · quelques centimes</span>
      </div>
      <div aria-live="polite">
        {erreur && (
          <p role="alert" className="mt-3 text-sm font-semibold text-militant-bordeaux">
            {erreur}
          </p>
        )}
        {etat === "fait" && (
          <div className="mt-4 border-l-4 border-militant-rouge pl-3 text-sm">
            <p className="font-bold">
              Champs pré-remplis par l&apos;IA — vérifiez chaque champ avec vos sources avant d&apos;enregistrer.
            </p>
            {avertissements.map((a) => (
              <p key={a} className="mt-1 flex items-start gap-1.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-militant-rouge" aria-hidden /> {a}
              </p>
            ))}
            <p className="mt-1">L&apos;image et la mise en avant restent à choisir vous-même.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Rédaction du « pourquoi » par l'IA à partir des points de Fred (rien n'est enregistré sans lui). */
function PanneauPourquoi({
  contexte,
  dejaRedige,
  onTexte,
}: {
  contexte: { titre: string; date: string; lieu: string; revendications: string };
  dejaRedige: boolean;
  onTexte: (t: string) => void;
}) {
  const [points, setPoints] = useState("");
  const [etat, setEtat] = useState<"inactif" | "en_cours" | "fait">("inactif");
  const [erreur, setErreur] = useState("");
  const [avertissements, setAvertissements] = useState<string[]>([]);

  async function rediger() {
    if (points.trim().length < 10) {
      setErreur("Écrivez d'abord 3 ou 4 points : les raisons de la mobilisation, ce qu'on risque de perdre.");
      return;
    }
    if (dejaRedige && !window.confirm("Remplacer le texte actuel par la proposition de l'IA ?")) return;
    setEtat("en_cours");
    setErreur("");
    setAvertissements([]);
    try {
      const rep = await fetch("/api/mobilisations/pourquoi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, ...contexte }),
      });
      const json = (await rep.json().catch(() => ({}))) as { pourquoi?: string; avertissements?: string[]; erreur?: string };
      if (!rep.ok || !json.pourquoi) {
        setErreur(json.erreur ?? "La rédaction a échoué. Réessayez.");
        setEtat("inactif");
        return;
      }
      onTexte(json.pourquoi);
      setAvertissements(json.avertissements ?? []);
      setEtat("fait");
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion et réessayez.");
      setEtat("inactif");
    }
  }

  return (
    <section aria-labelledby="titre-ia" className="rounded-2xl border-2 border-militant-bordeaux p-5">
      <h3 id="titre-ia" className="flex items-center gap-2 font-condensed text-2xl font-extrabold leading-none">
        <Sparkles size={20} className="text-militant-rouge" aria-hidden /> Rédiger le « pourquoi » avec l&apos;IA
      </h3>
      <p className="mt-2 text-sm">
        Donnez 3 ou 4 points en vrac : ce qui est décidé, ce que les travailleurs risquent de perdre, pourquoi il faut être
        nombreux. L&apos;IA en fait un texte mobilisateur, sans rien inventer. Vous relisez et corrigez avant
        d&apos;enregistrer.
      </p>
      <label htmlFor="points" className="mt-4 block text-sm font-semibold">
        Vos points
      </label>
      <textarea
        id="points"
        className={`${champ()} mt-1.5 min-h-[120px] resize-y`}
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        maxLength={POINTS_MAX}
        rows={5}
        placeholder={"- pension à 67 ans pour tous\n- malus pour les carrières interrompues (maladie, chômage)\n- les métiers lourds pas reconnus\n- plus on est nombreux, plus le gouvernement recule"}
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={rediger}
          disabled={etat === "en_cours"}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {etat === "en_cours" ? <IconeChargement size={16} /> : <Sparkles size={16} aria-hidden />}
          {etat === "en_cours" ? "Rédaction en cours…" : etat === "fait" ? "Proposer une autre version" : "Rédiger avec l'IA"}
        </button>
        <span className="text-xs">Claude Sonnet 5 · quelques secondes · environ 1 centime</span>
      </div>
      <div aria-live="polite">
        {erreur && (
          <p role="alert" className="mt-3 text-sm font-semibold text-militant-bordeaux">
            {erreur}
          </p>
        )}
        {etat === "fait" && (
          <div className="mt-4 border-l-4 border-militant-rouge pl-3 text-sm">
            <p className="font-bold">Texte IA — à relire, corriger et valider avant publication.</p>
            {avertissements.map((a) => (
              <p key={a} className="mt-1 flex items-start gap-1.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-militant-rouge" aria-hidden /> {a}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function nettoyerLignes(texte: string): string | null {
  return (
    texte
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-–—•*·]|\d+[.)])\s+/, "").trim())
      .filter(Boolean)
      .join("\n") || null
  );
}

/** Saisie d'heure : « 1030 » → « 10:30 ». */
function formatHeure(v: string): string {
  const c = v.replace(/\D/g, "").slice(0, 4);
  return c.length <= 2 ? c : `${c.slice(0, 2)}:${c.slice(2)}`;
}

function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-militant-ardoise bg-white px-6 pb-3 pt-5 font-condensed text-2xl font-extrabold uppercase leading-none">
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

function champ(erreur?: string) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-militant-rouge ${
    erreur ? "border-2 border-militant-bordeaux" : "border-militant-ardoise focus:border-militant-charbon"
  }`;
}
