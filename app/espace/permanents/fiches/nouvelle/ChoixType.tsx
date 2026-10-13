"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Factory, Network } from "lucide-react";
import { TYPES_FICHE, type TypeFiche } from "../../../../../lib/fiches-suivi/types";
import { creerFiche } from "../../actions";
import { IconeChargement } from "../../../../Chargement";
import { Alerte } from "../../../_partage/ui";

const ICONES = { usine: Factory, sectoriel: Network };

/** Deux grandes cartes : événement en usine ou sectoriel. Un clic crée le brouillon et ouvre la fiche. */
export default function ChoixType({ entrepriseId }: { entrepriseId?: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<TypeFiche | null>(null);
  const [erreur, setErreur] = useState("");

  async function choisir(type: TypeFiche) {
    if (enCours) return;
    setEnCours(type);
    setErreur("");
    const r = await creerFiche(type, entrepriseId).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    if (!r.ok) {
      setEnCours(null);
      return setErreur(r.erreur);
    }
    router.push(`/espace/permanents/fiches/${r.donnees!.id}/modifier`);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {TYPES_FICHE.map((t) => {
          const Icone = ICONES[t.code];
          return (
            <button key={t.code} type="button" onClick={() => choisir(t.code)} disabled={enCours !== null}
              className="ecg-panneau group grid gap-3 p-6 text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[var(--ecg-focus)] disabled:opacity-70">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--app-pale)] text-[var(--app-fonce)]" aria-hidden>
                {enCours === t.code ? <IconeChargement size={26} /> : <Icone size={28} strokeWidth={1.8} />}
              </span>
              <span className="font-condensed text-2xl font-bold leading-tight">{t.libelle}</span>
              <span className="ecg-texte-doux">{t.description}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--app-fonce)]">
                {enCours === t.code ? "Création…" : "Commencer"} <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          );
        })}
      </div>
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
    </div>
  );
}
