"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Play, RotateCcw, Save, ShieldAlert, Square, TriangleAlert } from "lucide-react";
import { aucunChangement, choixParDefaut, type ChoixBce } from "../../../../lib/bce/comparaison";
import { ERREUR_BCE_CAPTCHA, ERREUR_BCE_INJOIGNABLE } from "../../../../lib/bce/messages";
import { appliquerBce, comparerAvecBce } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN, BTN_PRINCIPAL, Panneau, Statut } from "../../_partage/ui";

type Etat = {
  cle: string;
  nom: string;
  statut: "attente" | "encours" | "pause" | "ajour" | "changements" | "enregistre" | "erreur";
  detail?: string;
  /** Changements trouvés par la comparaison (tout coché), pour « Enregistrer tous les changements ». */
  choix?: ChoixBce;
};

/** 3 s entre deux fiches ; si la BCE répond par sa vérification anti-robot, 30 s de pause puis un seul nouvel essai. */
const PAUSE_MS = 3000;
const PAUSE_CAPTCHA_MS = 30_000;
const attendre = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function ImportGroupe({ fiches, sansNumero }: { fiches: { cle: string; nom: string }[]; sansNumero: number }) {
  const [etats, setEtats] = useState<Etat[]>(fiches.map((f) => ({ ...f, statut: "attente" })));
  const [enCours, setEnCours] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const arret = useRef(false);

  const maj = (i: number, etat: Partial<Etat>) => setEtats((e) => e.map((x, j) => (j === i ? { ...x, ...etat } : x)));

  /** Un appel serveur ; coupure réseau ou délai dépassé → message clair, jamais d'écran figé. */
  async function sur<T>(appel: () => Promise<T>): Promise<T | { ok: false; erreur: string }> {
    try {
      return await appel();
    } catch {
      return { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
    }
  }

  /** Si la BCE demande sa vérification anti-robot : pause de 30 s, puis un seul nouvel essai. */
  async function avecPauseAntiRobot<T extends { ok: boolean }>(i: number, appel: () => Promise<T | { ok: false; erreur: string }>) {
    let r = await appel();
    if (!r.ok && (r as { erreur?: string }).erreur === ERREUR_BCE_CAPTCHA && !arret.current) {
      maj(i, { statut: "pause", detail: "La BCE demande une vérification anti-robot : nouvel essai dans 30 s…" });
      await attendre(PAUSE_CAPTCHA_MS);
      maj(i, { statut: "encours", detail: undefined });
      r = await appel();
    }
    return r;
  }

  /** Compare les fiches données (toutes, ou seulement celles en erreur). */
  async function comparer(indices: number[]) {
    setEnCours(true);
    setConfirmer(false);
    arret.current = false;
    for (let k = 0; k < indices.length && !arret.current; k++) {
      const i = indices[k];
      maj(i, { statut: "encours", detail: undefined, choix: undefined });
      const r = await avecPauseAntiRobot(i, () => sur(() => comparerAvecBce(fiches[i].cle)));
      if (!r.ok) maj(i, { statut: "erreur", detail: (r as { erreur: string }).erreur });
      else if (!("donnees" in r) || !r.donnees) maj(i, { statut: "erreur", detail: "Réponse vide." });
      else if (aucunChangement(r.donnees.comparaison)) maj(i, { statut: "ajour", detail: undefined });
      else {
        const c = r.donnees.comparaison;
        maj(i, {
          statut: "changements",
          choix: choixParDefaut(c),
          detail: `${c.identite.length + c.nouvelles.length + c.modifiees.length + c.absentes.length} changement(s) à valider`,
        });
      }
      if (k < indices.length - 1) await attendre(PAUSE_MS);
    }
    setEnCours(false);
  }

  const enErreur = etats.flatMap((e, i) => (e.statut === "erreur" ? [i] : []));
  const aEnregistrer = etats.flatMap((e, i) => (e.statut === "changements" && e.choix ? [i] : []));

  /**
   * Enregistre d'un coup tous les changements trouvés (ce qui serait coché par défaut sur chaque fiche).
   * Le serveur relit la BCE avant d'écrire : on ne fait pas confiance aux données du navigateur.
   */
  async function enregistrerTout() {
    setConfirmer(false);
    setEnCours(true);
    arret.current = false;
    const liste = aEnregistrer.map((i) => ({ i, choix: etats[i].choix as ChoixBce }));
    for (let k = 0; k < liste.length && !arret.current; k++) {
      const { i, choix } = liste[k];
      maj(i, { statut: "encours", detail: undefined });
      const r = await avecPauseAntiRobot(i, () => sur(() => appliquerBce(fiches[i].cle, choix)));
      if (r.ok) maj(i, { statut: "enregistre", detail: undefined, choix: undefined });
      else maj(i, { statut: "erreur", detail: (r as { erreur: string }).erreur });
      if (k < liste.length - 1) await attendre(PAUSE_MS);
    }
    setEnCours(false);
  }

  return (
    <>
      {sansNumero > 0 && <Alerte ton="info">{sansNumero} fiche{sansNumero > 1 ? "s n'ont" : " n'a"} pas de n° d'entreprise et ne {sansNumero > 1 ? "sont" : "est"} pas comparée{sansNumero > 1 ? "s" : ""}.</Alerte>}
      <div className="flex flex-wrap gap-2">
        {enCours ? (
          <button type="button" onClick={() => (arret.current = true)} className={BTN}><Square size={15} aria-hidden /> Arrêter après la fiche en cours</button>
        ) : (
          <>
            <button type="button" onClick={() => comparer(fiches.map((_, i) => i))} disabled={!fiches.length} className={aEnregistrer.length ? BTN : BTN_PRINCIPAL}>
              <Play size={15} aria-hidden /> Comparer {fiches.length} fiche{fiches.length > 1 ? "s" : ""}
            </button>
            {aEnregistrer.length > 0 && !confirmer && (
              <button type="button" onClick={() => setConfirmer(true)} className={BTN_PRINCIPAL}>
                <Save size={15} aria-hidden /> Enregistrer tous les changements ({aEnregistrer.length} fiche{aEnregistrer.length > 1 ? "s" : ""})
              </button>
            )}
            {enErreur.length > 0 && (
              <button type="button" onClick={() => comparer(enErreur)} className={BTN}>
                <RotateCcw size={15} aria-hidden /> Relancer les {enErreur.length} fiche{enErreur.length > 1 ? "s" : ""} en erreur
              </button>
            )}
          </>
        )}
      </div>
      {confirmer && !enCours && (
        <div role="alertdialog" aria-labelledby="confirmer-tout" className="ecg-alerte ecg-alerte-attention">
          <TriangleAlert size={20} aria-hidden />
          <div className="ecg-alerte-corps">
            <b id="confirmer-tout">Enregistrer tous les changements trouvés sur {aEnregistrer.length} fiche{aEnregistrer.length > 1 ? "s" : ""} ?</b>
            <p>
              Dénomination, siège, unités nouvelles (rangées au site principal, suivies si elles sont dans nos provinces) et
              unités modifiées. Les unités absentes de la BCE ne sont jamais supprimées.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" autoFocus onClick={enregistrerTout} className={BTN_PRINCIPAL}><Save size={15} aria-hidden /> Oui, tout enregistrer</button>
              <button type="button" onClick={() => setConfirmer(false)} className={BTN}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <Panneau corps={false}>
        <ul className="ecg-lignes" aria-live="polite">
          {etats.map((e) => (
            <li key={e.cle} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 font-semibold">{e.nom}</span>
              {e.statut === "encours" && <span className="inline-flex items-center gap-1"><IconeChargement size={14} /> En cours…</span>}
              {e.statut === "pause" && <Statut ton="attente" icone={ShieldAlert}>{e.detail}</Statut>}
              {e.statut === "ajour" && <Statut ton="ok" icone={CircleCheck}>À jour</Statut>}
              {e.statut === "changements" && (
                <>
                  <Statut ton="attente" icone={TriangleAlert}>{e.detail}</Statut>
                  <Link className="ecg-lien" href={`/espace/entreprises/${e.cle}/bce`}>Voir le détail</Link>
                </>
              )}
              {e.statut === "enregistre" && <Statut ton="ok" icone={Save}>Changements enregistrés</Statut>}
              {e.statut === "erreur" && <Statut ton="erreur" icone={CircleAlert}>{e.detail}</Statut>}
            </li>
          ))}
        </ul>
      </Panneau>
    </>
  );
}
