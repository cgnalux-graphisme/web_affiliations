import { LIBELLES_ORGANES, mandatEnCours } from "./mandats";
import type { Delegue, DelegueCgLink, Mandat } from "./types";

/**
 * Passage Espace CG → CG Link (`companies.delegates`, jsonb). Pur.
 * Jamais d'e-mail écrit : CG Link retrouve le délégué par cet e-mail à la connexion.
 */

export type ChampsCgLink = { name: string; phone: string; mandateDs: string; mandateCe: string; mandateCppt: string; mandateOther: string };

const ORGANES_CGLINK = ["ds", "ce", "cppt"] as const;

export function versCgLink(
  d: Pick<Delegue, "prenom" | "nom" | "telephone">,
  mandats: Pick<Mandat, "organe" | "qualite" | "libelle" | "fonction" | "fin">[],
  aujourdhui: string
): ChampsCgLink {
  const enCours = mandats.filter((m) => mandatEnCours(m, aujourdhui));
  const qualite = (o: string) => {
    const ms = enCours.filter((m) => m.organe === o);
    if (ms.some((m) => m.qualite === "effectif")) return "Effectif";
    if (ms.some((m) => m.qualite === "suppleant")) return "Suppléant";
    return "Pas de mandat";
  };
  const autres = enCours.flatMap((m) => {
    if ((ORGANES_CGLINK as readonly string[]).includes(m.organe)) return m.fonction ? [`${m.fonction} (${LIBELLES_ORGANES[m.organe]})`] : [];
    const q = m.qualite === "effectif" ? " effectif" : m.qualite === "suppleant" ? " suppléant" : "";
    const base = m.organe === "cee" ? `CEE${q}` : m.organe === "instances_cg" ? `Instances CG : ${m.libelle ?? ""}` : m.libelle ?? "Autre";
    return [m.fonction ? `${base} (${m.fonction})` : base];
  });
  // Les fonctions DS / CE / CPPT après les autres mandats.
  autres.sort((a, b) => Number(/\((DS|CE|CPPT)\)$/.test(a)) - Number(/\((DS|CE|CPPT)\)$/.test(b)));
  return {
    name: [d.prenom, d.nom].filter(Boolean).join(" "),
    phone: d.telephone ?? "",
    mandateDs: qualite("ds"),
    mandateCe: qualite("ce"),
    mandateCppt: qualite("cppt"),
    mandateOther: autres.join(" ; "),
  };
}

export function fusionnerEntree(delegues: DelegueCgLink[], id: string, maj: Partial<DelegueCgLink>): DelegueCgLink[] | null {
  if (!delegues.some((d) => d.id === id)) return null;
  const { email: _jamais, id: _id, ...sansEmail } = maj;
  return delegues.map((d) => (d.id === id ? { ...d, ...sansEmail } : d));
}

export function deplacerEntree(source: DelegueCgLink[], cible: DelegueCgLink[], id: string) {
  const entree = source.find((d) => d.id === id);
  if (!entree) return null;
  return { source: source.filter((d) => d.id !== id), cible: [...cible.filter((d) => d.id !== id), entree] };
}

export function lireReponseFonction(statut: number, corps: unknown): { ok: true; userId: string | null } | { ok: false; erreur: string } {
  const c = (corps ?? {}) as { success?: boolean; userId?: string; error?: string };
  if (statut >= 200 && statut < 300 && !c.error) return { ok: true, userId: c.userId ?? null };
  if (statut === 401) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous puis réessayez." };
  if (typeof c.error === "string" && c.error) return { ok: false, erreur: `CG Link a refusé : ${c.error}` };
  return { ok: false, erreur: "CG Link n'a pas répondu correctement. Réessayez dans un instant." };
}

/** Champs envoyés à CG Link : un téléphone vide ici n'efface jamais celui que le délégué a saisi dans CG Link. */
export function champsAEnvoyer(c: ChampsCgLink): Partial<ChampsCgLink> {
  const { phone, ...reste } = c;
  return phone ? { ...reste, phone } : reste;
}
