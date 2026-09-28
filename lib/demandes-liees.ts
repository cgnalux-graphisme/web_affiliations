import type { TypeDemande } from "./demandes";

/**
 * Demandes d'une même personne dans les autres onglets (ex. un parcours de transfert, éclaté en
 * affiliation + C1 + C3.2 sans identifiant commun). Rapprochement par déduction, jamais certain :
 * même NISS (chiffres seulement), sinon même e-mail. Les homonymes (nom seul) ne sont pas rapprochés.
 * Fonction pure : aucune lecture en base ici.
 */

export type Candidate = {
  type: TypeDemande;
  id: string;
  created_at: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  niss: string | null;
};

export type DemandeLiee = {
  type: TypeDemande;
  id: string;
  created_at: string;
  nom: string | null;
  prenom: string | null;
  raison: "niss" | "email";
  /** Reçue à moins de 24 h d'écart : probablement le même dossier (parcours). */
  memeDossier: boolean;
};

/** Écart maximal pour considérer deux demandes comme un même dossier. */
export const ECART_DOSSIER_MS = 24 * 60 * 60 * 1000;

export function nissChiffres(niss: string | null | undefined): string | null {
  const c = (niss ?? "").replace(/\D/g, "");
  return c.length === 11 ? c : null;
}

export function emailNormalise(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e.includes("@") ? e : null;
}

export function demandesLiees(reference: Candidate, candidates: Candidate[]): DemandeLiee[] {
  const niss = nissChiffres(reference.niss);
  const email = emailNormalise(reference.email);
  if (!niss && !email) return [];
  const t0 = new Date(reference.created_at).getTime();

  return candidates
    .filter((c) => !(c.type === reference.type && c.id === reference.id))
    .flatMap((c): DemandeLiee[] => {
      const raison = niss && nissChiffres(c.niss) === niss ? "niss" : email && emailNormalise(c.email) === email ? "email" : null;
      if (!raison) return [];
      const ecart = Math.abs(new Date(c.created_at).getTime() - t0);
      return [
        {
          type: c.type,
          id: c.id,
          created_at: c.created_at,
          nom: c.nom,
          prenom: c.prenom,
          raison,
          memeDossier: Number.isFinite(ecart) && ecart <= ECART_DOSSIER_MS,
        },
      ];
    })
    .sort((a, b) => Number(b.memeDossier) - Number(a.memeDossier) || b.created_at.localeCompare(a.created_at));
}
