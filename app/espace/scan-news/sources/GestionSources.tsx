"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Pencil, Plus, Rss, Trash2, X } from "lucide-react";
import Interrupteur from "../../_partage/Interrupteur";
import { Vide } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { urlFluxValide } from "../../../../lib/veille";

export type Source = { id: string; nom: string; url_flux: string; actif: boolean };
type Saisie = { nom: string; url: string };
type Erreurs = Partial<Record<keyof Saisie, string>>;

// RLS : écriture réservée aux super admins → refus si la session a expiré.
const CODE_ACCES_REFUSE = "42501";
const BOUTON = "ecg-btn ecg-btn-petit";
const BOUTON_PRINCIPAL = "ecg-btn ecg-btn-principal";
const BOUTON_SECONDAIRE = `${BOUTON}`;

function valider(s: Saisie, sources: Source[], idCourant?: string): Erreurs {
  const e: Erreurs = {};
  if (!s.nom.trim()) e.nom = "Indiquez le nom de la source";
  if (!s.url.trim()) e.url = "Indiquez l'adresse du flux RSS";
  else if (!urlFluxValide(s.url)) e.url = "Adresse complète attendue (https://…)";
  else if (sources.some((x) => x.id !== idCourant && x.url_flux === s.url.trim())) e.url = "Ce flux est déjà dans la liste";
  return e;
}

function messageErreur(code: string | undefined, action: string): string {
  if (code === CODE_ACCES_REFUSE || code === "PGRST116") return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  if (code === "23505") return "Ce flux est déjà dans la liste.";
  if (code === "23503") return "Cette source a déjà des articles dans le fil : désactivez-la plutôt que de la supprimer.";
  return `La source n'a pas pu être ${action}. Réessayez ; si le problème persiste, reconnectez-vous.`;
}

