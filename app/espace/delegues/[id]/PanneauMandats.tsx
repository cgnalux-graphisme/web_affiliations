"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Flag, Pencil, Plus, Square, Trash2 } from "lucide-react";
import type { CarteDelegue } from "../../../../lib/delegues/donnees-serveur";
import { LIBELLES_ORGANES, libelleMandat, mandatEnCours } from "../../../../lib/delegues/mandats";
import { ORGANES, type Mandat } from "../../../../lib/delegues/types";
import { formatDateFr, isoToDateFr } from "../../../../lib/dates";
import { ajouterMandat, confirmerMandat, enregistrerMandat, supprimerMandat, terminerMandat } from "../actions";
import ChampsEdition, { type DefChamp } from "../../_partage/ChampsEdition";
import { BTN, BTN_PETIT, CHAMP, Panneau, Statut } from "../../_partage/ui";

function champsMandat(carte: CarteDelegue): DefChamp[] {
  return [
    { nom: "organe", libelle: "Organe", type: "choix", largeur: "tiers", options: ORGANES.map((o) => ({ valeur: o, libelle: LIBELLES_ORGANES[o] })) },
    { nom: "qualite", libelle: "Qualité", type: "choix", largeur: "tiers",
      options: [{ valeur: "", libelle: "—" }, { valeur: "effectif", libelle: "Effectif" }, { valeur: "suppleant", libelle: "Suppléant" }] },
    { nom: "site_id", libelle: "Site (UTE)", type: "choix", largeur: "tiers",
      options: [{ valeur: "", libelle: "Site de l'unité de rattachement" }, ...carte.sites.map((s) => ({ valeur: s.id, libelle: s.nom }))] },
    { nom: "libelle", libelle: "Libellé (Autre, Instances CG)", largeur: "demi" },
    { nom: "fonction", libelle: "Fonction", exemple: "Président, Secrétaire", largeur: "demi" },
    { nom: "debut", libelle: "Début", type: "date", largeur: "tiers" },
    { nom: "fin", libelle: "Fin", type: "date", largeur: "tiers" },
  ];
}

function LigneMandat({ carte, m }: { carte: CarteDelegue; m: Mandat }) {
  const router = useRouter();
  const [mode, setMode] = useState<"" | "modifier" | "terminer" | "supprimer">("");
  const [fin, setFin] = useState("");
  const [erreur, setErreur] = useState("");
  const site = carte.sites.find((s) => s.id === m.site_id)?.nom;

  async function faire(p: Promise<{ ok: true } | { ok: false; erreur: string }>) {
    setErreur("");
    const r = await p;
    if (!r.ok) return setErreur(r.erreur);
    setMode("");
    router.refresh();
  }

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <b>{libelleMandat(m)}</b>
        <span className="ecg-texte-doux text-sm">
          {[site, m.debut && `depuis le ${isoToDateFr(m.debut)}`, m.fin && `jusqu'au ${isoToDateFr(m.fin)}`].filter(Boolean).join(" · ")}
        </span>
        {m.a_verifier && (
          <>
            <Statut ton="attente" icone={Flag}>À vérifier</Statut>
            <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => faire(confirmerMandat(m.id))}><Check size={14} aria-hidden /> Confirmer</button>
          </>
        )}
        <span className="ml-auto flex gap-1">
          <button type="button" aria-label={`Modifier ${libelleMandat(m)}`} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => setMode(mode === "modifier" ? "" : "modifier")}><Pencil size={16} aria-hidden /></button>
          {!m.fin && <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => setMode("terminer")}><Square size={14} aria-hidden /> Terminer</button>}
          <button type="button" aria-label={`Supprimer ${libelleMandat(m)}`} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} onClick={() => setMode("supprimer")}><Trash2 size={16} aria-hidden /></button>
        </span>
      </div>
      {m.a_verifier && <p className="ecg-texte-doux text-sm">{m.a_verifier}</p>}
      {mode === "terminer" && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="grid text-sm">Date de fin
            <input className={`${CHAMP} w-40`} inputMode="numeric" placeholder="jj/mm/aaaa" value={fin} onChange={(e) => setFin(formatDateFr(e.target.value))} />
          </label>
          <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => faire(terminerMandat(m.id, fin))}>Terminer le mandat</button>
          <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => setMode("")}>Annuler</button>
        </div>
      )}
      {mode === "supprimer" && (
        <span role="alertdialog" aria-label="Supprimer ce mandat ?" className="mt-2 flex flex-wrap items-center gap-2">
          <b className="text-sm">Supprimer ce mandat ? (Pour un mandat fini, préférez « Terminer ».)</b>
          <button type="button" autoFocus className={`${BTN} ${BTN_PETIT} ecg-btn-danger`} onClick={() => faire(supprimerMandat(m.id))}>Oui</button>
          <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => setMode("")}>Non</button>
        </span>
      )}
      {mode === "modifier" && (
        <div className="mt-2">
          <ChampsEdition id={`m-${m.id}`} valeurs={m} champs={champsMandat(carte)} enregistrer={(v) => enregistrerMandat(m.id, v)} onSucces={() => setMode("")} />
        </div>
      )}
      {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
    </li>
  );
}

export default function PanneauMandats({ carte }: { carte: CarteDelegue }) {
  const [ajout, setAjout] = useState(false);
  const jour = new Date().toISOString().slice(0, 10);
  const enCours = carte.mandats.filter((m) => mandatEnCours(m, jour));
  const finis = carte.mandats.filter((m) => !mandatEnCours(m, jour));

  return (
    <Panneau titre="Mandats" sousTitre={`${enCours.length} en cours`}
      actions={<button type="button" className={BTN} aria-expanded={ajout} onClick={() => setAjout(!ajout)}><Plus size={15} aria-hidden /> Ajouter un mandat</button>}>
      {ajout && (
        <div className="mb-4">
          <ChampsEdition id="nouveau-mandat" toujoursActif valeurs={{ organe: "ds", qualite: "effectif" }} champs={champsMandat(carte)}
            enregistrer={(v) => ajouterMandat(carte.delegue.id, v)} libelleBouton="Ajouter le mandat" onSucces={() => setAjout(false)} />
        </div>
      )}
      {enCours.length === 0 ? <p className="ecg-texte-doux">Aucun mandat en cours.</p> : (
        <ul className="ecg-lignes">{enCours.map((m) => <LigneMandat key={m.id} carte={carte} m={m} />)}</ul>
      )}
      {finis.length > 0 && (
        <details className="mt-3">
          <summary className="flex cursor-pointer items-center gap-1 font-semibold"><ChevronDown size={16} aria-hidden /> {finis.length} mandat(s) terminé(s)</summary>
          <ul className="ecg-lignes">{finis.map((m) => <LigneMandat key={m.id} carte={carte} m={m} />)}</ul>
        </details>
      )}
    </Panneau>
  );
}
