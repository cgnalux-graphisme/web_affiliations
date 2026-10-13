"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, EyeOff, Send, TriangleAlert } from "lucide-react";
import type { CarteDelegue } from "../../../../lib/delegues/donnees-serveur";
import { envoyerVersCgLink, ignorerEcart, reprendreEcart } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { BTN, Panneau } from "../../_partage/ui";

/** Écarts entre la carte et CG Link : reprendre la valeur de CG Link, l'ignorer, ou envoyer la carte à CG Link. */
export default function PanneauEcarts({ carte }: { carte: CarteDelegue }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [retour, setRetour] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  if (carte.ecarts.length === 0) return null;
  const id = carte.delegue.id;

  async function faire(cle: string, action: () => Promise<{ ok: true; message?: string } | { ok: false; erreur: string }>) {
    setEnCours(cle);
    setRetour(null);
    let r: { ok: true; message?: string } | { ok: false; erreur: string };
    try {
      r = await action();
    } catch {
      r = { ok: false, erreur: "La base n'a pas répondu. Réessayez." };
    }
    setEnCours(null);
    setRetour(r.ok ? { ton: "ok", texte: r.message ?? "C'est fait." } : { ton: "erreur", texte: r.erreur });
    if (r.ok) router.refresh();
  }

  return (
    <Panneau id="ecarts" titre="Écarts avec CG Link" sousTitre="Des informations diffèrent entre cette carte et CG Link."
      actions={carte.ecarts.some((e) => e.envoyable) ? (
        <button type="button" className={BTN} disabled={enCours !== null} onClick={() => faire("envoyer", () => envoyerVersCgLink(id))}>
          {enCours === "envoyer" ? <IconeChargement size={15} /> : <Send size={15} aria-hidden />} Envoyer ma carte à CG Link
        </button>
      ) : undefined}>
      <ul className="ecg-lignes">
        {carte.ecarts.map((e) => (
          <li key={e.champ} className="grid gap-2 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="grid gap-1">
              <b className="inline-flex items-center gap-2"><TriangleAlert size={16} aria-hidden /> {e.libelle}</b>
              <span className="text-sm">Ici : <b>{e.ici}</b></span>
              <span className="text-sm">CG Link : <b>{e.cglink}</b></span>
              {!e.envoyable && <span className="ecg-texte-doux text-sm">Adresse de connexion : elle ne se change que dans CG Link.</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN} disabled={enCours !== null} onClick={() => faire(`r-${e.champ}`, () => reprendreEcart(id, e.champ))}>
                {enCours === `r-${e.champ}` ? <IconeChargement size={15} /> : <ArrowLeft size={15} aria-hidden />} Reprendre
              </button>
              <button type="button" className={`${BTN} ecg-btn-fantome`} disabled={enCours !== null}
                onClick={() => faire(`i-${e.champ}`, () => ignorerEcart(id, e.champ, e.cglink === "vide" ? "" : e.cglink))}>
                {enCours === `i-${e.champ}` ? <IconeChargement size={15} /> : <EyeOff size={15} aria-hidden />} Ignorer
              </button>
            </div>
          </li>
        ))}
      </ul>
      {retour && <p role={retour.ton === "erreur" ? "alert" : "status"} className={`px-5 pb-3 ${retour.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}`}>{retour.texte}</p>}
    </Panneau>
  );
}
