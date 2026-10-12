"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Trash2, TriangleAlert } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { ecartsOnss, onssDeCompany } from "../../../../lib/entreprises/regles";
import { ajouterOnss, enregistrerOnss, ignorerOnss, supprimerOnss } from "../actions";
import { Alerte, BTN, BTN_PETIT, CHAMP, Panneau } from "../../_partage/ui";
import ChampsEdition from "./ChampsEdition";

export default function PanneauOnss({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const [erreur, setErreur] = useState("");
  const ecarts = fiche.company && fiche.fiche ? ecartsOnss(onssDeCompany(fiche.company), fiche.onss, fiche.onssIgnores) : null;
  const sites = fiche.sites.map((s) => ({ valeur: s.id, libelle: s.nom }));

  async function faire(p: Promise<{ ok: true } | { ok: false; erreur: string }>) {
    setErreur("");
    const r = await p;
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <Panneau titre="Numéros ONSS" corps={false}>
      {ecarts && (ecarts.manquantsIci.length > 0 || ecarts.absentsCgLink.length > 0) && (
        <div className="px-5 pt-4">
          <Alerte ton="attention" icone={TriangleAlert} titre="Écarts avec CG Link">
            <ul className="mt-1 grid gap-2">
              {ecarts.manquantsIci.map((o) => (
                <li key={o.numero} className="flex flex-wrap items-center gap-2">
                  Dans CG Link mais pas ici : <b>{o.numero}</b>{o.libelle && ` (${o.libelle})`}
                  <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => faire(ajouterOnss(fiche.cle, { numero: o.numero, libelle: o.libelle ?? "" }))}>Reprendre</button>
                  <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => faire(ignorerOnss(fiche.fiche!.id, o.numero))}>
                    <EyeOff size={14} aria-hidden /> Ignorer
                  </button>
                </li>
              ))}
              {ecarts.absentsCgLink.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2">
                  Ici mais pas dans CG Link : <b>{o.numero}</b>
                  <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => faire(ignorerOnss(fiche.fiche!.id, o.numero))}>
                    <EyeOff size={14} aria-hidden /> Ignorer
                  </button>
                </li>
              ))}
            </ul>
          </Alerte>
        </div>
      )}
      {erreur && <p role="alert" className="ecg-erreur px-5">{erreur}</p>}
      <ul className="ecg-lignes">
        {fiche.onss.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
            <b className="tabular-nums">{o.numero}</b>
            <span className="min-w-0 flex-1">{o.libelle ?? ""}</span>
            <label className="sr-only" htmlFor={`onss-site-${o.id}`}>Site de l'ONSS {o.numero}</label>
            <select id={`onss-site-${o.id}`} value={o.site_id ?? ""} className={`${CHAMP} w-auto`}
              onChange={(e) => faire(enregistrerOnss(o.id, { site_id: e.target.value }))}>
              <option value="">Tous les sites</option>
              {sites.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
            </select>
            <button type="button" aria-label={`Supprimer l'ONSS ${o.numero}`} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`}
              onClick={() => faire(supprimerOnss(o.id))}>
              <Trash2 size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="ecg-panneau-pied block">
        <ChampsEdition
          id="nouvel-onss"
          valeurs={{}}
          champs={[
            { nom: "numero", libelle: "Ajouter un n° ONSS", exemple: "123456789", largeur: "tiers" },
            { nom: "libelle", libelle: "Libellé", exemple: "Site de Marche", largeur: "tiers" },
            { nom: "site_id", libelle: "Site", type: "choix", largeur: "tiers", options: [{ valeur: "", libelle: "Tous les sites" }, ...sites] },
          ]}
          enregistrer={(v) => ajouterOnss(fiche.cle, v)}
          libelleBouton="Ajouter"
          onSucces={(d) => d?.cle && d.cle !== fiche.cle && router.replace(`/espace/entreprises/${d.cle}`)}
        />
      </div>
    </Panneau>
  );
}
