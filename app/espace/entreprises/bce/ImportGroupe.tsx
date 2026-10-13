"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleAlert, Play, RotateCcw, ShieldAlert, Square, TriangleAlert } from "lucide-react";
import { aucunChangement } from "../../../../lib/bce/comparaison";
import { ERREUR_BCE_CAPTCHA, ERREUR_BCE_INJOIGNABLE } from "../../../../lib/bce/messages";
import { comparerAvecBce } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN, BTN_PRINCIPAL, Panneau, Statut } from "../../_partage/ui";

type Etat = { cle: string; nom: string; statut: "attente" | "encours" | "pause" | "ajour" | "changements" | "erreur"; detail?: string };
/** 3 s entre deux fiches ; si la BCE répond par sa vérification anti-robot, 30 s de pause puis un seul nouvel essai. */
const PAUSE_MS = 3000;
const PAUSE_CAPTCHA_MS = 30_000;
const attendre = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function ImportGroupe({ fiches, sansNumero }: { fiches: { cle: string; nom: string }[]; sansNumero: number }) {
  const [etats, setEtats] = useState<Etat[]>(fiches.map((f) => ({ ...f, statut: "attente" })));
  const [enCours, setEnCours] = useState(false);
  const arret = useRef(false);

  async function comparer(cle: string) {
    try {
      return await comparerAvecBce(cle);
    } catch {
      return { ok: false as const, erreur: ERREUR_BCE_INJOIGNABLE };
    }
  }

  /** Compare les fiches données (toutes, ou seulement celles en erreur). */
  async function lancer(indices: number[]) {
    setEnCours(true);
    arret.current = false;
    const maj = (i: number, etat: Partial<Etat>) => setEtats((e) => e.map((x, j) => (j === i ? { ...x, ...etat } : x)));
    for (let k = 0; k < indices.length && !arret.current; k++) {
      const i = indices[k];
      maj(i, { statut: "encours", detail: undefined });
      let r = await comparer(fiches[i].cle);
      if (!r.ok && r.erreur === ERREUR_BCE_CAPTCHA && !arret.current) {
        maj(i, { statut: "pause", detail: "La BCE demande une vérification anti-robot : nouvel essai dans 30 s…" });
        await attendre(PAUSE_CAPTCHA_MS);
        maj(i, { statut: "encours", detail: undefined });
        r = await comparer(fiches[i].cle);
      }
      if (!r.ok || !r.donnees) maj(i, { statut: "erreur", detail: r.ok ? "Réponse vide." : r.erreur });
      else if (aucunChangement(r.donnees.comparaison)) maj(i, { statut: "ajour", detail: undefined });
      else {
        const c = r.donnees.comparaison;
        maj(i, { statut: "changements", detail: `${c.identite.length + c.nouvelles.length + c.modifiees.length + c.absentes.length} changement(s) à valider` });
      }
      if (k < indices.length - 1) await attendre(PAUSE_MS);
    }
    setEnCours(false);
  }

  const enErreur = etats.flatMap((e, i) => (e.statut === "erreur" ? [i] : []));

  return (
    <>
      {sansNumero > 0 && <Alerte ton="info">{sansNumero} fiche{sansNumero > 1 ? "s n'ont" : " n'a"} pas de n° d'entreprise et ne {sansNumero > 1 ? "sont" : "est"} pas comparée{sansNumero > 1 ? "s" : ""}.</Alerte>}
      <div className="flex flex-wrap gap-2">
        {enCours ? (
          <button type="button" onClick={() => (arret.current = true)} className={BTN}><Square size={15} aria-hidden /> Arrêter après la fiche en cours</button>
        ) : (
          <>
            <button type="button" onClick={() => lancer(fiches.map((_, i) => i))} disabled={!fiches.length} className={BTN_PRINCIPAL}>
              <Play size={15} aria-hidden /> Comparer {fiches.length} fiche{fiches.length > 1 ? "s" : ""}
            </button>
            {enErreur.length > 0 && (
              <button type="button" onClick={() => lancer(enErreur)} className={BTN}>
                <RotateCcw size={15} aria-hidden /> Relancer les {enErreur.length} fiche{enErreur.length > 1 ? "s" : ""} en erreur
              </button>
            )}
          </>
        )}
      </div>
      <Panneau corps={false}>
        <ul className="ecg-lignes" aria-live="polite">
          {etats.map((e) => (
            <li key={e.cle} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 font-semibold">{e.nom}</span>
              {e.statut === "encours" && <span className="inline-flex items-center gap-1"><IconeChargement size={14} /> Lecture…</span>}
              {e.statut === "pause" && <Statut ton="attente" icone={ShieldAlert}>{e.detail}</Statut>}
              {e.statut === "ajour" && <Statut ton="ok" icone={CircleCheck}>À jour</Statut>}
              {e.statut === "changements" && (
                <>
                  <Statut ton="attente" icone={TriangleAlert}>{e.detail}</Statut>
                  <Link className="ecg-lien" href={`/espace/entreprises/${e.cle}/bce`}>Valider</Link>
                </>
              )}
              {e.statut === "erreur" && <Statut ton="erreur" icone={CircleAlert}>{e.detail}</Statut>}
            </li>
          ))}
        </ul>
      </Panneau>
    </>
  );
}
