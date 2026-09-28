"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { getSupabaseAuth } from "../../../lib/supabase";
import { decouperMotsCles, normaliser } from "../../../lib/themes";

export type Theme = { id: string; mot_cle: string; actif: boolean };

// RLS : écriture réservée aux super admins → refus si la session a expiré.
const CODE_ACCES_REFUSE = "42501";
const BOUTON =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border-2 px-3.5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";
const BOUTON_PRINCIPAL = `${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`;
const BOUTON_SECONDAIRE = `${BOUTON} border-militant-charbon hover:bg-militant-charbon hover:text-white`;

function messageErreur(code: string | undefined, action: string): string {
  if (code === CODE_ACCES_REFUSE || code === "PGRST116") return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  if (code === "23505") return "Ce mot-clé est déjà dans la liste.";
  return `Le mot-clé n'a pas pu être ${action}. Réessayez ; si le problème persiste, reconnectez-vous.`;
}

/** Liste des mots-clés de la veille : ajout (plusieurs à la fois), activation, suppression. */
export default function GestionThemes({ themes }: { themes: Theme[] }) {
  const router = useRouter();
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null); // "ajout" ou id du mot-clé
  const [message, setMessage] = useState<{ id: string; texte: string; ok?: boolean } | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const actifs = themes.filter((t) => t.actif).length;

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const existants = new Set(themes.map((t) => normaliser(t.mot_cle)));
    const proposes = decouperMotsCles(saisie);
    const nouveaux = proposes.filter((m) => !existants.has(normaliser(m)));
    if (!proposes.length) {
      setMessage({ id: "ajout", texte: "Indiquez au moins un mot-clé." });
      return;
    }
    if (!nouveaux.length) {
      setMessage({ id: "ajout", texte: proposes.length > 1 ? "Ces mots-clés sont déjà dans la liste." : "Ce mot-clé est déjà dans la liste." });
      return;
    }
    setEnCours("ajout");
    setMessage(null);
    const { error } = await getSupabaseAuth()
      .from("site_themes")
      .insert(nouveaux.map((mot_cle) => ({ mot_cle, actif: true })));
    setEnCours(null);
    if (error) {
      console.error(error);
      setMessage({ id: "ajout", texte: messageErreur(error.code, "ajouté") });
      return;
    }
    const ignores = proposes.length - nouveaux.length;
    setMessage({
      id: "ajout",
      ok: true,
      texte: `${nouveaux.length} mot${nouveaux.length > 1 ? "s" : ""}-clé${nouveaux.length > 1 ? "s" : ""} ajouté${nouveaux.length > 1 ? "s" : ""}${
        ignores ? ` (${ignores} déjà présent${ignores > 1 ? "s" : ""})` : ""
      }.`,
    });
    setSaisie("");
    router.refresh();
  }

  async function basculer(t: Theme) {
    setEnCours(t.id);
    setMessage(null);
    const { data, error } = await getSupabaseAuth().from("site_themes").update({ actif: !t.actif }).eq("id", t.id).select("id");
    setEnCours(null);
    if (error || !data?.length) {
      console.error(error);
      setMessage({ id: t.id, texte: messageErreur(error?.code ?? "PGRST116", t.actif ? "désactivé" : "activé") });
      return;
    }
    router.refresh();
  }

  async function supprimer(t: Theme) {
    setEnCours(t.id);
    setMessage(null);
    const { data, error } = await getSupabaseAuth().from("site_themes").delete().eq("id", t.id).select("id");
    setEnCours(null);
    setASupprimer(null);
    if (error || !data?.length) {
      console.error(error);
      setMessage({ id: t.id, texte: messageErreur(error?.code ?? "PGRST116", "supprimé") });
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-10">
      <form onSubmit={ajouter} noValidate className="rounded-2xl border border-militant-ardoise p-5 sm:p-6">
        <label htmlFor="mots-cles" className="flex items-center gap-2 font-condensed text-2xl font-extrabold">
          <Plus size={20} className="text-militant-rouge" aria-hidden /> Ajouter des mots-clés
        </label>
        <p className="mt-1 text-sm">
          Un ou plusieurs, séparés par des virgules. Majuscules et accents n&apos;ont pas d&apos;importance ; le mot-clé
          doit commencer un mot : « salaire » retient aussi « salaires », mais « cp » ne retient pas « capacité ».
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="mots-cles"
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              if (message?.id === "ajout") setMessage(null);
            }}
            placeholder="Ex. licenciement, fermeture, chômage temporaire"
            className="w-full rounded-xl border border-militant-ardoise bg-white px-3 py-2.5 text-sm focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge"
          />
          <button type="submit" disabled={enCours === "ajout"} className={`${BOUTON_PRINCIPAL} shrink-0`}>
            {enCours === "ajout" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Plus size={15} aria-hidden />}
            Ajouter
          </button>
        </div>
        {message?.id === "ajout" && <Message texte={message.texte} ok={message.ok} />}
      </form>

      <section aria-labelledby="titre-liste-themes">
        <h2 id="titre-liste-themes" className="border-b-2 border-militant-charbon pb-2 font-condensed text-2xl font-extrabold">
          {themes.length} mot{themes.length > 1 ? "s" : ""}-clé{themes.length > 1 ? "s" : ""}, dont {actifs} actif
          {actifs > 1 ? "s" : ""}
        </h2>
        {actifs === 0 && themes.length > 0 && (
          <Message texte="Aucun mot-clé actif : la veille n'affiche aucun article pertinent." />
        )}
        {themes.length === 0 ? (
          <p className="mt-4 text-lg">Aucun mot-clé pour l&apos;instant. Ajoutez les thèmes suivis par la centrale ci-dessus.</p>
        ) : (
          <ul className="divide-y divide-militant-ardoise border-b border-militant-ardoise">
            {themes.map((t) => {
              const occupe = enCours === t.id;
              return (
                <li key={t.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Tag
                      size={17}
                      aria-hidden
                      className={`shrink-0 ${t.actif ? "text-militant-rouge" : "text-militant-ardoise"}`}
                    />
                    <p className={`min-w-0 flex-1 break-words text-[17px] ${t.actif ? "font-bold" : "font-medium line-through decoration-militant-ardoise"}`}>
                      {t.mot_cle}
                      {!t.actif && <span className="sr-only"> (désactivé)</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={t.actif}
                        aria-label={`Mot-clé actif : ${t.mot_cle}`}
                        onClick={() => basculer(t)}
                        disabled={occupe}
                        className={`${BOUTON} min-w-[7.5rem] ${
                          t.actif
                            ? "border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon"
                            : "border-militant-ardoise hover:border-militant-charbon"
                        }`}
                      >
                        {occupe && <Loader2 size={15} className="animate-spin" aria-hidden />}
                        {t.actif ? "Actif" : "Désactivé"}
                      </button>
                      {aSupprimer === t.id ? (
                        <span role="alertdialog" aria-label={`Confirmer la suppression de ${t.mot_cle}`} className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => supprimer(t)} disabled={occupe} autoFocus className={BOUTON_PRINCIPAL}>
                            <Trash2 size={15} aria-hidden /> Oui, supprimer
                          </button>
                          <button type="button" onClick={() => setASupprimer(null)} className={BOUTON_SECONDAIRE}>
                            Annuler
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setASupprimer(t.id)}
                          aria-label={`Supprimer : ${t.mot_cle}`}
                          title="Supprimer"
                          className={`${BOUTON} border-transparent px-2.5 text-militant-bordeaux hover:border-militant-bordeaux`}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                  {message?.id === t.id && <Message texte={message.texte} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Message({ texte, ok }: { texte: string; ok?: boolean }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`mt-2 flex items-start gap-1.5 text-sm font-semibold ${ok ? "" : "text-militant-bordeaux"}`}
    >
      {!ok && <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />}
      {texte}
    </p>
  );
}
