"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { formatDateFr, isoToDateFr } from "../../../lib/dates";
import { formaterTelephone } from "../../../lib/telephone";
import AutocompleteRue from "./AutocompleteRue";
import { IconeChargement } from "../../Chargement";
import { AIDE, BTN_PRINCIPAL, CHAMP, LIBELLE } from "./ui";

export type DefChamp = {
  nom: string;
  libelle: string;
  /** « rue » : autocomplétion d'adresses belges ; une suggestion remplit aussi les champs de `cibles`. */
  type?: "texte" | "email" | "tel" | "zone" | "date" | "choix" | "rue";
  cibles?: { numero?: string; code_postal?: string; localite?: string; pays?: string };
  options?: { valeur: string; libelle: string }[];
  aide?: string;
  exemple?: string;
  largeur?: "plein" | "demi" | "tiers";
};

type Retour = { ok: true; message?: string; donnees?: { cle?: string } } | { ok: false; erreur: string };

const LARGEUR = { plein: "sm:col-span-6", demi: "sm:col-span-3", tiers: "sm:col-span-2" };

/** Formulaire de champs d'un panneau : enregistre via une action serveur puis rafraîchit la page. */
export default function ChampsEdition({
  id, champs, valeurs, enregistrer, libelleBouton = "Enregistrer", onSucces, toujoursActif = false,
}: {
  id: string;
  champs: DefChamp[];
  valeurs: Record<string, unknown>;
  enregistrer: (valeurs: Record<string, string>) => Promise<Retour>;
  libelleBouton?: string;
  onSucces?: (donnees?: { cle?: string }) => void;
  /** Bouton actif même sans modification (création avec des valeurs par défaut). */
  toujoursActif?: boolean;
}) {
  const router = useRouter();
  // Les valeurs peuvent venir d'une ligne complète (booléens, nombres) : seuls les champs listés sont repris, en texte.
  const initial: Record<string, string> = Object.fromEntries(
    champs.map((c) => {
      const v = valeurs[c.nom];
      if (v === null || v === undefined) return [c.nom, ""];
      return [c.nom, c.type === "date" && typeof v === "string" ? isoToDateFr(v) : String(v)];
    })
  );
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [enCours, setEnCours] = useState(false);
  const [retour, setRetour] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  const modifie = champs.some((c) => form[c.nom] !== initial[c.nom]);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setRetour(null);
    const r = await enregistrer(form);
    setEnCours(false);
    if (!r.ok) {
      setRetour({ ton: "erreur", texte: r.erreur });
      return;
    }
    setRetour({ ton: "ok", texte: r.message ?? "Enregistré." });
    onSucces?.(r.donnees);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="grid gap-3 sm:grid-cols-6">
      {champs.map((c) => {
        const idChamp = `${id}-${c.nom}`;
        const commun = {
          id: idChamp,
          name: c.nom,
          value: form[c.nom] ?? "",
          className: CHAMP,
          "aria-describedby": c.aide ? `${idChamp}-aide` : undefined,
        };
        return (
          <div key={c.nom} className={LARGEUR[c.largeur ?? "plein"]}>
            <label htmlFor={idChamp} className={LIBELLE}>{c.libelle}</label>
            {c.type === "zone" ? (
              <textarea {...commun} rows={3} onChange={(e) => setForm({ ...form, [c.nom]: e.target.value })} />
            ) : c.type === "rue" ? (
              <AutocompleteRue
                id={idChamp}
                value={form[c.nom] ?? ""}
                describedBy={c.aide ? `${idChamp}-aide` : undefined}
                // Suggestions belges seulement (pays vide ou « Belgique »), comme le formulaire d'affiliation.
                actif={!c.cibles?.pays || !form[c.cibles.pays] || /^belgique$/i.test(form[c.cibles.pays].trim())}
                onChange={(v) => setForm((f) => ({ ...f, [c.nom]: v }))}
                onSelect={(sug) =>
                  setForm((f) => ({
                    ...f,
                    [c.nom]: sug.street,
                    ...(c.cibles?.numero && sug.housenumber ? { [c.cibles.numero]: sug.housenumber } : {}),
                    ...(c.cibles?.code_postal && sug.postcode ? { [c.cibles.code_postal]: sug.postcode } : {}),
                    ...(c.cibles?.localite && sug.city ? { [c.cibles.localite]: sug.city } : {}),
                  }))
                }
              />
            ) : c.type === "choix" ? (
              <select {...commun} onChange={(e) => setForm({ ...form, [c.nom]: e.target.value })}>
                {c.options?.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
              </select>
            ) : (
              <input
                {...commun}
                type={c.type === "email" ? "email" : c.type === "tel" ? "tel" : "text"}
                inputMode={c.type === "date" ? "numeric" : c.type === "tel" ? "tel" : c.type === "email" ? "email" : undefined}
                autoComplete="off"
                spellCheck={c.type === "email" ? false : undefined}
                placeholder={c.exemple ? `${c.exemple}…` : c.type === "date" ? "jj/mm/aaaa" : undefined}
                onChange={(e) => setForm({ ...form, [c.nom]: c.type === "date" ? formatDateFr(e.target.value) : e.target.value })}
                // Téléphone mis au format +32 (0) 470 12 34 56 en quittant le champ.
                onBlur={c.type === "tel" ? (e) => setForm((f) => ({ ...f, [c.nom]: formaterTelephone(e.target.value) })) : undefined}
              />
            )}
            {c.aide && <p id={`${idChamp}-aide`} className={AIDE}>{c.aide}</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" disabled={enCours || (!modifie && !toujoursActif)} className={BTN_PRINCIPAL}>
          {enCours ? <IconeChargement size={15} /> : <Save size={15} aria-hidden />} {libelleBouton}
        </button>
        {retour && (
          <p role={retour.ton === "erreur" ? "alert" : "status"} className={retour.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>
            {retour.texte}
          </p>
        )}
      </div>
    </form>
  );
}
