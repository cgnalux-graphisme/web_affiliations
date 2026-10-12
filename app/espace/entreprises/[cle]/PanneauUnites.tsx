"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { formaterNumeroUe } from "../../../../lib/bce/numero";
import { isoToDateFr } from "../../../../lib/dates";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import type { Unite } from "../../../../lib/entreprises/types";
import { ajouterUnite, enregistrerUnite, supprimerUnite } from "../actions";
import { BTN, BTN_PETIT, CHAMP, Panneau, Vide } from "../../_partage/ui";
import ChampsEdition, { type DefChamp } from "./ChampsEdition";

function champsUnite(fiche: Fiche, avecStatut: boolean): DefChamp[] {
  return [
    { nom: "denomination", libelle: "Dénomination", largeur: "plein" },
    { nom: "rue", libelle: "Rue", largeur: "demi" },
    { nom: "numero", libelle: "Numéro", largeur: "tiers" },
    { nom: "boite", libelle: "Boîte", largeur: "tiers" },
    { nom: "code_postal", libelle: "Code postal", largeur: "tiers" },
    { nom: "localite", libelle: "Localité", largeur: "demi" },
    { nom: "date_debut", libelle: "Date de début", type: "date", largeur: "tiers" },
    { nom: "site_id", libelle: "Site", type: "choix", largeur: "demi", options: fiche.sites.map((s) => ({ valeur: s.id, libelle: s.nom })) },
    ...(avecStatut ? [{ nom: "statut", libelle: "Statut", type: "choix" as const, largeur: "tiers" as const,
      options: [{ valeur: "actif", libelle: "Active" }, { valeur: "arrete", libelle: "Arrêtée" }] }] : []),
  ];
}

function LigneUnite({ fiche, u }: { fiche: Fiche; u: Unite }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState("");

  async function rattacher(siteId: string) {
    const r = await enregistrerUnite(u.id, { site_id: siteId });
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }
  async function supprimer() {
    const r = await supprimerUnite(u.id);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <>
      <tr>
        <td className="tabular-nums">{u.numero_ue ? formaterNumeroUe(u.numero_ue) : "Sans n°"}</td>
        <td>
          {[u.rue, u.numero, u.boite && `bte ${u.boite}`].filter(Boolean).join(" ")}
          <div className="ecg-texte-doux text-sm">{[u.code_postal, u.localite].filter(Boolean).join(" ")}</div>
        </td>
        <td>{u.date_debut ? isoToDateFr(u.date_debut) : ""}</td>
        <td>
          <label className="sr-only" htmlFor={`site-u-${u.id}`}>Site de l'unité {u.numero_ue ?? u.rue}</label>
          <select id={`site-u-${u.id}`} value={u.site_id ?? ""} onChange={(e) => rattacher(e.target.value)} className={`${CHAMP} w-auto`}>
            <option value="" disabled>Choisir…</option>
            {fiche.sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </td>
        <td className="whitespace-nowrap">
          <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`}
            aria-label={`Modifier l'unité ${u.numero_ue ?? u.rue}`}>
            <Pencil size={16} aria-hidden />
          </button>
          {u.origine === "manuel" && (
            <button type="button" onClick={supprimer} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`}
              aria-label={`Supprimer l'unité ${u.rue ?? ""}`}>
              <Trash2 size={16} aria-hidden />
            </button>
          )}
        </td>
      </tr>
      {erreur && <tr><td colSpan={5}><p role="alert" className="ecg-erreur">{erreur}</p></td></tr>}
      {ouvert && (
        <tr>
          <td colSpan={5}>
            <ChampsEdition id={`u-${u.id}`} valeurs={u} champs={champsUnite(fiche, true)} enregistrer={(v) => enregistrerUnite(u.id, v)} onSucces={() => setOuvert(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

function Tableau({ fiche, unites }: { fiche: Fiche; unites: Unite[] }) {
  return (
    <div className="ecg-tableau-cadre">
      <table className="ecg-tableau">
        <thead>
          <tr><th scope="col">N° d'unité</th><th scope="col">Adresse</th><th scope="col">Début</th><th scope="col">Site</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>{unites.map((u) => <LigneUnite key={u.id} fiche={fiche} u={u} />)}</tbody>
      </table>
    </div>
  );
}

export default function PanneauUnites({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const [ajout, setAjout] = useState(false);
  const actives = fiche.unites.filter((u) => u.statut === "actif");
  const arretees = fiche.unites.filter((u) => u.statut === "arrete");
  const principal = fiche.sites.find((s) => s.principal);

  return (
    <Panneau
      titre="Unités d'établissement"
      sousTitre={`${actives.length} active${actives.length > 1 ? "s" : ""}`}
      corps={false}
      actions={<button type="button" onClick={() => setAjout(!ajout)} aria-expanded={ajout} className={BTN}><Plus size={15} aria-hidden /> Ajouter à la main</button>}
    >
      {ajout && (
        <div className="px-5 py-4">
          <ChampsEdition id="nouvelle-unite" valeurs={{ site_id: principal?.id ?? "" }} champs={champsUnite(fiche, false)}
            enregistrer={(v) => ajouterUnite(fiche.cle, v)} libelleBouton="Ajouter l'unité"
            onSucces={(d) => {
              setAjout(false);
              if (d?.cle && d.cle !== fiche.cle) router.replace(`/espace/entreprises/${d.cle}`);
            }} />
        </div>
      )}
      {actives.length === 0 && !ajout ? (
        <div className="px-5 pb-5"><Vide icone="map-pin" titre="Aucune unité d'établissement.">Importez-les depuis la BCE ou ajoutez-les à la main.</Vide></div>
      ) : (
        actives.length > 0 && <Tableau fiche={fiche} unites={actives} />
      )}
      {arretees.length > 0 && (
        <details className="px-5 py-3">
          <summary className="flex cursor-pointer items-center gap-1 font-semibold">
            <ChevronDown size={16} aria-hidden /> {arretees.length} unité{arretees.length > 1 ? "s" : ""} arrêtée{arretees.length > 1 ? "s" : ""}
          </summary>
          <Tableau fiche={fiche} unites={arretees} />
        </details>
      )}
    </Panneau>
  );
}
