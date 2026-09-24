"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseAuth } from "./lib/supabase";
import { isoToDateCourte } from "./lib/dates";
import { useOnceSubmit } from "./lib/use-once-submit";
import { AlertCircle, Bus, CheckCircle, Globe, Loader2, Plus, Train } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type Secteur = { id: string; nom: string };

const TYPES_ACTION = [
  "grève générale",
  "manifestation nationale",
  "manifestation",
  "piquet en entreprise",
  "autre",
] as const;
type TypeAction = (typeof TYPES_ACTION)[number] | "";

const NOUVEAU_SECTEUR = "__nouveau__";

type FormData = {
  dateAction: string; // ISO (aaaa-mm-jj), fourni par <input type="date">
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

type Errors = Partial<Record<keyof FormData | "nouveauSecteur", string>>;

const initialForm: FormData = {
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

export default function FormulaireAction({ barreAdmin }: { barreAdmin?: React.ReactNode }) {
  const [form, setForm] = useState<FormData>(initialForm);
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
    if (!form.dateAction) e.dateAction = "Requis";
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

    try {
      const supabase = getSupabaseAuth();
      const { error: dbError } = await supabase.from("site_actions").insert({
        date_action: form.dateAction,
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
      });

      if (dbError) {
        if (dbError.code === CODE_ACCES_REFUSE) {
          release();
          setSubmitError(
            "Votre session a expiré ou ne permet pas l'enregistrement. Reconnectez-vous puis réessayez."
          );
          return;
        }
        throw new Error(`Supabase: ${dbError.message}`);
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      release();
      setSubmitError(
        "L'action n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez. Si le problème persiste, contactez l'administrateur."
      );
    } finally {
      setLoading(false);
    }
  }

  function nouvelleAction() {
    setForm(initialForm);
    setErrors({});
    setSubmitError("");
    setSubmitted(false);
    release();
  }

  const secteurNom = secteurs.find((s) => s.id === form.secteurId)?.nom;

  // ── Écran succès ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-5">
        {barreAdmin}
          <header className="bg-red-700 rounded-2xl px-6 py-5 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl p-2.5 shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white text-lg font-semibold leading-snug">Action enregistrée</p>
                <p className="text-red-100 text-sm mt-1">
                  L&apos;action a bien été ajoutée au suivi.
                </p>
              </div>
            </div>
          </header>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Recap label="Date" value={isoToDateCourte(form.dateAction)} />
              <Recap
                label="Type"
                value={capitalize(form.typeAction === "autre" ? form.typeAutre.trim() : form.typeAction)}
              />
              {form.ville.trim() && <Recap label="Ville" value={form.ville.trim()} />}
              {secteurNom && <Recap label="Secteur" value={secteurNom} />}
              {form.entreprise.trim() && <Recap label="Entreprise" value={form.entreprise.trim()} />}
              {form.participantsTotal.trim() && (
                <Recap label="Participants" value={form.participantsTotal.trim()} />
              )}
              <Recap
                label="Site public"
                value={form.visiblePublic ? "Publiée" : "Non publiée (suivi interne)"}
              />
            </dl>
            <div className="mt-6 text-center">
              <button
                onClick={nouvelleAction}
                className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors"
              >
                <Plus size={16} /> Encoder une autre action
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Rendu du formulaire ──────────────────────────────────────────────────
  const err = errors;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {barreAdmin}
        <header className="bg-red-700 rounded-2xl px-6 py-5 text-white shadow-lg">
          <h1 className="text-xl font-semibold leading-snug">Suivi des actions — Encoder une action</h1>
          <p className="text-red-100 text-sm mt-1.5">Centrale Générale FGTB Namur – Luxembourg</p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* ── L'ACTION ── */}
          <SectionTitle>1. L&apos;action</SectionTitle>
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date de l'action *" error={err.dateAction}>
                <input
                  type="date"
                  className={input(err.dateAction)}
                  value={form.dateAction}
                  onChange={(e) => set("dateAction", e.target.value)}
                />
              </Field>
              <Field label="Ville" error={err.ville}>
                <input
                  className={input(err.ville)}
                  value={form.ville}
                  onChange={(e) => set("ville", e.target.value)}
                  placeholder="Ex. Namur"
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
                  placeholder="Ex. rassemblement devant le SPF Emploi"
                  autoFocus
                />
              </Field>
            )}
          </div>

          {/* ── CONTEXTE ── */}
          <SectionTitle>2. Contexte</SectionTitle>
          <div className="px-6 py-6 space-y-5">
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
              {secteursError && <p className="text-red-600 text-xs mt-1">{secteursError}</p>}
            </Field>

            {form.secteurId === NOUVEAU_SECTEUR && (
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
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
                      placeholder="Ex. Métal"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={ajouterSecteur}
                      disabled={ajoutSecteurLoading}
                      className="inline-flex items-center justify-center gap-1.5 shrink-0 bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
                    >
                      {ajoutSecteurLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
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

          {/* ── BILAN ── */}
          <SectionTitle>3. Bilan</SectionTitle>
          <div className="px-6 py-6 space-y-5">
            <Field label="Description" error={err.description}>
              <textarea
                className={`${input(err.description)} min-h-[120px] resize-y`}
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

          {/* ── SITE PUBLIC ── */}
          <SectionTitle>4. Site public</SectionTitle>
          <div className="px-6 py-6 space-y-5">
            <Field
              label="Info web"
              error={err.infoWeb}
              hint="Texte affiché sur le site public : court, factuel, sans nom de personne. La description ci-dessus reste interne."
            >
              <textarea
                className={`${input(err.infoWeb)} min-h-[100px] resize-y`}
                value={form.infoWeb}
                onChange={(e) => set("infoWeb", e.target.value)}
                placeholder="Ex. Plus de 300 travailleurs réunis devant le siège pour défendre l'emploi."
                rows={4}
              />
            </Field>

            <PublicationToggle
              checked={form.visiblePublic}
              onChange={(v) => set("visiblePublic", v)}
            />
          </div>

          <div className="px-6 pb-6 space-y-3">
            {submitError && (
              <div role="alert" className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{submitError}</p>
              </div>
            )}
            {Object.values(errors).some(Boolean) && !submitError && (
              <p className="text-red-600 text-sm text-center">
                Certains champs doivent être corrigés avant l&apos;enregistrement.
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Enregistrement…" : "Enregistrer l'action"}
            </button>
            <p className="text-xs text-gray-400 text-center">* Champs obligatoires</p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-700 text-white px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em]">
      {children}
    </div>
  );
}

function Field({ label, error, hint, children }: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
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
    <label
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 cursor-pointer transition-colors text-sm ${
        checked
          ? "border-red-400 bg-red-50 text-gray-900"
          : "border-gray-200 text-gray-700 hover:border-red-200"
      }`}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-red-700"
      />
      {icon && <span className={checked ? "text-red-700" : "text-gray-400"}>{icon}</span>}
      <span className="font-medium">{label}</span>
    </label>
  );
}

function PublicationToggle({ checked, onChange }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${
        checked ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-red-200"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-red-700 mt-0.5 h-4 w-4 shrink-0"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Globe size={16} className={checked ? "text-red-700" : "text-gray-400"} />
          Publier sur le site public
        </span>
        <span className="block text-xs text-gray-500 mt-1">
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}

function input(error?: string) {
  return `w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-colors ${
    error
      ? "border-red-400 focus:ring-red-300 bg-red-50"
      : "border-gray-300 focus:ring-red-200"
  }`;
}
