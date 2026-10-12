"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Tag, Trash2 } from "lucide-react";
import Interrupteur from "../../_partage/Interrupteur";
import { Alerte, Vide } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { decouperMotsCles, normaliser } from "../../../../lib/themes";

export type Theme = { id: string; mot_cle: string; actif: boolean };

// RLS : écriture réservée aux super admins → refus si la session a expiré.
const CODE_ACCES_REFUSE = "42501";
const BOUTON = "ecg-btn ecg-btn-petit";
const BOUTON_PRINCIPAL = "ecg-btn ecg-btn-principal";

function messageErreur(code: string | undefined, action: string): string {
  if (code === CODE_ACCES_REFUSE || code === "PGRST116") return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  if (code === "23505") return "Ce mot-clé est déjà dans la liste.";
  return `Le mot-clé n'a pas pu être ${action}. Réessayez ; si le problème persiste, reconnectez-vous.`;
}

/** Liste des mots-clés de Scan News : ajout (plusieurs à la fois), activation, suppression. */
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
    <>
      <form onSubmit={ajouter} noValidate className="ecg-panneau ecg-panneau-corps">
        <label htmlFor="mots-cles" className="ecg-sous-titre flex items-center gap-2">
          <Plus size={20} aria-hidden /> Ajouter des mots-clés
        </label>
        <p className="ecg-aide">
          Un ou plusieurs, séparés par des virgules. Majuscules et accents n&apos;ont pas d&apos;importance ; le mot-clé
          doit commencer un mot : « salaire » retient aussi « salaires », mais « cp » ne retient pas « capacité ».
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="mots-cles"
            name="mots-cles"
            autoComplete="off"
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              if (message?.id === "ajout") setMessage(null);
            }}
            placeholder="Ex. licenciement, fermeture, chômage temporaire…"
            className="ecg-champ"
          />
          <button type="submit" disabled={enCours === "ajout"} className={`${BOUTON_PRINCIPAL} shrink-0`}>
            {enCours === "ajout" ? <IconeChargement size={15} /> : <Plus size={15} aria-hidden />}
            Ajouter
          </button>
        </div>
        {message?.id === "ajout" && <Message texte={message.texte} ok={message.ok} />}
      </form>

      <section aria-labelledby="titre-liste-themes" className="ecg-panneau">
        <div className="ecg-panneau-tete">
          <div>
            <h2 id="titre-liste-themes">Mots-clés</h2>
            <p>
              {themes.length} mot{themes.length > 1 ? "s" : ""}-clé{themes.length > 1 ? "s" : ""}, dont {actifs} actif
              {actifs > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {actifs === 0 && themes.length > 0 && (
          <div className="px-5 pt-4">
            <Alerte ton="attention" role={null}>
              Aucun mot-clé actif : le fil n&apos;affiche aucun article pertinent.
            </Alerte>
          </div>
        )}
        {themes.length === 0 ? (
          <Vide icone="tag" titre="Aucun mot-clé pour l'instant">
            Ajoutez ci-dessus les thèmes suivis par la centrale.
          </Vide>
        ) : (
          <ul className="ecg-lignes">
            {themes.map((t) => {
              const occupe = enCours === t.id;
              return (
                <li key={t.id} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Tag size={17} aria-hidden className="shrink-0" />
                    <p className={`min-w-0 flex-1 break-words text-[16px] ${t.actif ? "font-semibold" : "ecg-texte-doux line-through"}`}>
                      {t.mot_cle}
                      {!t.actif && <span className="sr-only"> (désactivé)</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Interrupteur
                        actif={t.actif}
                        onChange={() => basculer(t)}
                        label={`Mot-clé actif : ${t.mot_cle}`}
                        etatOn="Actif"
                        etatOff="Désactivé"
                        enCours={occupe}
                      />
                      {aSupprimer === t.id ? (
                        <span role="alertdialog" aria-label={`Confirmer la suppression de ${t.mot_cle}`} className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => supprimer(t)} disabled={occupe} autoFocus className="ecg-btn ecg-btn-petit ecg-btn-danger">
                            <Trash2 size={15} aria-hidden /> Oui, supprimer
                          </button>
                          <button type="button" onClick={() => setASupprimer(null)} className="ecg-btn ecg-btn-petit">
                            Annuler
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setASupprimer(t.id)}
                          aria-label={`Supprimer : ${t.mot_cle}`}
                          title="Supprimer"
                          className={`${BOUTON} ecg-btn-fantome ecg-btn-fantome-danger`}
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
    </>
  );
}

function Message({ texte, ok }: { texte: string; ok?: boolean }) {
  return (
    <p role={ok ? "status" : "alert"} className={ok ? "mt-2 flex items-start gap-1.5 text-sm font-semibold" : "ecg-erreur"}>
      {!ok && <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />}
      {texte}
    </p>
  );
}
