"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseAuth } from "./lib/supabase";
import { dateFrToIso, formatDateFr, isoToDateFr } from "./lib/dates";
import { useOnceSubmit } from "./lib/use-once-submit";
import { titreAction } from "./lib/actions";
import { synchroniserPhotos, type BilanPhotos, type PhotoEdition, type PhotoEnregistree } from "./lib/photos-sync";
import ChoixPhotos, { libererApercu } from "./ChoixPhotos";
import ChoixVideos, { MESSAGE_LIEN_INVALIDE, videoDepuisLien } from "./ChoixVideos";
import { synchroniserVideos, type VideoEdition, type VideoEnregistree } from "./lib/videos-sync";
import {
  ArrowLeft,
  Bus,
  Globe,
  List,
  Plus,
  Train,
} from "lucide-react";
import { IconeChargement } from "./app/Chargement";
import { Alerte, BTN, BTN_PRINCIPAL, EnteteEcran, Panneau } from "./app/espace/_partage/ui";

// ── Types ────────────────────────────────────────────────────────────────────
type Secteur = { id: string; nom: string };

const TYPES_ACTION = [
  "grève générale",
  "manifestation nationale",
  "manifestation",
  "piquet en entreprise",
  "action",
  "autre",
] as const;
type TypeAction = (typeof TYPES_ACTION)[number] | "";

const NOUVEAU_SECTEUR = "__nouveau__";

type FormData = {
  nomAction: string;
  dateAction: string; // saisie jj/mm/aaaa, convertie en ISO à l'enregistrement
  ville: string;
  typeAction: TypeAction;
  typeAutre: string;
  secteurId: string;
  frontCommun: boolean | null;
  frontCommunCsc: boolean;
  frontCommunSynova: boolean;
  entreprise: string;
  deplacementBus: boolean;
  deplacementTrain: boolean;
  description: string;
  participantsTotal: string;
  participantsCentrale: string;
  infoWeb: string;
  visiblePublic: boolean;
};

type Errors = Partial<Record<keyof FormData | "nouveauSecteur" | "videos", string>>;

const initialForm: FormData = {
  nomAction: "",
  dateAction: "",
  ville: "",
  typeAction: "",
  typeAutre: "",
  secteurId: "",
  frontCommun: null,
  frontCommunCsc: false,
  frontCommunSynova: false,
  entreprise: "",
  deplacementBus: false,
  deplacementTrain: false,
  description: "",
  participantsTotal: "",
  participantsCentrale: "",
  infoWeb: "",
  visiblePublic: false,
};

/** Action déjà enregistrée (ligne de site_actions + ses photos), pour le mode édition. */
export type ActionEnregistree = {
  id: string;
  nom: string | null;
  date_action: string;
  ville: string | null;
  type_action: string;
  type_action_autre: string | null;
  secteur_id: string | null;
  front_commun: boolean;
  front_commun_csc: boolean;
  front_commun_synova: boolean;
  entreprise: string | null;
  deplacement_bus: boolean;
  deplacement_train: boolean;
  description: string | null;
  participants_total: number | null;
  participants_centrale: number | null;
  info_web: string | null;
  visible_public: boolean;
  photos: PhotoEnregistree[];
  videos: VideoEnregistree[];
};

function formDepuisAction(a: ActionEnregistree): FormData {
  const type = (TYPES_ACTION as readonly string[]).includes(a.type_action)
    ? (a.type_action as TypeAction)
    : "autre";
  return {
    nomAction: a.nom ?? "",
    dateAction: isoToDateFr(a.date_action),
    ville: a.ville ?? "",
    typeAction: type,
    // Type inconnu de la liste : on le garde comme détail de "autre".
    typeAutre: a.type_action_autre ?? (type === "autre" && a.type_action !== "autre" ? a.type_action : ""),
    secteurId: a.secteur_id ?? "",
    frontCommun: a.front_commun,
    frontCommunCsc: a.front_commun_csc,
    frontCommunSynova: a.front_commun_synova,
    entreprise: a.entreprise ?? "",
    deplacementBus: a.deplacement_bus,
    deplacementTrain: a.deplacement_train,
    description: a.description ?? "",
    participantsTotal: a.participants_total?.toString() ?? "",
    participantsCentrale: a.participants_centrale?.toString() ?? "",
    infoWeb: a.info_web ?? "",
    visiblePublic: a.visible_public,
  };
}

