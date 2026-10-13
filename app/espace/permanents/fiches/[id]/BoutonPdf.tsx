"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import type { FicheAffichee } from "../../../../../lib/fiches-suivi/types";
import { nomFichierPdf } from "../../../../../lib/fiches-suivi/regles";
import { aujourdhuiFr, versFichePdf } from "../../../../../lib/fiches-suivi/pdf-donnees";
import { photoPourPdf, telecharger } from "../../../../../lib/pdf/photo-pdf";
import { IconeChargement } from "../../../../Chargement";
import { BTN, BTN_PRINCIPAL } from "../../../_partage/ui";

/** Génère le PDF de la fiche dans le navigateur (photos réduites à 900 px), puis le télécharge. */
export default function BoutonPdf({ fiche, principal = false }: { fiche: FicheAffichee; principal?: boolean }) {
  const [progression, setProgression] = useState("");
  const [erreur, setErreur] = useState("");

  async function generer() {
    if (progression) return;
    setErreur("");
    try {
      const photos: (string | null)[] = [];
      for (const [i, p] of fiche.photos.entries()) {
        setProgression(`Photos ${i + 1}/${fiche.photos.length}…`);
        photos.push(p.url ? await photoPourPdf(p.url) : null);
      }
      setProgression("Mise en page…");
      const [{ pdf }, { default: FichePDF, enregistrerPolices }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../../../../../lib/fiches-suivi/FichePDF"),
      ]);
      enregistrerPolices(window.location.origin);
      const donnees = versFichePdf(fiche, photos);
      const blob = await pdf(<FichePDF f={donnees} genereLe={aujourdhuiFr()} origine={window.location.origin} />).toBlob();
      const lieu = fiche.type === "usine" ? fiche.entreprise ?? "" : fiche.secteur ?? "";
      telecharger(blob, nomFichierPdf(fiche.date_debut, lieu));
      if (photos.some((p) => !p)) setErreur("Une photo n'a pas pu être chargée : elle manque dans le PDF. Rechargez la page puis réessayez.");
    } catch (err) {
      console.error(err);
      setErreur("Le PDF n'a pas pu être généré. Rechargez la page puis réessayez.");
    } finally {
      setProgression("");
    }
  }

  return (
    <span className="inline-grid gap-1">
      <button type="button" onClick={generer} className={principal ? BTN_PRINCIPAL : BTN} aria-busy={Boolean(progression)}>
        {progression ? <IconeChargement size={18} /> : <FileDown size={18} aria-hidden />} {progression || "Générer le PDF"}
      </button>
      {erreur && <span role="alert" className="ecg-erreur text-sm">{erreur}</span>}
    </span>
  );
}
