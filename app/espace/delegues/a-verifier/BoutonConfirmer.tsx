"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { confirmerDelegue, confirmerMandat } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { BTN, BTN_PETIT } from "../../_partage/ui";

export default function BoutonConfirmer({ type, id }: { type: "delegue" | "mandat"; id: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  async function confirmer() {
    setEnCours(true);
    const r = await (type === "delegue" ? confirmerDelegue(id) : confirmerMandat(id));
    setEnCours(false);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }
  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={confirmer} disabled={enCours} className={`${BTN} ${BTN_PETIT}`}>
        {enCours ? <IconeChargement size={14} /> : <Check size={14} aria-hidden />} C'est correct
      </button>
      {erreur && <span role="alert" className="ecg-erreur">{erreur}</span>}
    </span>
  );
}
