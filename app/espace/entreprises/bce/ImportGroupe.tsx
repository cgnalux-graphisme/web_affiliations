"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleAlert, Play, Square, TriangleAlert } from "lucide-react";
import { aucunChangement } from "../../../../lib/bce/comparaison";
import { ERREUR_BCE_INJOIGNABLE } from "../../../../lib/bce/messages";
import { comparerAvecBce } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN, BTN_PRINCIPAL, Panneau, Statut } from "../../_partage/ui";

type Etat = { cle: string; nom: string; statut: "attente" | "encours" | "ajour" | "changements" | "erreur"; detail?: string };
const PAUSE_MS = 2000;

export default function ImportGroupe({ fiches, sansNumero }: { fiches: { cle: string; nom: string }[]; sansNumero: number }) {
  const [etats, setEtats] = useState<Etat[]>(fiches.map((f) => ({ ...f, statut: "attente" })));
  const [enCours, setEnCours] = useState(false);
  const arret = useRef(false);

  async function lancer() {
    setEnCours(true);
    arret.current = false;
    for (let i = 0; i < fiches.length && !arret.current; i++) {
      setEtats((e) => e.map((x, j) => (j === i ? { ...x, statut: "encours" } : x)));
      let r: Awaited<ReturnType<typeof comparerAvecBce>>;
      try {
        r = await comparerAvecBce(fiches[i].cle);
      } catch {
        r = { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
      }
      const suivant: Etat = !r.ok || !r.donnees
        ? { ...fiches[i], statut: "erreur", detail: r.ok ? "Réponse vide." : r.erreur }
        : aucunChangement(r.donnees.comparaison)
          ? { ...fiches[i], statut: "ajour" }
          : {
              ...fiches[i], statut: "changements",
              detail: `${r.donnees.comparaison.identite.length + r.donnees.comparaison.nouvelles.length + r.donnees.comparaison.modifiees.length + r.donnees.comparaison.absentes.length} changement(s) à valider`,
            };
      setEtats((e) => e.map((x, j) => (j === i ? suivant : x)));
      if (i < fiches.length - 1) await new Promise((res) => setTimeout(res, PAUSE_MS));
    }
    setEnCours(false);
  }

  return (
    <>
      {sansNumero > 0 && <Alerte ton="info">{sansNumero} fiche{sansNumero > 1 ? "s n'ont" : " n'a"} pas de n° d'entreprise et ne {sansNumero > 1 ? "sont" : "est"} pas comparée{sansNumero > 1 ? "s" : ""}.</Alerte>}
      <div className="flex gap-2">
        {enCours ? (
          <button type="button" onClick={() => (arret.current = true)} className={BTN}><Square size={15} aria-hidden /> Arrêter après la fiche en cours</button>
        ) : (
          <button type="button" onClick={lancer} disabled={!fiches.length} className={BTN_PRINCIPAL}><Play size={15} aria-hidden /> Comparer {fiches.length} fiche{fiches.length > 1 ? "s" : ""}</button>
        )}
      </div>
      <Panneau corps={false}>
        <ul className="ecg-lignes" aria-live="polite">
          {etats.map((e) => (
            <li key={e.cle} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 font-semibold">{e.nom}</span>
              {e.statut === "encours" && <span className="inline-flex items-center gap-1"><IconeChargement size={14} /> Lecture…</span>}
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
