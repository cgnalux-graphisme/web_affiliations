"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Trash2, UserRound } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { blocAdresse } from "../../../../lib/entreprises/regles";
import type { Site } from "../../../../lib/entreprises/types";
import { ajouterSite, enregistrerSite, supprimerSite } from "../actions";
import { BTN, BTN_PETIT, CHAMP, LIBELLE, Panneau, Statut } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import ChampsEdition from "./ChampsEdition";
import { ApercuBloc } from "./PanneauSiege";

const ORGANES: Record<string, string> = { ds: "DS", ce: "CE", cppt: "CPPT", cee: "CEE", instances_cg: "Instances CG", autre: "Autre" };

function libelleMandat(m: { organe: string; qualite: string | null; libelle: string | null; fonction: string | null }) {
  const q = m.qualite === "effectif" ? " eff." : m.qualite === "suppleant" ? " supp." : "";
  const base = m.organe === "autre" || m.organe === "instances_cg" ? m.libelle ?? ORGANES[m.organe] : `${ORGANES[m.organe]}${q}`;
  return m.fonction ? `${base} (${m.fonction})` : base;
}

function CarteSite({ fiche, site, superAdmin }: { fiche: Fiche; site: Site; superAdmin: boolean }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const unites = fiche.unites.filter((u) => u.site_id === site.id);
  const onss = fiche.onss.filter((o) => o.site_id === site.id);
  const delegues = fiche.delegues
    .map((d) => ({ ...d, mandats: d.mandats.filter((m) => m.site_id === site.id) }))
    .filter((d) => d.mandats.length);
  const bloc = fiche.fiche ? blocAdresse(fiche.fiche, fiche.company?.name ?? null, site, fiche.unites) : null;

  async function supprimer() {
    setEnCours(true);
    const r = await supprimerSite(site.id);
    setEnCours(false);
    setConfirmer(false);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <article className="rounded-xl border bg-white p-4" aria-labelledby={`site-${site.id}`}>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <MapPin size={18} aria-hidden />
        <h3 id={`site-${site.id}`} className="text-lg font-bold">{site.nom}</h3>
        {site.principal && <Statut ton="info" icone={MapPin}>Site principal</Statut>}
        <span className="ecg-texte-doux text-sm">
          {unites.length} unité{unites.length > 1 ? "s" : ""} · {onss.length} ONSS · {delegues.length} délégué{delegues.length > 1 ? "s" : ""}
        </span>
        {!site.principal && (
          confirmer ? (
            <span role="alertdialog" aria-label={`Supprimer le site ${site.nom} ?`} className="ml-auto flex items-center gap-2">
              <b className="text-sm">Supprimer ? Ses unités et ONSS reviennent au site principal.</b>
              <button type="button" autoFocus onClick={supprimer} disabled={enCours} className={`${BTN} ${BTN_PETIT} ecg-btn-danger`}>
                {enCours && <IconeChargement size={14} />} Oui
              </button>
              <button type="button" onClick={() => setConfirmer(false)} className={`${BTN} ${BTN_PETIT}`}>Non</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmer(true)} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger ml-auto`}
              aria-label={`Supprimer le site ${site.nom}`}>
              <Trash2 size={16} aria-hidden />
            </button>
          )
        )}
      </header>
      {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <ChampsEdition
          id={`site-${site.id}`}
          valeurs={site}
          champs={[
            { nom: "nom", libelle: "Nom du site (UTE)", largeur: "demi" },
            {
              nom: "unite_postale_id", libelle: "Adresse postale", type: "choix", largeur: "demi",
              options: [{ valeur: "", libelle: "Siège social" }, ...fiche.unites.filter((u) => u.statut === "actif" && u.suivie).map((u) => ({
                valeur: u.id, libelle: [u.rue, u.numero, u.localite].filter(Boolean).join(" "),
              }))],
            },
            { nom: "ref_nom", libelle: "Personne de référence du site", aide: "Vide : celle de l'entreprise.", largeur: "demi" },
            { nom: "ref_fonction", libelle: "Fonction", largeur: "demi" },
            { nom: "ref_email", libelle: "E-mail", type: "email", largeur: "demi" },
            { nom: "ref_telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
          ]}
          enregistrer={(v) => enregistrerSite(site.id, v)}
        />
        {bloc && <ApercuBloc {...bloc} />}
      </div>

      <div className="mt-4">
        <h4 className="ecg-libelle">Délégués et mandats en cours</h4>
        {delegues.length === 0 ? (
          <p className="ecg-texte-doux text-sm">Aucun délégué rattaché à ce site.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {delegues.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <UserRound size={15} aria-hidden />
                <b>{[d.prenom, d.nom].filter(Boolean).join(" ")}</b>
                <span>{d.mandats.map(libelleMandat).join(" · ")}</span>
                {superAdmin && <a href={`/espace/delegues/${d.id}`} className="ecg-lien">Gérer</a>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export default function PanneauSites({ fiche, superAdmin }: { fiche: Fiche; superAdmin: boolean }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function ajouter() {
    setEnCours(true);
    setErreur("");
    const r = await ajouterSite(fiche.cle, nom);
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    setNom("");
    if (r.donnees?.cle && r.donnees.cle !== fiche.cle) router.replace(`/espace/entreprises/${r.donnees.cle}`);
    else router.refresh();
  }

  return (
    <Panneau titre="Sites d'exploitation (UTE)" sousTitre="Chaque unité d'établissement appartient à un site ; les mandats se rattachent au site.">
      <div className="grid gap-4">
        {fiche.sites.length === 0 && <p className="ecg-texte-doux">Le site principal sera créé à la première modification.</p>}
        {fiche.sites.map((s) => <CarteSite key={s.id} fiche={fiche} site={s} superAdmin={superAdmin} />)}
        {fiche.delegues.some((d) => d.mandats.some((m) => !m.site_id)) && (
          <p className="ecg-texte-doux text-sm">Certains mandats ne sont rattachés à aucun site.</p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="nouveau-site" className={LIBELLE}>Ajouter un site</label>
            <input id="nouveau-site" value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} placeholder="Usine de Marche…" autoComplete="off" />
          </div>
          <button type="button" onClick={ajouter} disabled={!nom.trim() || enCours} className={BTN}>
            {enCours ? <IconeChargement size={15} /> : <Plus size={15} aria-hidden />} Ajouter
          </button>
        </div>
        {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
      </div>
    </Panneau>
  );
}
