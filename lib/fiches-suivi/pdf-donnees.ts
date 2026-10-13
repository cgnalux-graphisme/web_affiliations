import { isoToDateFr } from "../dates";
import { libelleDate, paragraphes } from "./regles";
import { QUESTIONS, libelleNature, libelleType, type FicheAffichee } from "./types";
import type { FichePdf } from "./FichePDF";

/**
 * Données d'une fiche pour le PDF (pur : aucune dépendance au navigateur ni au serveur).
 * photos : data URL déjà préparées, dans l'ordre de fiche.photos (null = photo illisible, ignorée).
 */
export function versFichePdf(f: FicheAffichee, photos: (string | null)[]): FichePdf {
  const usine = f.type === "usine";
  return {
    titre: f.titre?.trim() || "Fiche sans titre",
    type: libelleType(f.type),
    date: libelleDate(f.date_debut, f.date_fin),
    lieu: usine ? [f.entreprise, f.site].filter(Boolean).join(" · ") : f.secteur ?? "",
    libelleLieu: usine ? "Entreprise" : "Secteur",
    secteur: f.secteur,
    auteur: f.auteur,
    brouillon: f.statut !== "terminee",
    paragraphes: paragraphes(f.texte),
    reponses: QUESTIONS.flatMap((q) => (f[q.cle]?.trim() ? [{ libelle: q.libelle, reponse: f[q.cle]!.trim() }] : [])),
    documents: f.documents.map((d) => ({ nom: d.nom_origine, nature: libelleNature(d.nature, d.nature_autre) })),
    photos: f.photos.flatMap((p, i) => (photos[i] ? [{ src: photos[i]!, legende: p.legende }] : [])),
  };
}

export const aujourdhuiFr = () => isoToDateFr(new Date().toISOString().slice(0, 10));
