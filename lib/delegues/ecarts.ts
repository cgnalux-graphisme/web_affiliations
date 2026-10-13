import { isoToDateFr } from "../dates";
import { formaterTelephone } from "../telephone";
import { versCgLink } from "./cglink";
import { classerAutre, mandatEnCours } from "./mandats";
import { decouperNom } from "./noms";
import type { Delegue, DelegueCgLink, Mandat, Organe, Qualite } from "./types";

/** Écarts entre la carte (Espace CG) et l'entrée CG Link, et ce que « Reprendre » (CG Link → Espace) fait. Pur. */

export type ChampEcart = "nom" | "email" | "telephone" | "ds" | "ce" | "cppt" | "autre";
export type Ecart = { champ: ChampEcart; libelle: string; ici: string; cglink: string; envoyable: boolean };

const LIBELLES: Record<ChampEcart, string> = {
  nom: "Nom", email: "E-mail (adresse de connexion)", telephone: "Téléphone", ds: "Mandat DS", ce: "Mandat CE", cppt: "Mandat CPPT", autre: "Autres mandats",
};
const espaces = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const qualiteCg = (s: string | null | undefined) => {
  const t = espaces(s).toLowerCase();
  return t === "effectif" ? "Effectif" : t.startsWith("suppl") ? "Suppléant" : "Pas de mandat";
};

export function calculerEcarts(d: Delegue, mandats: Mandat[], entree: DelegueCgLink, ignores: { champ: string; valeur: string }[], aujourdhui: string): Ecart[] {
  const ici = versCgLink(d, mandats, aujourdhui);
  const comparaisons: [ChampEcart, string, string, boolean, (a: string, b: string) => boolean][] = [
    ["nom", ici.name, espaces(entree.name), true, (a, b) => a.toLowerCase() === b.toLowerCase()],
    ["email", espaces(d.email), espaces(entree.email), false, (a, b) => a.toLowerCase() === b.toLowerCase()],
    ["telephone", ici.phone, espaces(entree.phone), true, (a, b) => formaterTelephone(a).replace(/\D/g, "") === formaterTelephone(b).replace(/\D/g, "")],
    ["ds", ici.mandateDs, qualiteCg(entree.mandateDs), true, (a, b) => a === b],
    ["ce", ici.mandateCe, qualiteCg(entree.mandateCe), true, (a, b) => a === b],
    ["cppt", ici.mandateCppt, qualiteCg(entree.mandateCppt), true, (a, b) => a === b],
    ["autre", ici.mandateOther, espaces(entree.mandateOther), true, (a, b) => a === b],
  ];
  return comparaisons
    .filter(([champ, a, b, , egal]) => !egal(a, b) && !ignores.some((i) => i.champ === champ && i.valeur === b))
    .map(([champ, a, b, envoyable]) => ({ champ, libelle: LIBELLES[champ], ici: a || "vide", cglink: b || "vide", envoyable }));
}

export type OperationReprise =
  | { type: "maj_delegue"; valeurs: Partial<Delegue> }
  | { type: "terminer"; ids: string[]; fin: string }
  | { type: "qualite"; id: string; qualite: Qualite }
  | { type: "fonction"; id: string; fonction: string }
  | { type: "ajouter"; mandat: { organe: Organe; qualite: Qualite | null; libelle: string | null; fonction: string | null; debut: string; a_verifier: string } }
  | { type: "erreur"; erreur: string };

export function planReprise(champ: ChampEcart, d: Delegue, mandats: Mandat[], entree: DelegueCgLink, aujourdhui: string): OperationReprise[] {
  const note = `Repris de CG Link le ${isoToDateFr(aujourdhui)}`;
  if (champ === "nom") {
    const n = decouperNom(entree.name);
    return [{ type: "maj_delegue", valeurs: { prenom: n.prenom, nom: n.nom } }];
  }
  if (champ === "email") return [{ type: "maj_delegue", valeurs: { email: espaces(entree.email).toLowerCase() || null } }];
  if (champ === "telephone") return [{ type: "maj_delegue", valeurs: { telephone: formaterTelephone(entree.phone) || null } }];
  if (champ === "autre") {
    // Le texte CG Link est une liste « a ; b ; c » : seuls les éléments absents d'ici sont repris, un par un.
    const morceaux = (t: string | null | undefined) => espaces(t).split(/\s*;\s*/).filter(Boolean);
    const ici = new Set(morceaux(versCgLink(d, mandats, aujourdhui).mandateOther).map((x) => x.toLowerCase()));
    const ops: OperationReprise[] = [];
    let rejetes = 0;
    for (const texte of morceaux(entree.mandateOther).filter((x) => !ici.has(x.toLowerCase()))) {
      const fonction = texte.match(/^(.+?)\s*\((DS|CE|CPPT)\)$/i);
      if (fonction) {
        const organe = fonction[2].toLowerCase() as Organe;
        const cible = mandats.find((m) => m.organe === organe && mandatEnCours(m, aujourdhui));
        if (cible) ops.push({ type: "fonction", id: cible.id, fonction: fonction[1].trim() });
        else rejetes++;
        continue;
      }
      const c = classerAutre(texte);
      if (c.rejete) {
        rejetes++;
        continue;
      }
      ops.push({ type: "ajouter", mandat: { organe: c.mandat.organe, qualite: c.mandat.qualite, libelle: c.mandat.libelle, fonction: c.mandat.fonction, debut: aujourdhui, a_verifier: note } });
    }
    if (!ops.length && rejetes) return [{ type: "erreur", erreur: "Le texte de CG Link n'est pas reconnu comme un mandat : ajoutez-le à la main." }];
    return ops;
  }
  const enCours = mandats.filter((m) => m.organe === champ && mandatEnCours(m, aujourdhui));
  const cible = qualiteCg(champ === "ds" ? entree.mandateDs : champ === "ce" ? entree.mandateCe : entree.mandateCppt);
  if (cible === "Pas de mandat") return enCours.length ? [{ type: "terminer", ids: enCours.map((m) => m.id), fin: aujourdhui }] : [];
  const qualite: Qualite = cible === "Effectif" ? "effectif" : "suppleant";
  if (enCours.length) return [{ type: "qualite", id: enCours[0].id, qualite }];
  return [{ type: "ajouter", mandat: { organe: champ, qualite, libelle: null, fonction: null, debut: aujourdhui, a_verifier: note } }];
}
