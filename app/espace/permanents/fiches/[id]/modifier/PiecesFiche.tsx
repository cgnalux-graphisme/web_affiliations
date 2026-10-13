"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, FilePlus2, FileText, ImagePlus, Star, Trash2 } from "lucide-react";
import { getSupabase } from "../../../../../../lib/supabase";
import { preparerPhoto } from "../../../../../../lib/photos";
import { imageAcceptee, MESSAGE_IMAGE_REFUSEE, TYPES_IMAGE } from "../../../../../../lib/image-deposee";
import { documentAccepte } from "../../../../../../lib/fiches-suivi/regles";
import {
  DOCUMENTS_MAX, MESSAGE_DOCUMENT_REFUSE, NATURES, PHOTOS_MAX, TYPES_DOCUMENT, type FicheAffichee,
} from "../../../../../../lib/fiches-suivi/types";
import { enregistrerFichier, modifierFichier, ordonnerPhotos, preparerEnvoi, supprimerFichier } from "../../../actions";
import { IconeChargement } from "../../../../../Chargement";
import { BTN, BTN_PETIT, CHAMP, LIBELLE, Panneau } from "../../../../_partage/ui";

const BUCKET = "fiches-suivi";
const taille = (o: number | null) => (o == null ? "" : o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`);

/**
 * Documents (avec leur nature) et photos d'une fiche. Chaque fichier part directement vers le bucket privé par un lien
 * signé que le serveur crée après vérification ; la photo est d'abord réduite (2000 px, JPEG). Tout est enregistré
 * immédiatement.
 */
export default function PiecesFiche({ fiche }: { fiche: FicheAffichee }) {
  const router = useRouter();
  const docRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [nature, setNature] = useState<string>("courrier_envoye");
  const [progression, setProgression] = useState("");
  const [message, setMessage] = useState<{ ton: "erreur" | "ok"; texte: string } | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);

  async function envoyer(genre: "document" | "photo", fichiers: File[]) {
    if (!fichiers.length || progression) return;
    const refus: string[] = [];
    let faits = 0;
    setMessage(null);
    for (const [i, file] of fichiers.entries()) {
      setProgression(`Envoi ${i + 1}/${fichiers.length} : ${file.name}…`);
      const accepte = genre === "photo" ? imageAcceptee(file) : documentAccepte(file);
      if (!accepte) {
        refus.push(file.name);
        continue;
      }
      try {
        const corps: Blob = genre === "photo" ? await preparerPhoto(file) : file;
        const type = genre === "photo" ? "image/jpeg" : file.type;
        const p = await preparerEnvoi(fiche.id, { genre, nom: file.name, type, taille: corps.size });
        if (!p.ok) {
          refus.push(`${file.name} (${p.erreur})`);
          continue;
        }
        const { error } = await getSupabase().storage.from(BUCKET).uploadToSignedUrl(p.donnees!.chemin, p.donnees!.jeton, corps, { contentType: type });
        if (error) {
          refus.push(`${file.name} (envoi interrompu)`);
          continue;
        }
        const r = await enregistrerFichier(fiche.id, { chemin: p.donnees!.chemin, genre, nom: file.name, type, taille: corps.size, nature });
        if (!r.ok) refus.push(`${file.name} (${r.erreur})`);
        else faits++;
      } catch {
        refus.push(`${file.name} (fichier illisible)`);
      }
    }
    setProgression("");
    if (refus.length) {
      setMessage({ ton: "erreur", texte: `Non ajouté${refus.length > 1 ? "s" : ""} : ${refus.join(", ")}. Formats acceptés : ${genre === "photo" ? MESSAGE_IMAGE_REFUSEE : MESSAGE_DOCUMENT_REFUSE}.` });
    } else if (faits) {
      setMessage({ ton: "ok", texte: `${faits} ${genre === "photo" ? "photo" : "document"}${faits > 1 ? "s ajoutés" : " ajouté"}.` });
    }
    router.refresh();
  }

  async function agir(cle: string, action: () => Promise<{ ok: boolean; erreur?: string }>) {
    setOccupe(cle);
    const r = await action().catch(() => ({ ok: false, erreur: "La base n'a pas répondu. Réessayez." }));
    setOccupe(null);
    if (!r.ok) setMessage({ ton: "erreur", texte: r.erreur ?? "Action impossible." });
    router.refresh();
  }

  function monter(index: number) {
    const ids = fiche.photos.map((p) => p.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    agir(`ordre-${index}`, () => ordonnerPhotos(fiche.id, ids));
  }

  const choisir = (input: HTMLInputElement | null, genre: "document" | "photo") => {
    if (!input?.files) return;
    // Copier la liste AVANT de vider le champ (Chrome et Edge vident aussi la FileList).
    const fichiers = Array.from(input.files);
    input.value = "";
    envoyer(genre, fichiers);
  };

  return (
    <div className="grid gap-6">
      <Panneau titre={`Documents joints (${fiche.documents.length})`}
        sousTitre="Courriers, PV, préavis, accords… Ils restent internes ; le PDF de la fiche en donne la liste.">
        <div className="grid gap-4">
          {fiche.documents.length > 0 && (
            <ul className="ecg-lignes">
              {fiche.documents.map((d) => (
                <li key={d.id} className="grid gap-2 py-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText size={18} aria-hidden className="flex-none" />
                    {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="ecg-lien truncate">{d.nom_origine}</a> : <span className="truncate">{d.nom_origine}</span>}
                    <span className="ecg-texte-doux flex-none text-sm">{taille(d.taille)}</span>
                  </span>
                  <div className="grid gap-1">
                    <label htmlFor={`nature-${d.id}`} className="sr-only">Nature de {d.nom_origine}</label>
                    <select id={`nature-${d.id}`} className={CHAMP} defaultValue={d.nature ?? "autre"} disabled={occupe !== null}
                      onChange={(e) => agir(`n-${d.id}`, () => modifierFichier(d.id, { nature: e.target.value }))}>
                      {NATURES.map((n) => <option key={n.code} value={n.code}>{n.libelle}</option>)}
                    </select>
                    {d.nature === "autre" && (
                      <input aria-label={`Précisez la nature de ${d.nom_origine}`} className={CHAMP} defaultValue={d.nature_autre ?? ""}
                        placeholder="Précisez…" maxLength={120}
                        onBlur={(e) => e.target.value !== (d.nature_autre ?? "") && agir(`a-${d.id}`, () => modifierFichier(d.id, { nature_autre: e.target.value }))} />
                    )}
                  </div>
                  <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} disabled={occupe !== null}
                    onClick={() => agir(`s-${d.id}`, () => supprimerFichier(d.id))}>
                    {occupe === `s-${d.id}` ? <IconeChargement size={15} /> : <Trash2 size={15} aria-hidden />} Retirer
                    <span className="sr-only"> {d.nom_origine}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fiche.documents.length < DOCUMENTS_MAX && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="nature-nouveau" className={LIBELLE}>Nature du document</label>
                <select id="nature-nouveau" className={`${CHAMP} w-auto`} value={nature} onChange={(e) => setNature(e.target.value)}>
                  {NATURES.map((n) => <option key={n.code} value={n.code}>{n.libelle}</option>)}
                </select>
              </div>
              <input ref={docRef} type="file" multiple accept={TYPES_DOCUMENT.join(",")} className="sr-only" id="ajout-document"
                onChange={(e) => choisir(e.currentTarget, "document")} />
              <button type="button" className={BTN} disabled={Boolean(progression)} onClick={() => docRef.current?.click()}>
                <FilePlus2 size={16} aria-hidden /> Ajouter des documents
              </button>
            </div>
          )}
        </div>
      </Panneau>

      <Panneau titre={`Photos (${fiche.photos.length})`} sousTitre="La première est la photo principale du PDF. Réduites automatiquement avant l'envoi.">
        <div className="grid gap-4">
          {fiche.photos.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fiche.photos.map((p, i) => (
                <li key={p.id} className="grid gap-2 rounded-xl border border-[var(--ecg-trait)] p-2">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-[var(--ecg-fond)]">
                    {p.url && (
                      // Lien signé temporaire du bucket privé : pas de next/image.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt={p.legende ?? `Photo ${i + 1}`} className="h-full w-full object-cover" />
                    )}
                    {i === 0 && (
                      <span className="ecg-statut ecg-statut-info absolute left-2 top-2"><Star size={14} aria-hidden /> Principale</span>
                    )}
                  </div>
                  <label htmlFor={`legende-${p.id}`} className="sr-only">Légende de la photo {i + 1}</label>
                  <input id={`legende-${p.id}`} className={CHAMP} defaultValue={p.legende ?? ""} placeholder="Légende…" maxLength={300}
                    onBlur={(e) => e.target.value !== (p.legende ?? "") && agir(`l-${p.id}`, () => modifierFichier(p.id, { legende: e.target.value }))} />
                  <div className="flex flex-wrap gap-2">
                    {i > 0 && (
                      <button type="button" className={`${BTN} ${BTN_PETIT}`} disabled={occupe !== null} onClick={() => monter(i)}>
                        <ArrowUp size={15} aria-hidden /> {i === 1 ? "Mettre en principale" : "Avancer"}
                      </button>
                    )}
                    <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} disabled={occupe !== null}
                      onClick={() => agir(`s-${p.id}`, () => supprimerFichier(p.id))}>
                      {occupe === `s-${p.id}` ? <IconeChargement size={15} /> : <Trash2 size={15} aria-hidden />} Retirer
                      <span className="sr-only"> la photo {i + 1}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {fiche.photos.length < PHOTOS_MAX && (
            <div>
              <input ref={photoRef} type="file" multiple accept={TYPES_IMAGE.join(",")} className="sr-only" id="ajout-photo"
                onChange={(e) => choisir(e.currentTarget, "photo")} />
              <button type="button" className={BTN} disabled={Boolean(progression)} onClick={() => photoRef.current?.click()}>
                <ImagePlus size={16} aria-hidden /> Ajouter des photos
              </button>
            </div>
          )}
        </div>
      </Panneau>

      {progression && <p role="status" className="ecg-texte-doux inline-flex items-center gap-2"><IconeChargement size={16} /> {progression}</p>}
      {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}
    </div>
  );
}
