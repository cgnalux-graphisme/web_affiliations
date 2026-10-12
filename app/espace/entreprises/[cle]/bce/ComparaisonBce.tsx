"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { formaterNumeroUe } from "../../../../../lib/bce/numero";
import { aucunChangement, choixParDefaut, type ChoixBce, type ComparaisonBce as Comparaison } from "../../../../../lib/bce/comparaison";
import { isoToDateFr } from "../../../../../lib/dates";
import { ERREUR_BCE_INJOIGNABLE } from "../../../../../lib/bce/messages";
import { appliquerBce, comparerAvecBce } from "../../actions";
import { EcranChargement, IconeChargement } from "../../../../Chargement";
import { Alerte, BTN, BTN_PRINCIPAL, Panneau } from "../../../_partage/ui";

const valeur = (champ: string, v: string | null) =>
  v === null ? "vide" : champ === "date_debut" ? isoToDateFr(v) : champ === "statut" ? (v === "actif" ? "active" : "arrêtée") : v;

export default function ComparaisonBce({ cle }: { cle: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<{ c: Comparaison } | { erreur: string } | null>(null);
  const [choix, setChoix] = useState<ChoixBce>({ identite: [], nouvelles: [], modifiees: [] });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;
    comparerAvecBce(cle)
      .then((r) => {
        if (!actif) return;
        if (!r.ok || !r.donnees) setEtat({ erreur: r.ok ? ERREUR_BCE_INJOIGNABLE : r.erreur });
        else {
          setEtat({ c: r.donnees.comparaison });
          setChoix(choixParDefaut(r.donnees.comparaison));
        }
      })
      // Coupure réseau ou délai du serveur dépassé : jamais d'écran « Lecture… » sans fin.
      .catch(() => actif && setEtat({ erreur: ERREUR_BCE_INJOIGNABLE }));
    return () => { actif = false; };
  }, [cle]);

  const retour = (
    <Link href={`/espace/entreprises/${cle}`} className={BTN}><ArrowLeft size={16} aria-hidden /> Retour à la fiche</Link>
  );
  if (!etat) return <EcranChargement texte="Lecture de la BCE…" />;
  if ("erreur" in etat) return <><Alerte ton="erreur" titre="Import impossible">{etat.erreur}</Alerte>{retour}</>;
  const c = etat.c;
  if (aucunChangement(c)) return <><Alerte ton="succes">La fiche est à jour avec la BCE ({c.inchangees} unité{c.inchangees > 1 ? "s" : ""} identique{c.inchangees > 1 ? "s" : ""}).</Alerte>{retour}</>;

  const bascule = (cleChoix: keyof ChoixBce, v: string) =>
    setChoix((x) => ({ ...x, [cleChoix]: x[cleChoix].includes(v) ? x[cleChoix].filter((y) => y !== v) : [...x[cleChoix], v] }));

  async function enregistrer() {
    setEnCours(true);
    setErreur("");
    let r: Awaited<ReturnType<typeof appliquerBce>>;
    try {
      r = await appliquerBce(cle, choix);
    } catch {
      r = { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
    }
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    router.push(`/espace/entreprises/${r.donnees?.cle ?? cle}`);
    router.refresh();
  }

  return (
    <>
      {c.identite.length > 0 && (
        <Panneau titre="Identité et siège">
          <ul className="grid gap-2">
            {c.identite.map((x) => (
              <li key={x.champ}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={choix.identite.includes(x.champ)} onChange={() => bascule("identite", x.champ)} />
                  <span><b>{x.libelle}</b> : {valeur(x.champ, x.avant)} → <b>{valeur(x.champ, x.apres)}</b></span>
                </label>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {c.nouvelles.length > 0 && (
        <Panneau titre={`Nouvelles unités (${c.nouvelles.length})`} sousTitre="Ajoutées au site principal ; vous pourrez les rattacher à un autre site.">
          <ul className="grid gap-2">
            {c.nouvelles.map((u) => (
              <li key={u.numero_ue}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={choix.nouvelles.includes(u.numero_ue)} onChange={() => bascule("nouvelles", u.numero_ue)} />
                  <span>
                    <b>{formaterNumeroUe(u.numero_ue)}</b> · {[u.rue, u.numero, u.boite && `bte ${u.boite}`, u.code_postal, u.localite].filter(Boolean).join(" ")}
                    {u.statut === "arrete" && " · arrêtée"}{u.date_debut && ` · depuis le ${isoToDateFr(u.date_debut)}`}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {c.modifiees.length > 0 && (
        <Panneau titre={`Unités modifiées (${c.modifiees.length})`}>
          <ul className="grid gap-3">
            {c.modifiees.map((m) => (
              <li key={m.numero_ue}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={choix.modifiees.includes(m.numero_ue)} onChange={() => bascule("modifiees", m.numero_ue)} />
                  <span>
                    <b>{formaterNumeroUe(m.numero_ue)}</b>
                    <ul className="text-sm">{m.changements.map((x) => <li key={x.champ}>{x.libelle} : {valeur(x.champ, x.avant)} → <b>{valeur(x.champ, x.apres)}</b></li>)}</ul>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {c.absentes.length > 0 && (
        <Alerte ton="attention" titre="Unités absentes de la BCE">
          {c.absentes.map((a) => `${formaterNumeroUe(a.numero_ue)} (${a.adresse})`).join(" ; ")}. Elles restent sur la fiche :
          marquez-les « arrêtées » si elles n'existent plus.
        </Alerte>
      )}
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={enregistrer} disabled={enCours} className={BTN_PRINCIPAL}>
          {enCours ? <IconeChargement size={15} /> : <Save size={15} aria-hidden />} Enregistrer la sélection
        </button>
        {retour}
      </div>
    </>
  );
}
