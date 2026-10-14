"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, RotateCcw, Save } from "lucide-react";
import type { Modele } from "../../../../../lib/liberations/courriers";
import { enregistrerModele, retablirModele } from "../../courriers-actions";
import { IconeChargement } from "../../../../Chargement";
import { Confirmation } from "../../../_partage/Fenetres";
import { AIDE, BTN, BTN_PRINCIPAL, CHAMP, LIBELLE, Panneau, Statut } from "../../../_partage/ui";

type ModeleVue = Modele & { actuel: { objet: string; texte: string; modifie: boolean } };

/** Un texte par modèle : modifier, enregistrer, rétablir le texte proposé. Liste des variables à côté. */
export default function Modeles({ modeles, variables }: { modeles: ModeleVue[]; variables: { cle: string; libelle: string }[] }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <ul className="grid gap-3">
        {modeles.map((m) => <li key={m.code}><UnModele m={m} /></li>)}
      </ul>
      <Panneau titre="Variables" sousTitre="À copier telles quelles, accolades comprises.">
        <dl className="grid gap-2 text-sm">
          {variables.map((v) => (
            <div key={v.cle}>
              <dt><code className="font-semibold">{`{{${v.cle}}}`}</code></dt>
              <dd className="ecg-texte-doux">{v.libelle}</dd>
            </div>
          ))}
        </dl>
      </Panneau>
    </div>
  );
}

function UnModele({ m }: { m: ModeleVue }) {
  const router = useRouter();
  const [objet, setObjet] = useState(m.actuel.objet);
  const [texte, setTexte] = useState(m.actuel.texte);
  const [enCours, setEnCours] = useState<"enregistrer" | "retablir" | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  const modifie = texte !== m.actuel.texte || objet !== m.actuel.objet;

  async function agir(quoi: "enregistrer" | "retablir") {
    setConfirmer(false);
    setEnCours(quoi);
    setMessage(null);
    const r = await (quoi === "enregistrer" ? enregistrerModele(m.code, objet, texte) : retablirModele(m.code))
      .catch(() => ({ ok: false as const, erreur: "Le serveur n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setMessage(r.ok ? { ton: "ok", texte: r.message ?? "Enregistré." } : { ton: "erreur", texte: r.erreur });
    if (r.ok && quoi === "retablir") {
      const proposee = m;
      setTexte(proposee.texte);
      setObjet(proposee.objet ?? "");
    }
    router.refresh();
  }

  return (
    <details className="ecg-panneau p-4">
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
        <PencilLine size={16} aria-hidden />
        <b>{m.libelle}</b>
        {m.actuel.modifie && <Statut ton="info" icone={PencilLine}>Modifié</Statut>}
      </summary>
      <div className="mt-3 grid gap-3">
        <p className={AIDE}>{m.aide}</p>
        {m.email && (
          <div>
            <label htmlFor={`objet-${m.code}`} className={LIBELLE}>Objet de l&apos;e-mail</label>
            <input id={`objet-${m.code}`} className={CHAMP} value={objet} maxLength={200} onChange={(e) => setObjet(e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor={`texte-${m.code}`} className={LIBELLE}>Texte</label>
          <textarea id={`texte-${m.code}`} className={`${CHAMP} leading-relaxed`} rows={m.code === "ville" ? 1 : 10} value={texte}
            onChange={(e) => setTexte(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BTN_PRINCIPAL} disabled={enCours !== null || !modifie} onClick={() => agir("enregistrer")}>
            {enCours === "enregistrer" ? <IconeChargement size={16} /> : <Save size={16} aria-hidden />} Enregistrer
          </button>
          {m.actuel.modifie && (
            <button type="button" className={BTN} disabled={enCours !== null} onClick={() => setConfirmer(true)}>
              {enCours === "retablir" ? <IconeChargement size={16} /> : <RotateCcw size={16} aria-hidden />} Rétablir le texte proposé
            </button>
          )}
          {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}
        </div>
      </div>
      <Confirmation ouverte={confirmer} titre="Rétablir le texte proposé ?" libelleConfirmer="Rétablir"
        onAnnuler={() => setConfirmer(false)} onConfirmer={() => agir("retablir")}>
        <p>Votre texte modifié sera remplacé par le texte proposé au départ. Les courriers déjà envoyés ne changent pas.</p>
      </Confirmation>
    </details>
  );
}