/** Liste des sources de Scan News : ajout, modification, activation, suppression. */
export default function GestionSources({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [ajout, setAjout] = useState<Saisie>({ nom: "", url: "" });
  const [erreursAjout, setErreursAjout] = useState<Erreurs>({});
  const [enCours, setEnCours] = useState<string | null>(null); // "ajout" ou id de la source
  const [message, setMessage] = useState<{ id: string; texte: string } | null>(null);
  const [edition, setEdition] = useState<{ id: string; saisie: Saisie; erreurs: Erreurs } | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const erreurs = valider(ajout, sources);
    setErreursAjout(erreurs);
    if (Object.keys(erreurs).length) return;
    setEnCours("ajout");
    setMessage(null);
    const { error } = await getSupabaseAuth()
      .from("site_sources")
      .insert({ nom: ajout.nom.trim(), url_flux: ajout.url.trim(), actif: true });
    setEnCours(null);
    if (error) {
      console.error(error);
      setMessage({ id: "ajout", texte: messageErreur(error.code, "ajoutée") });
      return;
    }
    setAjout({ nom: "", url: "" });
    router.refresh();
  }

  async function modifier(id: string, maj: Partial<Pick<Source, "nom" | "url_flux" | "actif">>, action: string) {
    setEnCours(id);
    setMessage(null);
    const { data, error } = await getSupabaseAuth().from("site_sources").update(maj).eq("id", id).select("id");
    setEnCours(null);
    if (error || !data?.length) {
      console.error(error);
      setMessage({ id, texte: messageErreur(error?.code ?? "PGRST116", action) });
      return false;
    }
    router.refresh();
    return true;
  }

  async function enregistrerEdition() {
    if (!edition) return;
    const erreurs = valider(edition.saisie, sources, edition.id);
    if (Object.keys(erreurs).length) {
      setEdition({ ...edition, erreurs });
      return;
    }
    const ok = await modifier(
      edition.id,
      { nom: edition.saisie.nom.trim(), url_flux: edition.saisie.url.trim() },
      "modifiée"
    );
    if (ok) setEdition(null);
  }

  async function supprimer(id: string) {
    setEnCours(id);
    setMessage(null);
    const { data, error } = await getSupabaseAuth().from("site_sources").delete().eq("id", id).select("id");
    setEnCours(null);
    setASupprimer(null);
    if (error || !data?.length) {
      console.error(error);
      setMessage({ id, texte: messageErreur(error?.code ?? "PGRST116", "supprimée") });
      return;
    }
    router.refresh();
  }

  return (
    <>
      <form onSubmit={ajouter} noValidate className="ecg-panneau ecg-panneau-corps">
        <h2 className="ecg-sous-titre flex items-center gap-2">
          <Plus size={20} aria-hidden /> Ajouter une source
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Champ id="nom-ajout" label="Nom" erreur={erreursAjout.nom}>
            <input
              id="nom-ajout"
              value={ajout.nom}
              onChange={(e) => {
                setAjout({ ...ajout, nom: e.target.value });
                setErreursAjout({ ...erreursAjout, nom: undefined });
              }}
              placeholder="Ex. RTBF Info…"
              maxLength={120}
              className={champ(erreursAjout.nom)}
            />
          </Champ>
          <Champ id="url-ajout" label="Adresse du flux RSS" erreur={erreursAjout.url}>
            <input
              id="url-ajout"
              type="url"
              inputMode="url"
              value={ajout.url}
              onChange={(e) => {
                setAjout({ ...ajout, url: e.target.value });
                setErreursAjout({ ...erreursAjout, url: undefined });
              }}
              placeholder="https://…/rss"
              spellCheck={false}
              className={champ(erreursAjout.url)}
            />
          </Champ>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={enCours === "ajout"} className={BOUTON_PRINCIPAL}>
            {enCours === "ajout" ? <IconeChargement size={15} /> : <Plus size={15} aria-hidden />}
            Ajouter la source
          </button>
          {message?.id === "ajout" && <MessageErreur texte={message.texte} />}
        </div>
      </form>

      <section aria-labelledby="titre-liste-sources" className="ecg-panneau">
        <div className="ecg-panneau-tete">
          <div>
            <h2 id="titre-liste-sources">Flux suivis</h2>
            <p>
              {sources.length} source{sources.length > 1 ? "s" : ""}, dont {sources.filter((s) => s.actif).length} active
              {sources.filter((s) => s.actif).length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {sources.length === 0 ? (
          <Vide icone="rss" titre="Aucune source pour l'instant">
            Ajoutez ci-dessus le flux RSS d&apos;un média fiable.
          </Vide>
        ) : (
          <ul className="ecg-lignes">
            {sources.map((s) => {
              const enEdition = edition?.id === s.id;
              const occupe = enCours === s.id;
              return (
                <li key={s.id}>
                  {enEdition ? (
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                      <Champ id={`nom-${s.id}`} label="Nom" erreur={edition.erreurs.nom}>
                        <input
                          id={`nom-${s.id}`}
                          value={edition.saisie.nom}
                          onChange={(e) =>
                            setEdition({ ...edition, saisie: { ...edition.saisie, nom: e.target.value }, erreurs: {} })
                          }
                          maxLength={120}
                          autoFocus
                          className={champ(edition.erreurs.nom)}
                        />
                      </Champ>
                      <Champ id={`url-${s.id}`} label="Adresse du flux RSS" erreur={edition.erreurs.url}>
                        <input
                          id={`url-${s.id}`}
                          type="url"
                          value={edition.saisie.url}
                          onChange={(e) =>
                            setEdition({ ...edition, saisie: { ...edition.saisie, url: e.target.value }, erreurs: {} })
                          }
                          spellCheck={false}
                          className={champ(edition.erreurs.url)}
                        />
                      </Champ>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button type="button" onClick={enregistrerEdition} disabled={occupe} className={BOUTON_PRINCIPAL}>
                          {occupe ? <IconeChargement size={15} /> : <Check size={15} aria-hidden />}
                          Enregistrer
                        </button>
                        <button type="button" onClick={() => setEdition(null)} disabled={occupe} className={BOUTON_SECONDAIRE}>
                          <X size={15} aria-hidden /> Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                      <span className="ecg-mini mt-0.5" style={{ "--c": s.actif ? "var(--app)" : "#b9c2ca" } as React.CSSProperties} aria-hidden>
                        <Rss size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[16px] font-semibold ${s.actif ? "" : "ecg-texte-doux"}`}>{s.nom}</p>
                        <p className="ecg-texte-doux mt-0.5 break-all text-[13px]">{s.url_flux}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Interrupteur
                          actif={s.actif}
                          onChange={() => modifier(s.id, { actif: !s.actif }, s.actif ? "désactivée" : "activée")}
                          label={`Source lue : ${s.nom}`}
                          etatOn="Active"
                          etatOff="Désactivée"
                          enCours={occupe}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEdition({ id: s.id, saisie: { nom: s.nom, url: s.url_flux }, erreurs: {} });
                            setASupprimer(null);
                          }}
                          aria-label={`Modifier : ${s.nom}`}
                          className={BOUTON_SECONDAIRE}
                        >
                          <Pencil size={15} aria-hidden /> Modifier
                        </button>
                        {aSupprimer === s.id ? (
                          <span role="alertdialog" aria-label={`Confirmer la suppression de ${s.nom}`} className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => supprimer(s.id)} disabled={occupe} autoFocus className={`${BOUTON} ecg-btn-danger`}>
                              <Trash2 size={15} aria-hidden /> Oui, supprimer
                            </button>
                            <button type="button" onClick={() => setASupprimer(null)} className={BOUTON_SECONDAIRE}>
                              Annuler
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setASupprimer(s.id)}
                            aria-label={`Supprimer : ${s.nom}`}
                            title="Supprimer"
                            className={`${BOUTON} ecg-btn-fantome ecg-btn-fantome-danger`}
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {message?.id === s.id && <MessageErreur texte={message.texte} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function Champ({ id, label, erreur, children }: { id: string; label: string; erreur?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="ecg-libelle">
        {label}
      </label>
      {children}
      {erreur && <p className="ecg-erreur">{erreur}</p>}
    </div>
  );
}

function MessageErreur({ texte }: { texte: string }) {
  return (
    <p role="alert" className="ecg-erreur">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
      {texte}
    </p>
  );
}

function champ(erreur?: string) {
  return `ecg-champ${erreur ? " ecg-champ-erreur" : ""}`;
}