function videosDepuisAction(a: ActionEnregistree): VideoEdition[] {
  return a.videos.map((v) => ({ cle: v.id, id: v.id, url: v.url, titre: v.titre ?? "" }));
}

function photosDepuisAction(a: ActionEnregistree): PhotoEdition[] {
  return a.photos.map((p) => ({ cle: p.id, id: p.id, url: p.url, legende: p.legende ?? "" }));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toIntOrNull(v: string): number | null {
  const t = v.trim();
  return t === "" ? null : Number.parseInt(t, 10);
}

// ── Composant principal ──────────────────────────────────────────────────────
// RLS : l'écriture est réservée aux super admins → "permission refusée" si la session a expiré.
const CODE_ACCES_REFUSE = "42501";

/** Formulaire d'action : création (sans `action`) ou modification (avec `action`). */
export default function FormulaireAction({ action }: { action?: ActionEnregistree }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(() => (action ? formDepuisAction(action) : initialForm));
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { acquire, release } = useOnceSubmit();

  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [secteursLoading, setSecteursLoading] = useState(true);
  const [secteursError, setSecteursError] = useState("");
  const [nouveauSecteur, setNouveauSecteur] = useState("");
  const [ajoutSecteurLoading, setAjoutSecteurLoading] = useState(false);

  const [photos, setPhotos] = useState<PhotoEdition[]>(() => (action ? photosDepuisAction(action) : []));
  const [progression, setProgression] = useState("");
  const [bilanPhotos, setBilanPhotos] = useState<BilanPhotos>({ ajoutees: 0, erreurs: [] });
  const [videos, setVideos] = useState<VideoEdition[]>(() => (action ? videosDepuisAction(action) : []));
  const [saisieVideo, setSaisieVideo] = useState({ lien: "", titre: "" });
  const [videosAjoutees, setVideosAjoutees] = useState(0);

  useEffect(() => {
    loadSecteurs();
  }, []);

  async function loadSecteurs(): Promise<Secteur[]> {
    setSecteursLoading(true);
    const { data, error } = await getSupabaseAuth()
      .from("site_secteurs")
      .select("id, nom")
      .order("nom");
    setSecteursLoading(false);
    if (error) {
      setSecteursError("Impossible de charger la liste des secteurs.");
      return [];
    }
    setSecteursError("");
    setSecteurs(data ?? []);
    return data ?? [];
  }

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function ajouterSecteur() {
    const nom = nouveauSecteur.trim().replace(/\s+/g, " ");
    if (!nom) {
      setErrors((prev) => ({ ...prev, nouveauSecteur: "Indiquez le nom du secteur" }));
      return;
    }
    // Déjà dans la liste (sans tenir compte des majuscules) : on le sélectionne simplement.
    const existant = secteurs.find((s) => s.nom.toLowerCase() === nom.toLowerCase());
    if (existant) {
      set("secteurId", existant.id);
      setNouveauSecteur("");
      return;
    }

    setAjoutSecteurLoading(true);
    const { data, error } = await getSupabaseAuth()
      .from("site_secteurs")
      .insert({ nom })
      .select("id, nom")
      .single();
    setAjoutSecteurLoading(false);

    if (error || !data) {
      // Ajouté entre-temps par quelqu'un d'autre (contrainte d'unicité) : on recharge.
      if (error?.code === "23505") {
        const liste = await loadSecteurs();
        const trouve = liste.find((s) => s.nom.toLowerCase() === nom.toLowerCase());
        if (trouve) {
          set("secteurId", trouve.id);
          setNouveauSecteur("");
          return;
        }
      }
      console.error(error);
      setErrors((prev) => ({
        ...prev,
        nouveauSecteur:
          error?.code === CODE_ACCES_REFUSE
            ? "Votre session a expiré. Reconnectez-vous pour ajouter un secteur."
            : "Le secteur n'a pas pu être ajouté. Réessayez ou contactez l'administrateur.",
      }));
      return;
    }

    setSecteurs((prev) =>
      [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    );
    set("secteurId", data.id);
    setNouveauSecteur("");
    setErrors((prev) => ({ ...prev, nouveauSecteur: undefined }));
  }

  function validate(): boolean {
    const e: Errors = {};
    // Lien collé sans cliquer sur "Ajouter la vidéo" : accepté s'il est valide (voir handleSubmit).
    if (saisieVideo.lien.trim() && !videoDepuisLien(saisieVideo.lien)) e.videos = MESSAGE_LIEN_INVALIDE;
    if (!form.dateAction) e.dateAction = "Requis";
    else if (!dateFrToIso(form.dateAction)) e.dateAction = "Date invalide (format jj/mm/aaaa)";
    if (!form.typeAction) e.typeAction = "Choisissez un type d'action";
    if (form.typeAction === "autre" && !form.typeAutre.trim()) {
      e.typeAutre = "Précisez le type d'action";
    }
    if (form.secteurId === NOUVEAU_SECTEUR) {
      e.nouveauSecteur = "Ajoutez le secteur ou choisissez-en un dans la liste";
    }
    if (form.frontCommun === null) e.frontCommun = "Indiquez oui ou non";

    const total = toIntOrNull(form.participantsTotal);
    const centrale = toIntOrNull(form.participantsCentrale);
    if (total !== null && (Number.isNaN(total) || total < 0)) {
      e.participantsTotal = "Nombre invalide";
    }
    if (centrale !== null && (Number.isNaN(centrale) || centrale < 0)) {
      e.participantsCentrale = "Nombre invalide";
    }
    if (total !== null && centrale !== null && centrale > total) {
      e.participantsCentrale = "Ne peut pas dépasser le nombre total de participants";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acquire() || loading) return;
    if (!validate()) {
      release();
      return;
    }
    setLoading(true);
    setSubmitError("");

    const donnees = {
      nom: form.nomAction.trim() || null,
      date_action: dateFrToIso(form.dateAction),
      ville: form.ville.trim() || null,
      type_action: form.typeAction,
      type_action_autre: form.typeAction === "autre" ? form.typeAutre.trim() : null,
      secteur_id: form.secteurId || null,
      front_commun: form.frontCommun === true,
      front_commun_csc: form.frontCommun === true && form.frontCommunCsc,
      front_commun_synova: form.frontCommun === true && form.frontCommunSynova,
      entreprise: form.entreprise.trim() || null,
      deplacement_bus: form.deplacementBus,
      deplacement_train: form.deplacementTrain,
      description: form.description.trim() || null,
      participants_total: toIntOrNull(form.participantsTotal),
      participants_centrale: toIntOrNull(form.participantsCentrale),
      info_web: form.infoWeb.trim() || null,
      visible_public: form.visiblePublic,
    };

    try {
      const supabase = getSupabaseAuth();
      setProgression(action ? "Enregistrement des modifications…" : "Enregistrement de l'action…");

      // 1) L'action d'abord : les photos ont besoin de son id.
      const { data: ligne, error: dbError } = action
        ? await supabase.from("site_actions").update(donnees).eq("id", action.id).select("id").single()
        : await supabase.from("site_actions").insert(donnees).select("id").single();

      if (dbError) {
        // 42501 = refus RLS ; PGRST116 = aucune ligne modifiée (session expirée ou droits insuffisants).
        if (dbError.code === CODE_ACCES_REFUSE || dbError.code === "PGRST116") {
          release();
          setSubmitError(
            "Votre session a expiré ou ne permet pas l'enregistrement. Reconnectez-vous puis réessayez."
          );
          return;
        }
        throw new Error(`Supabase: ${dbError.message}`);
      }

      // 2) Puis les photos. Un échec ici n'annule pas l'enregistrement de l'action.
      const bilan = await synchroniserPhotos(
        supabase,
        ligne.id,
        photos,
        action?.photos ?? [],
        setProgression
      );
      photos.forEach(libererApercu);

      // 3) Et les vidéos (y compris un lien collé mais pas encore ajouté à la liste).
      const enAttente = saisieVideo.lien.trim() ? videoDepuisLien(saisieVideo.lien, saisieVideo.titre) : null;
      const listeVideos =
        enAttente && !videos.some((v) => v.url === enAttente.url) ? [...videos, enAttente] : videos;
      const bilanVideos = await synchroniserVideos(supabase, ligne.id, listeVideos, action?.videos ?? []);
      bilan.erreurs.push(...bilanVideos.erreurs);
      setVideosAjoutees(bilanVideos.ajoutees);

      if (action && bilan.erreurs.length === 0) {
        router.push(`/espace/actions/liste?modifiee=${ligne.id}`);
        router.refresh();
        return;
      }
      setBilanPhotos(bilan);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      release();
      setSubmitError(
        `L'action n'a pas pu être ${action ? "modifiée" : "enregistrée"}. Vérifiez votre connexion et réessayez. Si le problème persiste, contactez l'administrateur.`
      );
    } finally {
      setLoading(false);
      setProgression("");
    }
  }

  function nouvelleAction() {
    setPhotos([]);
    setVideos([]);
    setSaisieVideo({ lien: "", titre: "" });
    setVideosAjoutees(0);
    setBilanPhotos({ ajoutees: 0, erreurs: [] });
    setForm(initialForm);
    setErrors({});
    setSubmitError("");
    setSubmitted(false);
    release();
  }

  const secteurNom = secteurs.find((s) => s.id === form.secteurId)?.nom;

  // ── Écran de résultat ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="ecg-ecran ecg-ecran-etroit">
        <EnteteEcran
          icone={action ? "pen" : "plus"}
          titre={action ? "Modifications enregistrées" : "Action enregistrée"}
          description={action ? "L'action a bien été mise à jour." : "L'action a bien été ajoutée au suivi."}
        />
        <Alerte ton="succes" titre={action ? "Modifications enregistrées" : "Action enregistrée"}>
          {form.visiblePublic ? "Elle est visible sur le site public." : "Elle reste dans le suivi interne."}
        </Alerte>

        <Panneau
          titre="Récapitulatif"
          pied={
            <>
              <Link href="/espace/actions/liste" className={BTN}>
                <List size={16} aria-hidden /> Retour à la liste
              </Link>
              {!action && (
                <button type="button" onClick={nouvelleAction} className={BTN_PRINCIPAL}>
                  <Plus size={16} aria-hidden /> Encoder une autre action
                </button>
              )}
            </>
          }
        >
          <dl className="ecg-recap">
            {form.nomAction.trim() && <Recap label="Nom" value={form.nomAction.trim()} />}
            <Recap label="Date" value={form.dateAction} />
            <Recap
              label="Type"
              value={capitalize(form.typeAction === "autre" ? form.typeAutre.trim() : form.typeAction)}
            />
            {form.ville.trim() && <Recap label="Ville" value={form.ville.trim()} />}
            {secteurNom && <Recap label="Secteur" value={secteurNom} />}
            {form.entreprise.trim() && <Recap label="Entreprise" value={form.entreprise.trim()} />}
            {form.participantsTotal.trim() && <Recap label="Participants" value={form.participantsTotal.trim()} />}
            <Recap label="Site public" value={form.visiblePublic ? "Publiée" : "Non publiée (suivi interne)"} />
            {videosAjoutees > 0 && (
              <Recap
                label="Vidéos"
                value={`${videosAjoutees} vidéo${videosAjoutees > 1 ? "s" : ""} ajoutée${videosAjoutees > 1 ? "s" : ""}`}
              />
            )}
            {bilanPhotos.ajoutees > 0 && (
              <Recap
                label="Photos"
                value={`${bilanPhotos.ajoutees} photo${bilanPhotos.ajoutees > 1 ? "s" : ""} ajoutée${bilanPhotos.ajoutees > 1 ? "s" : ""}`}
              />
            )}
          </dl>
          {bilanPhotos.erreurs.length > 0 && (
            <Alerte
              ton="attention"
              role="alert"
              className="mt-5"
              titre="L'action est enregistrée, mais certaines opérations sur les photos ou les vidéos ont échoué :"
            >
              <ul className="mt-1.5 list-disc pl-5">
                {bilanPhotos.erreurs.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p className="mt-1.5">Vous pouvez réessayer depuis l&apos;écran de modification de l&apos;action.</p>
            </Alerte>
          )}
        </Panneau>
      </div>
    );
  }

  // ── Rendu du formulaire ──────────────────────────────────────────────────
  const err = errors;

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran
        icone={action ? "pen" : "plus"}
        titre={action ? "Modifier l'action" : "Encoder une action"}
        description={action ? titreAction(action) : "Les champs marqués d'une * sont obligatoires."}
        actions={
          <Link href="/espace/actions/liste" className={BTN}>
            <ArrowLeft size={16} aria-hidden /> Toutes les actions
          </Link>
        }
      />

        <form onSubmit={handleSubmit} noValidate className="ecg-pile">

          {/* ── L'ACTION ── */}
          <Panneau titre="L&apos;action">
          <div className="space-y-5">
            <Field
              label="Nom de l'action"
              error={err.nomAction}
              hint="Titre court affiché en grand sur le site public. Sans nom, c'est le type d'action qui sert de titre."
            >
              <input
                className={input(err.nomAction)}
                value={form.nomAction}
                onChange={(e) => set("nomAction", e.target.value)}
                maxLength={120}
                placeholder="Ex. Bulletin de rentrée du gouvernement : 0/20…"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date de l'action *" error={err.dateAction}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="jj/mm/aaaa"
                  maxLength={10}
                  className={input(err.dateAction)}
                  value={form.dateAction}
                  onChange={(e) => set("dateAction", formatDateFr(e.target.value))}
                />
              </Field>
              <Field label="Ville" error={err.ville}>
                <input
                  className={input(err.ville)}
                  value={form.ville}
                  onChange={(e) => set("ville", e.target.value)}
                  placeholder="Ex. Namur…"
                />
              </Field>
            </div>

            <Field label="Type d'action *" error={err.typeAction}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {TYPES_ACTION.map((t) => (
                  <ChoiceCard
                    key={t}
                    type="radio"
                    name="typeAction"
                    checked={form.typeAction === t}
                    onChange={() => set("typeAction", t)}
                    label={capitalize(t)}
                  />
                ))}
              </div>
            </Field>

            {form.typeAction === "autre" && (
              <Field label="Précisez le type d'action *" error={err.typeAutre}>
                <input
                  className={input(err.typeAutre)}
                  value={form.typeAutre}
                  onChange={(e) => set("typeAutre", e.target.value)}
                  placeholder="Ex. rassemblement devant le SPF Emploi…"
                  autoFocus
                />
              </Field>
            )}
          </div>
          </Panneau>

          {/* ── CONTEXTE ── */}
          <Panneau titre="Contexte">
          <div className="space-y-5">
            <Field label="Secteur" error={err.secteurId}>
              <select
                className={input(err.secteurId)}
                value={form.secteurId}
                onChange={(e) => {
                  set("secteurId", e.target.value);
                  setErrors((prev) => ({ ...prev, nouveauSecteur: undefined }));
                }}
                disabled={secteursLoading}
              >
                <option value="">
                  {secteursLoading ? "Chargement…" : "— Aucun secteur en particulier —"}
                </option>
                {secteurs.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
                <option value={NOUVEAU_SECTEUR}>+ Ajouter un secteur</option>
              </select>
              {secteursError && <p className="ecg-erreur">{secteursError}</p>}
            </Field>

            {form.secteurId === NOUVEAU_SECTEUR && (
              <div className="rounded-xl border border-[#dde2e7] bg-[#fafbfc] p-4">
                <Field
                  label="Nouveau secteur"
                  error={err.nouveauSecteur}
                  hint="Il sera ajouté à la liste et réutilisable pour les prochaines actions."
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className={input(err.nouveauSecteur)}
                      value={nouveauSecteur}
                      onChange={(e) => {
                        setNouveauSecteur(e.target.value);
                        setErrors((prev) => ({ ...prev, nouveauSecteur: undefined }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          ajouterSecteur();
                        }
                      }}
                      placeholder="Ex. Métal…"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={ajouterSecteur}
                      disabled={ajoutSecteurLoading}
                      className={`${BTN_PRINCIPAL} shrink-0`}
                    >
                      {ajoutSecteurLoading ? <IconeChargement size={16} /> : <Plus size={16} />}
                      Ajouter
                    </button>
                  </div>
                </Field>
              </div>
            )}

            <Field label="Entreprise concernée" error={err.entreprise}>
              <input
                className={input(err.entreprise)}
                value={form.entreprise}
                onChange={(e) => set("entreprise", e.target.value)}
                placeholder="Laisser vide si l'action ne vise pas une entreprise"
              />
            </Field>

            <Field label="Front commun ? *" error={err.frontCommun}>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <ChoiceCard
                  type="radio"
                  name="frontCommun"
                  checked={form.frontCommun === true}
                  onChange={() => set("frontCommun", true)}
                  label="Oui"
                />
                <ChoiceCard
                  type="radio"
                  name="frontCommun"
                  checked={form.frontCommun === false}
                  onChange={() => set("frontCommun", false)}
                  label="Non"
                />
              </div>
            </Field>

            {form.frontCommun === true && (
              <Field label="Avec quels syndicats ?">
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceCard
                    type="checkbox"
                    checked={form.frontCommunCsc}
                    onChange={(v) => set("frontCommunCsc", v)}
                    label="CSC"
                  />
                  <ChoiceCard
                    type="checkbox"
                    checked={form.frontCommunSynova}
                    onChange={(v) => set("frontCommunSynova", v)}
                    label="Synova"
                  />
                </div>
              </Field>
            )}

            <Field label="Déplacement organisé" hint="Cochez ce qui a été organisé (les deux sont possibles).">
              <div className="grid grid-cols-2 gap-2">
                <ChoiceCard
                  type="checkbox"
                  checked={form.deplacementBus}
                  onChange={(v) => set("deplacementBus", v)}
                  label="Bus"
                  icon={<Bus size={16} />}
                />
                <ChoiceCard
                  type="checkbox"
                  checked={form.deplacementTrain}
                  onChange={(v) => set("deplacementTrain", v)}
                  label="Train"
                  icon={<Train size={16} />}
                />
              </div>
            </Field>
          </div>
          </Panneau>

          {/* ── BILAN ── */}
          <Panneau titre="Bilan">
          <div className="space-y-5">
            <Field label="Description" error={err.description}>
              <textarea
                className={`${input(err.description)} min-h-[120px]`}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Déroulement, revendications, faits marquants…"
                rows={5}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre total de participants" error={err.participantsTotal}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className={input(err.participantsTotal)}
                  value={form.participantsTotal}
                  onChange={(e) => set("participantsTotal", e.target.value)}
                />
              </Field>
              <Field label="Participants de notre centrale" error={err.participantsCentrale}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className={input(err.participantsCentrale)}
                  value={form.participantsCentrale}
                  onChange={(e) => set("participantsCentrale", e.target.value)}
                />
              </Field>
            </div>
          </div>
          </Panneau>

          {/* ── PHOTOS ── */}
          <Panneau titre="Photos">
          <div className="space-y-5">
            <Field
              label="Photos de l'action"
              hint="La première photo est la photo principale sur le site public. Elles sont réduites automatiquement avant l'envoi."
            >
              <ChoixPhotos photos={photos} onChange={setPhotos} disabled={loading} />
            </Field>
          </div>
          </Panneau>

          {/* ── VIDÉOS ── */}
          <Panneau titre="Vidéos">
          <div className="space-y-5">
            <Field
              label="Vidéos YouTube"
              hint="Collez le lien d'une vidéo YouTube. Elle sera intégrée à la page de l'action sur le site public."
            >
              <ChoixVideos
                videos={videos}
                onChange={setVideos}
                saisie={saisieVideo}
                onSaisie={setSaisieVideo}
                erreur={err.videos}
                onErreur={(message) => setErrors((prev) => ({ ...prev, videos: message }))}
                disabled={loading}
              />
            </Field>
          </div>
          </Panneau>

          {/* ── SITE PUBLIC ── */}
          <Panneau titre="Site public">
          <div className="space-y-5">
            <Field
              label="Info web"
              error={err.infoWeb}
              hint="Texte affiché sur le site public : court, factuel, sans nom de personne. La description ci-dessus reste interne."
            >
              <textarea
                className={`${input(err.infoWeb)} min-h-[100px]`}
                value={form.infoWeb}
                onChange={(e) => set("infoWeb", e.target.value)}
                placeholder="Ex. Plus de 300 travailleurs réunis devant le siège pour défendre l'emploi…"
                rows={4}
              />
            </Field>

            <PublicationToggle
              checked={form.visiblePublic}
              onChange={(v) => set("visiblePublic", v)}
            />
          </div>
          </Panneau>

          {submitError && <Alerte ton="erreur">{submitError}</Alerte>}
          <div className="ecg-barre-actions">
            <p className="text-sm" aria-live="polite">
              {Object.values(errors).some(Boolean) && !submitError ? (
                <span className="font-semibold text-militant-bordeaux">
                  Certains champs doivent être corrigés avant l&apos;enregistrement.
                </span>
              ) : (
                <span className="ecg-texte-doux">* Champs obligatoires</span>
              )}
            </p>
            <button type="submit" className={BTN_PRINCIPAL}>
              {loading && <IconeChargement size={16} />}
              {loading ? progression || "Enregistrement…" : action ? "Enregistrer les modifications" : "Enregistrer l'action"}
            </button>
          </div>
        </form>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function Field({ label, error, hint, children }: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="ecg-libelle">{label}</label>
      {hint && <p className="ecg-aide -mt-1 mb-2">{hint}</p>}
      {children}
      {error && <p className="ecg-erreur">{error}</p>}
    </div>
  );
}

function ChoiceCard({ type, name, checked, onChange, label, icon }: {
  type: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className={`ecg-choix${checked ? " ecg-choix-actif" : ""}`}>
      <input type={type} name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {icon && <span aria-hidden>{icon}</span>}
      <span>{label}</span>
    </label>
  );
}

function PublicationToggle({ checked, onChange }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`ecg-choix items-start${checked ? " ecg-choix-actif" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-semibold">
          <Globe size={16} aria-hidden />
          Publier sur le site public
        </span>
        <span className="ecg-aide mt-1 block">
          {checked
            ? "Seront visibles : date, type, ville, front commun, nombre de participants et info web (l'entreprise uniquement pour un piquet)."
            : "L'action reste dans le suivi interne."}
        </span>
      </span>
    </label>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function input(error?: string) {
  return `ecg-champ${error ? " ecg-champ-erreur" : ""}`;
}
