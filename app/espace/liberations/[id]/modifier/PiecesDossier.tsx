"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FileText, Trash2 } from "lucide-react";
import { getSupabase } from "../../../../../lib/supabase";
import { fichierAccepte } from "../../../../../lib/liberations/regles";
import { FICHIERS_MAX, MESSAGE_FICHIER_REFUSE, TYPES_FICHIER } from "../../../../../lib/liberations/types";
import type { DossierAffiche } from "../../../../../lib/liberations/donnees-serveur";
import { enregistrerFichier, preparerEnvoi, supprimerFichier } from "../../actions";
import { IconeChargement } from "../../../../Chargement";
import { BTN, BTN_PETIT, Panneau } from "../../../_partage/ui";

const BUCKET = "liberations";
const taille = (o: number | null) => (o == null ? "" : o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`);

/**
 * Pièces jointes du dossier (ex. invitation du fédéral) : PDF ou image. Chaque fichier part directement vers le bucket
 * privé par un lien signé que le serveur crée après vérification ; tout est enregistré immédiatement.
 */
export default function PiecesDossier({ dossier }: { dossier: DossierAffiche }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [progression, setProgression] = useState("");
  const [message, setMessage] = useState<{ ton: "erreur" | "ok"; texte: string } | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);

  async function envoyer(fichiers: File[]) {
    if (!fichiers.length || progression) return;
    const refus: string[] = [];
    let faits = 0;
    setMessage(null);
    for (const [i, file] of fichiers.entries()) {
      setProgression(`Envoi ${i + 1}/${fichiers.length} : ${file.name}…`);
      if (!fichierAccepte(file)) {
        refus.push(file.name);
        continue;
      }
      try {
        const p = await preparerEnvoi(dossier.id, { nom: file.name, type: file.type, taille: file.size });
        if (!p.ok) {
          refus.push(`${file.name} (${p.erreur})`);
          continue;
        }
        const { error } = await getSupabase().storage.from(BUCKET).uploadToSignedUrl(p.donnees!.chemin, p.donnees!.jeton, file, { contentType: file.type });
        if (error) {
          refus.push(`${file.name} (envoi interrompu)`);
          continue;
        }
        const r = await enregistrerFichier(dossier.id, { chemin: p.donnees!.chemin, nom: file.name, type: file.type, taille: file.size });
        if (!r.ok) refus.push(`${file.name} (${r.erreur})`);
        else faits++;
      } catch {
        refus.push(`${file.name} (fichier illisible)`);
      }
    }
    setProgression("");
    if (refus.length) setMessage({ ton: "erreur", texte: `Non ajouté${refus.length > 1 ? "s" : ""} : ${refus.join(", ")}. Formats acceptés : ${MESSAGE_FICHIER_REFUSE}.` });
    else if (faits) setMessage({ ton: "ok", texte: `${faits} pièce${faits > 1 ? "s ajoutées" : " ajoutée"}.` });
    router.refresh();
  }

  async function retirer(id: string) {
    setOccupe(id);
    const r = await supprimerFichier(id).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setOccupe(null);
    if (!r.ok) setMessage({ ton: "erreur", texte: r.erreur });
    router.refresh();
  }

  return (
    <Panneau titre={`Pièces jointes (${dossier.fichiers.length})`} sousTitre="Par exemple l'invitation du fédéral. PDF ou image, 25 Mo maximum.">
      <div className="grid gap-3">
        {dossier.fichiers.length > 0 && (
          <ul className="ecg-lignes">
            {dossier.fichiers.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={18} aria-hidden className="flex-none" />
                  {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="ecg-lien truncate">{f.nom_origine}</a> : <span className="truncate">{f.nom_origine}</span>}
                  <span className="ecg-texte-doux flex-none text-sm">{taille(f.taille)}</span>
                </span>
                <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} disabled={occupe !== null} onClick={() => retirer(f.id)}>
                  {occupe === f.id ? <IconeChargement size={15} /> : <Trash2 size={15} aria-hidden />} Retirer<span className="sr-only"> {f.nom_origine}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {dossier.fichiers.length < FICHIERS_MAX && (
          <div>
            <input ref={ref} type="file" multiple accept={TYPES_FICHIER.join(",")} className="sr-only" id="ajout-piece"
              onChange={(e) => {
                // Copier la liste AVANT de vider le champ (Chrome et Edge vident aussi la FileList).
                const fichiers = Array.from(e.currentTarget.files ?? []);
                e.currentTarget.value = "";
                envoyer(fichiers);
              }} />
            <button type="button" className={BTN} disabled={Boolean(progression)} onClick={() => ref.current?.click()}>
              <FilePlus2 size={16} aria-hidden /> Ajouter des pièces
            </button>
          </div>
        )}
        {progression && <p role="status" className="ecg-texte-doux inline-flex items-center gap-2"><IconeChargement size={16} /> {progression}</p>}
        {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}
      </div>
    </Panneau>
  );
}
