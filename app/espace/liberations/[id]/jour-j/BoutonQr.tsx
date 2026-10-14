"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, RefreshCw } from "lucide-react";
import { genererQr } from "../../jour-j-actions";
import { IconeChargement } from "../../../../Chargement";
import { Confirmation } from "../../../_partage/Fenetres";
import { BTN, BTN_PRINCIPAL } from "../../../_partage/ui";

/** Créer le QR code du dossier, ou le remplacer (après confirmation : l'ancien ne fonctionnera plus). */
export default function BoutonQr({ dossierId, existe }: { dossierId: string; existe: boolean }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");

  async function creer() {
    setConfirmer(false);
    setEnCours(true);
    setErreur("");
    const r = await genererQr(dossierId).catch(() => ({ ok: false as const, erreur: "Le serveur n'a pas répondu. Réessayez." }));
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={existe ? BTN : BTN_PRINCIPAL} disabled={enCours} onClick={() => (existe ? setConfirmer(true) : creer())}>
        {enCours ? <IconeChargement size={16} /> : existe ? <RefreshCw size={16} aria-hidden /> : <QrCode size={16} aria-hidden />}
        {existe ? "Nouveau QR code" : "Créer le QR code"}
      </button>
      {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
      <Confirmation ouverte={confirmer} titre="Remplacer le QR code ?" libelleConfirmer="Remplacer" onAnnuler={() => setConfirmer(false)} onConfirmer={creer}>
        <p>L&apos;ancien QR code ne fonctionnera plus (utile s&apos;il a circulé). Les présences déjà signées restent.</p>
      </Confirmation>
    </>
  );
}
